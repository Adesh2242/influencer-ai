// Minimal YouTube Data API v3 client for creator ingestion.
//
// Auth: the API key is injected as an X-Goog-Api-Key header by the session's HTTPS proxy, so no key
// appears in this code or in a URL. Set YOUTUBE_API_KEY to send one explicitly when running outside
// that proxy. Never put the key in the query string: it would end up in logs and error messages.
//
// Quota matters more than latency here. The free daily allowance is 10,000 units: search.list costs
// 100 units per call, while channels.list, videos.list and playlistItems.list cost 1 unit for up to
// 50 ids. So discovery is rationed and enrichment is effectively free.
const API = "https://youtube.googleapis.com/youtube/v3";

export const QUOTA_COST = { search: 100, channels: 1, videos: 1, playlistItems: 1, commentThreads: 1 } as const;

export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  country?: string;
  publishedAt: string;
  subscriberCount: number;
  /** True when the channel hides its subscriber count; subscriberCount is then 0 and unusable. */
  hiddenSubscriberCount: boolean;
  videoCount: number;
  viewCount: number;
  keywords?: string;
  uploadsPlaylistId?: string;
  /** Wikipedia topic URLs from topicDetails, e.g. ".../wiki/Food". Coarse but free. */
  topicCategories: string[];
  defaultLanguage?: string;
  /** Channel avatar, largest available. Comes free with part=snippet. */
  avatarUrl?: string;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description?: string;
  publishedAt: string;
  viewCount: number;
  /** Null when the channel hides likes. */
  likeCount: number | null;
  commentCount: number | null;
  /** Creator-set video tags. Public, but only about 41% of videos carry any. */
  tags?: string[];
  /** YouTube's own paid-promotion disclosure. Rarely set, so absence proves nothing. */
  hasPaidProductPlacement?: boolean;
}

export class QuotaExceededError extends Error {
  constructor() {
    super("YouTube API daily quota exceeded");
    this.name = "QuotaExceededError";
  }
}

export class MissingKeyError extends Error {
  constructor() {
    super(
      "YouTube rejected the request for lack of an API key. Add a YouTube Data API key as a network " +
        "secret on this environment for youtube.googleapis.com, or set YOUTUBE_API_KEY.",
    );
    this.name = "MissingKeyError";
  }
}

/** Tracks what the run has spent, so a caller can stop before the daily allowance runs out. */
export class QuotaMeter {
  private used = 0;
  constructor(private readonly limit = 10_000) {}
  get spent(): number {
    return this.used;
  }
  get remaining(): number {
    return Math.max(0, this.limit - this.used);
  }
  canAfford(cost: number): boolean {
    return this.used + cost <= this.limit;
  }
  charge(cost: number): void {
    this.used += cost;
  }
}

/** YouTube returns default/medium/high; take the biggest so the UI can scale down. */
function pickAvatar(thumbnails?: Record<string, { url?: string; width?: number }>): string | undefined {
  if (!thumbnails) return undefined;
  const best = Object.values(thumbnails)
    .filter((t): t is { url: string; width?: number } => Boolean(t?.url))
    .sort((a, b) => (b.width ?? 0) - (a.width ?? 0))[0];
  return best?.url;
}

function toInt(value: unknown): number {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function call<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${API}/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const headers: Record<string, string> = { Accept: "application/json" };
  const key = process.env.YOUTUBE_API_KEY;
  if (key) headers["X-Goog-Api-Key"] = key;

  const response = await fetch(url, { headers });
  if (response.ok) return (await response.json()) as T;

  const body = await response.text();
  throw describeFailure(path, response.status, body);
}

/**
 * Google reports a missing key several different ways depending on where the request is stopped:
 * "unregistered callers" from the API itself, but ACCESS_DENIED / "Permission denied on the
 * service" when an egress proxy holds no credential for the host. Both mean the same thing to a
 * caller, so classify on the parsed error rather than on the shape of one message.
 */
function describeFailure(path: string, status: number, body: string): Error {
  let message = "";
  let reason = "";
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string; status?: string; errors?: { reason?: string }[]; details?: { reason?: string }[] };
    };
    message = parsed.error?.message ?? "";
    reason = [
      parsed.error?.status ?? "",
      ...(parsed.error?.errors ?? []).map((e) => e.reason ?? ""),
      ...(parsed.error?.details ?? []).map((d) => d.reason ?? ""),
    ].join(" ");
  } catch {
    message = body.slice(0, 300);
  }

  const haystack = `${message} ${reason}`;
  if (/quota/i.test(haystack)) return new QuotaExceededError();
  if (
    status === 401 ||
    (status === 403 &&
      /unregistered callers|api key|keyInvalid|ACCESS_DENIED|PERMISSION_DENIED|permission denied|forbidden/i.test(haystack))
  ) {
    return new MissingKeyError();
  }
  return new Error(`YouTube ${path} failed: ${status} ${message || body.slice(0, 300)}`);
}

interface ListResponse<T> {
  items?: T[];
  nextPageToken?: string;
}

/**
 * Finds candidate channels for a query. Costs 100 quota units per call, so callers should seed it
 * with a small, deliberate set of queries rather than sweeping the catalogue.
 */
export async function searchChannels(
  query: string,
  opts: { max?: number; relevanceLanguage?: string; regionCode?: string } = {},
): Promise<string[]> {
  const data = await call<ListResponse<{ id?: { channelId?: string } }>>("search", {
    part: "snippet",
    type: "channel",
    q: query,
    maxResults: String(Math.min(opts.max ?? 25, 50)),
    regionCode: opts.regionCode ?? "IN",
    ...(opts.relevanceLanguage ? { relevanceLanguage: opts.relevanceLanguage } : {}),
  });
  return (data.items ?? []).map((item) => item.id?.channelId).filter((id): id is string => Boolean(id));
}

/**
 * Channel ids of people who commented on a video. One unit for up to 100 of them, against 100
 * units for the ~22 ids a search returns, which is the difference between finding 67 creators a
 * day and finding thousands.
 *
 * The signal is good as well as cheap: someone who comments on a Marathi channel is almost
 * certainly in Maharashtra or the Marathi diaspora, and a useful fraction of them run channels of
 * their own. It is a far better prior than a keyword search, which returns whoever matched the
 * words anywhere in India.
 *
 * Comments are disabled on plenty of videos, which answers 403. That is ordinary, not an error
 * worth stopping for, so it comes back as an empty list.
 */
export async function getCommentAuthors(videoId: string, max = 100): Promise<string[]> {
  try {
    const data = await call<ListResponse<{ snippet?: { topLevelComment?: { snippet?: { authorChannelId?: { value?: string } } } } }>>(
      "commentThreads",
      {
        part: "snippet",
        videoId,
        maxResults: String(Math.min(max, 100)),
        order: "relevance",
        textFormat: "plainText",
      },
    );
    const ids = new Set<string>();
    for (const item of data.items ?? []) {
      const id = item.snippet?.topLevelComment?.snippet?.authorChannelId?.value;
      if (id) ids.add(id);
    }
    return [...ids];
  } catch (error) {
    if (error instanceof QuotaExceededError) throw error;
    // Comments off, video private, or the thread is gone. Nothing to mine, nothing to report.
    return [];
  }
}

interface RawChannel {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    customUrl?: string;
    country?: string;
    publishedAt?: string;
    defaultLanguage?: string;
    thumbnails?: Record<string, { url?: string; width?: number; height?: number }>;
  };
  statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean; videoCount?: string; viewCount?: string };
  brandingSettings?: { channel?: { keywords?: string } };
  contentDetails?: { relatedPlaylists?: { uploads?: string } };
  topicDetails?: { topicCategories?: string[] };
}

/** Fetches full channel records. One unit per call for up to 50 ids, so batch generously. */
export async function getChannels(ids: string[]): Promise<YouTubeChannel[]> {
  const out: YouTubeChannel[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const data = await call<ListResponse<RawChannel>>("channels", {
      part: "snippet,statistics,brandingSettings,contentDetails,topicDetails",
      id: ids.slice(i, i + 50).join(","),
      maxResults: "50",
    });
    for (const raw of data.items ?? []) {
      out.push({
        id: raw.id,
        title: raw.snippet?.title ?? "",
        description: raw.snippet?.description ?? "",
        customUrl: raw.snippet?.customUrl,
        country: raw.snippet?.country,
        publishedAt: raw.snippet?.publishedAt ?? "",
        subscriberCount: toInt(raw.statistics?.subscriberCount),
        hiddenSubscriberCount: Boolean(raw.statistics?.hiddenSubscriberCount),
        videoCount: toInt(raw.statistics?.videoCount),
        viewCount: toInt(raw.statistics?.viewCount),
        keywords: raw.brandingSettings?.channel?.keywords,
        uploadsPlaylistId: raw.contentDetails?.relatedPlaylists?.uploads,
        topicCategories: raw.topicDetails?.topicCategories ?? [],
        defaultLanguage: raw.snippet?.defaultLanguage,
        avatarUrl: pickAvatar(raw.snippet?.thumbnails),
      });
    }
  }
  return out;
}

/** Most recent video ids from a channel's uploads playlist. */
export async function getRecentVideoIds(uploadsPlaylistId: string, max = 25): Promise<string[]> {
  const data = await call<ListResponse<{ contentDetails?: { videoId?: string } }>>("playlistItems", {
    part: "contentDetails",
    playlistId: uploadsPlaylistId,
    maxResults: String(Math.min(max, 50)),
  });
  return (data.items ?? []).map((i) => i.contentDetails?.videoId).filter((id): id is string => Boolean(id));
}

interface RawVideo {
  id: string;
  snippet?: { title?: string; description?: string; publishedAt?: string; tags?: string[] };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
  paidProductPlacementDetails?: { hasPaidProductPlacement?: boolean };
}

/** Stats for up to 50 videos per call. likeCount is absent when a channel hides likes. */
export async function getVideos(ids: string[]): Promise<YouTubeVideo[]> {
  if (ids.length === 0) return [];
  const out: YouTubeVideo[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const data = await call<ListResponse<RawVideo>>("videos", {
      part: "snippet,statistics,paidProductPlacementDetails",
      id: ids.slice(i, i + 50).join(","),
      maxResults: "50",
    });
    for (const raw of data.items ?? []) {
      out.push({
        id: raw.id,
        title: raw.snippet?.title ?? "",
        description: raw.snippet?.description ?? "",
        publishedAt: raw.snippet?.publishedAt ?? "",
        viewCount: toInt(raw.statistics?.viewCount),
        likeCount: raw.statistics?.likeCount === undefined ? null : toInt(raw.statistics.likeCount),
        commentCount: raw.statistics?.commentCount === undefined ? null : toInt(raw.statistics.commentCount),
        tags: raw.snippet?.tags,
        hasPaidProductPlacement: raw.paidProductPlacementDetails?.hasPaidProductPlacement,
      });
    }
  }
  return out;
}
