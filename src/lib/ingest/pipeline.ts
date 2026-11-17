// Ingests real Maharashtra creators from YouTube into the app's Creator model.
//
// Shape of the run: a rationed set of search queries finds candidate channels (100 quota units
// each), then cheap batch lookups enrich them (1 unit per 50 ids). Channels that fail the
// Maharashtra test are dropped before any enrichment is spent on them.
//
// The source is pluggable on purpose. Instagram is the platform that matters most for Indian
// influencer marketing, but Meta's Business Discovery API needs app review and only answers for a
// handle you already know, so it can only be added once that review is done. Everything below the
// CandidateSource boundary is platform-agnostic.
import { CITY_BY_ID, tierForFollowers } from "../../data/taxonomy";
import { buildAudience } from "../../data/generator/generate";
import { Rng } from "../../data/generator/random";
import type { Creator, LanguageCode, Platform } from "../../types";
import { detectMaharashtra, type LocationConfidence, type LocationVerdict } from "./location";
import { computeMetrics, median, recentVideos, type ChannelMetrics } from "./metrics";
import { buildContentProfile, topicsFrom, type ContentProfile } from "./content";
import { estimateAuthenticity, estimateRates } from "./estimate";
import { classifyNiches } from "./niche";
import { YOUTUBE_PROVENANCE, type ProvenanceMap, type SourceRecord } from "./provenance";
import {
  getChannels,
  getRecentVideoIds,
  getVideos,
  QUOTA_COST,
  QuotaMeter,
  searchChannels,
  type YouTubeChannel,
} from "./youtube";

export interface SourcedCreator {
  creator: Creator;
  source: SourceRecord;
  provenance: ProvenanceMap;
  location: LocationVerdict;
  metrics: ChannelMetrics;
  /** Hashtags, video tags and disclosed paid placements from the sampled videos. */
  content: ContentProfile;
}

const CONFIDENCE_RANK: Record<LocationConfidence, number> = { none: 0, weak: 1, likely: 2, strong: 3 };

/**
 * Discovery seeds. A bare language query is useless here: searching YouTube for "Marathi" returns
 * broadcasters and news desks (Zee Marathi, TV9 Marathi, Maharashtra Times), not the creators a
 * brand shortlists. Pairing a niche with a place or with Marathi words surfaces individuals.
 */
export const SEED_TERMS = {
  places: ["Pune", "Mumbai", "Nagpur", "Nashik", "Kolhapur", "Thane", "Aurangabad", "Solapur", "Maharashtra"],
  niches: [
    "food vlog",
    "recipe",
    "beauty makeup",
    "fashion styling",
    "fitness",
    "tech review",
    "travel vlog",
    "comedy",
    "farming",
    "finance investing",
    "MPSC study",
    "motovlog",
  ],
  marathi: ["मराठी रेसिपी", "मराठी व्लॉग", "मराठी कॉमेडी", "मराठी शेती", "मराठी फॅशन"],
};

/** Builds the query list, cheapest-yield first, capped so a run stays inside its quota. */
export function buildSeedQueries(limit = 40): string[] {
  const queries: string[] = [];
  for (const niche of SEED_TERMS.niches) {
    for (const place of SEED_TERMS.places.slice(0, 4)) queries.push(`${place} ${niche}`);
  }
  queries.push(...SEED_TERMS.marathi);
  return queries.slice(0, limit);
}

function languagesFor(verdict: LocationVerdict, channel: YouTubeChannel): LanguageCode[] {
  if (verdict.marathiContent) return ["mr", "hi"];
  const declared = channel.defaultLanguage?.slice(0, 2).toLowerCase();
  if (declared === "mr") return ["mr", "hi"];
  if (declared === "hi") return ["hi"];
  if (/[ऀ-ॿ]/.test(`${channel.title}${channel.description}`)) return ["hi"];
  return ["en"];
}

/** Stable numeric seed from a channel id, so estimated fields never change between runs. */
function seedFrom(id: string): number {
  let hash = 2_166_136_261;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16_777_619);
  }
  return Math.abs(hash);
}

export interface IngestOptions {
  queries?: string[];
  /** Stop after this many accepted creators. */
  maxCreators?: number;
  /** Channels smaller than this are skipped: too little signal to score. */
  minSubscribers?: number;
  /** How sure we must be that the creator is in Maharashtra. */
  minConfidence?: LocationConfidence;
  /** Only count videos from the last N days when measuring reach. */
  recentDays?: number;
  quota?: QuotaMeter;
  now?: number;
}

export interface IngestReport {
  creators: SourcedCreator[];
  queriesRun: number;
  channelsInspected: number;
  /** Why candidates were dropped, so a thin run can be diagnosed rather than guessed at. */
  rejections: Record<string, number>;
  quotaSpent: number;
  quotaExhausted: boolean;
}

/**
 * Converts one enriched channel into a Creator. Real figures come from `metrics` and the channel's
 * statistics; everything the platform cannot know is estimated and recorded as such in the
 * provenance map that travels with the record.
 */
export function toCreator(
  channel: YouTubeChannel,
  metrics: ChannelMetrics,
  verdict: LocationVerdict,
  commentToLikeRatio: number | null,
  content: ContentProfile = { hashtags: [], tags: [], sponsoredRatio: 0, sponsoredCount: 0, sampleSize: 0 },
): SourcedCreator {
  const rng = new Rng(seedFrom(channel.id));
  const handle = (channel.customUrl ?? channel.id).replace(/^@/, "");
  const languages = languagesFor(verdict, channel);
  const niches = classifyNiches({
    text: `${channel.title} ${channel.description} ${channel.keywords ?? ""}`,
    topicCategories: channel.topicCategories,
  });
  const tier = tierForFollowers(channel.subscriberCount);
  const home = CITY_BY_ID[verdict.cityId ?? "mumbai"] ?? CITY_BY_ID.mumbai;
  const authenticity = estimateAuthenticity(metrics, channel.subscriberCount, commentToLikeRatio);
  const platform: Platform = "youtube";

  const monthsOld = channel.publishedAt
    ? Math.max(1, Math.round((Date.now() - Date.parse(channel.publishedAt)) / (30 * 24 * 60 * 60 * 1000)))
    : 12;

  const creator: Creator = {
    id: `yt-${channel.id}`,
    name: channel.title,
    handle,
    bio: channel.description.split("\n")[0]?.slice(0, 280) ?? "",
    homeCityId: home.id,
    languages,
    niches: niches.length > 0 ? niches : ["lifestyle"],
    // Real hashtags and video tags, falling back to the niche labels when a channel uses neither.
    topics: topicsFrom(content, niches),
    platforms: [
      {
        platform,
        handle,
        followers: channel.subscriberCount,
        avgViews: metrics.avgViews,
        engagementRate: metrics.engagementRate,
        postsPerMonth: metrics.postsPerMonth,
      },
    ],
    tier,
    // Estimated: YouTube Analytics keeps real audience demographics private to the channel owner.
    // Reuses the demo generator's documented prior so there is one model, not two.
    audience: buildAudience(rng, {
      niches: niches.length > 0 ? niches : ["lifestyle"],
      languages,
      home,
      gender: rng.chance(0.5) ? "female" : "male",
      primaryPlatform: platform,
    }),
    authenticity,
    brandSafety: { score: 80, flags: [] },
    rates: estimateRates(metrics, tier, true),
    collaborations: [],
    responseRate: 0.5,
    avgTurnaroundDays: 7,
    verified: false,
    gstRegistered: false,
    joinedMonthsAgo: monthsOld,
    avatarHue: seedFrom(channel.id) % 360,
  };

  return {
    creator,
    source: {
      platform: "youtube",
      externalId: channel.id,
      url: `https://www.youtube.com/channel/${channel.id}`,
      fetchedAt: new Date().toISOString(),
    },
    provenance: YOUTUBE_PROVENANCE,
    location: verdict,
    metrics,
    content,
  };
}

export async function ingestMaharashtra(options: IngestOptions = {}): Promise<IngestReport> {
  const {
    queries = buildSeedQueries(),
    maxCreators = 200,
    minSubscribers = 1_000,
    minConfidence = "likely",
    recentDays = 180,
    quota = new QuotaMeter(),
    now = Date.now(),
  } = options;

  const rejections: Record<string, number> = {};
  const reject = (reason: string) => {
    rejections[reason] = (rejections[reason] ?? 0) + 1;
  };

  // 1. Discovery. Each search costs 100 units, so stop as soon as the budget cannot take another.
  const channelIds = new Set<string>();
  let queriesRun = 0;
  for (const query of queries) {
    if (!quota.canAfford(QUOTA_COST.search)) break;
    quota.charge(QUOTA_COST.search);
    queriesRun++;
    for (const id of await searchChannels(query, { relevanceLanguage: "mr", regionCode: "IN" })) {
      channelIds.add(id);
    }
  }

  // 2. Enrichment, batched 50 at a time.
  quota.charge(Math.ceil(channelIds.size / 50) * QUOTA_COST.channels);
  const channels = await getChannels([...channelIds]);

  const creators: SourcedCreator[] = [];
  for (const channel of channels) {
    if (creators.length >= maxCreators) break;

    if (channel.hiddenSubscriberCount || channel.subscriberCount < minSubscribers) {
      reject("too small or subscriber count hidden");
      continue;
    }

    const verdict = detectMaharashtra({
      title: channel.title,
      description: channel.description,
      keywords: channel.keywords,
      country: channel.country,
    });
    if (CONFIDENCE_RANK[verdict.confidence] < CONFIDENCE_RANK[minConfidence]) {
      reject("not placed in Maharashtra");
      continue;
    }
    if (!channel.uploadsPlaylistId) {
      reject("no uploads playlist");
      continue;
    }

    // 3. Reach and engagement from the channel's own recent videos.
    if (!quota.canAfford(QUOTA_COST.playlistItems + QUOTA_COST.videos)) break;
    quota.charge(QUOTA_COST.playlistItems);
    const videoIds = await getRecentVideoIds(channel.uploadsPlaylistId, 25);
    quota.charge(QUOTA_COST.videos);
    const videos = await getVideos(videoIds);

    const window = recentVideos(videos, recentDays, now);
    const metrics = computeMetrics(window.length >= 3 ? window : videos, now);
    if (metrics.sampleSize === 0) {
      reject("no usable recent videos");
      continue;
    }

    const ratios = videos
      .filter((v) => (v.likeCount ?? 0) > 0)
      .map((v) => (v.commentCount ?? 0) / (v.likeCount as number));
    creators.push(
      toCreator(channel, metrics, verdict, ratios.length > 0 ? median(ratios) : null, buildContentProfile(videos)),
    );
  }

  return {
    creators,
    queriesRun,
    channelsInspected: channels.length,
    rejections,
    quotaSpent: quota.spent,
    quotaExhausted: quota.remaining < QUOTA_COST.search,
  };
}
