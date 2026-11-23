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
import { MH_PLACES } from "../../data/maharashtra";
import { CITY_BY_ID, tierForFollowers } from "../../data/taxonomy";
import { buildAudience } from "../../data/generator/generate";
import { Rng } from "../../data/generator/random";
import type { Creator, LanguageCode, Platform } from "../../types";
import { detectMaharashtra, type LocationConfidence, type LocationVerdict } from "./location";
import { computeMetrics, median, recentVideos, type ChannelMetrics } from "./metrics";
import { buildContentProfile, topicsFrom, type ContentProfile } from "./content";
import { estimateAuthenticity } from "./estimate";
import { rateCardFor } from "../pricing";
import { classifyNiches } from "./niche";
import { safeSlice } from "../text";
import { YOUTUBE_PROVENANCE, type ProvenanceMap, type SourceRecord } from "./provenance";
import {
  getChannels,
  getRecentVideoIds,
  getVideos,
  QUOTA_COST,
  QuotaMeter,
  QuotaExceededError,
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

/** A channel silent longer than this is not sellable inventory, whatever its back catalogue did. */
export const DORMANT_AFTER_DAYS = 365;

/** Below this, a median is noise rather than a forecast — two videos have no middle worth trusting. */
export const MIN_SAMPLE_FOR_PRICING = 3;

/**
 * Smallest channel worth collecting. Below roughly ten thousand subscribers a channel is hard to
 * price and harder to verify: the engagement benchmarks swing wildly, one quiet month looks like
 * a collapse, and the reach a brand gets is small enough that the briefing cost outweighs it.
 * Applied both when ingesting and when serving, so the catalogue matches the claim.
 */
export const MIN_FOLLOWERS = 10_000;

/**
 * Discovery seeds. A bare language query is useless here: searching YouTube for "Marathi" returns
 * broadcasters and news desks (Zee Marathi, TV9 Marathi, Maharashtra Times), not the creators a
 * brand shortlists. Pairing a niche with a place or with Marathi words surfaces individuals.
 */
export const SEED_TERMS = {
  // Drawn from the gazetteer rather than a hand-picked few, so the query pool scales with the
  // places we know about. A hardcoded 20 capped the pool at ~510 queries, which a daily run of 80
  // cycles through in under a week — after which it re-searches the same ground for diminishing
  // returns. All 55 places give a pool big enough for a fortnight of genuinely new searches.
  places: [...MH_PLACES.map((place) => place.name), "Maharashtra"],
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
    "daily vlog",
    "street food",
    "home decor",
    "parenting",
    "devotional",
    "cricket",
    "gaming",
    "skincare",
    "wedding",
    "real estate",
    "car review",
    "small business",
  ],
  marathi: [
    "मराठी रेसिपी",
    "मराठी व्लॉग",
    "मराठी कॉमेडी",
    "मराठी शेती",
    "मराठी फॅशन",
    "मराठी प्रवास",
    "मराठी गाणी",
    "मराठी बातम्या",
    "मराठी शिक्षण",
    "मराठी आरोग्य",
  ],
};

/**
 * Every place-and-niche pairing plus the Marathi terms: far more queries than one day's quota can
 * run. Deliberately so — `offset` rotates which slice a run takes, so consecutive runs explore new
 * ground instead of rediscovering the same channels. Without that, a daily job finds the same few
 * hundred creators forever.
 */
export function allSeedQueries(): string[] {
  const queries: string[] = [];
  for (const niche of SEED_TERMS.niches) {
    for (const place of SEED_TERMS.places) queries.push(`${place} ${niche}`);
  }
  queries.push(...SEED_TERMS.marathi);
  for (const place of SEED_TERMS.places) queries.push(`${place} मराठी`);
  return queries;
}

/** The slice of the query list this run should use, wrapping around at the end. */
export function buildSeedQueries(limit = 40, offset = 0): string[] {
  const all = allSeedQueries();
  if (limit >= all.length) return all;
  const start = ((offset % all.length) + all.length) % all.length;
  const slice = all.slice(start, start + limit);
  // Wrap rather than return a short list at the end of the cycle.
  return slice.length < limit ? [...slice, ...all.slice(0, limit - slice.length)] : slice;
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
  /** Rotates which seed queries this run uses; pass the run number or day. */
  seedOffset?: number;
  /** Stop after this many accepted creators. */
  maxCreators?: number;
  /** How many searches to run. Each costs 100 quota units. */
  maxQueries?: number;
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
    bio: safeSlice(channel.description.split("\n")[0] ?? "", 0, 280),
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
    rates: { reel: 0, story: 0, post: 0, video: null },
    collaborations: [],
    responseRate: 0.5,
    avgTurnaroundDays: 7,
    verified: false,
    gstRegistered: false,
    joinedMonthsAgo: monthsOld,
    avatarHue: seedFrom(channel.id) % 360,
    avatarUrl: channel.avatarUrl,
  };

  // Rates are priced off the finished creator, so they are assigned once it exists.
  creator.rates = rateCardFor(creator);

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
    seedOffset = 0,
    queries = buildSeedQueries(options.maxQueries ?? 40, seedOffset),
    maxCreators = 200,
    minSubscribers = MIN_FOLLOWERS,
    minConfidence = "likely",
    recentDays = 180,
    quota = new QuotaMeter(),
    now = Date.now(),
  } = options;

  const rejections: Record<string, number> = {};
  /** Groups one channel's failure under a stable heading, so the report stays readable. */
  const reasonFor = (error: unknown): string => {
    const message = error instanceof Error ? error.message : String(error);
    if (/\b404\b/.test(message)) return "channel or uploads playlist gone (404)";
    if (/\b403\b/.test(message)) return "channel not accessible (403)";
    return `fetch failed: ${message.slice(0, 60)}`;
  };
  const reject = (reason: string) => {
    rejections[reason] = (rejections[reason] ?? 0) + 1;
  };

  // 1. Discovery. Each search costs 100 units, so stop as soon as the budget cannot take another.
  // Our meter is an estimate of what Google is counting, so it can disagree with the real quota.
  // When Google says stop, keep everything found so far rather than losing the run.
  const channelIds = new Set<string>();
  let queriesRun = 0;
  let quotaExhausted = false;
  for (const query of queries) {
    if (!quota.canAfford(QUOTA_COST.search)) break;
    quota.charge(QUOTA_COST.search);
    queriesRun++;
    try {
      for (const id of await searchChannels(query, { relevanceLanguage: "mr", regionCode: "IN" })) {
        channelIds.add(id);
      }
    } catch (error) {
      // Quota ends the run; nothing else can be fetched after it. One query YouTube refuses costs
      // only that query's results.
      if (error instanceof QuotaExceededError) {
        quotaExhausted = true;
        break;
      }
      reject(`search failed: ${reasonFor(error)}`);
    }
  }

  // 2. Enrichment, batched 50 at a time.
  // Batched fifty at a time by getChannels; fetch batch by batch here so one refused batch costs
  // fifty candidates rather than every candidate found.
  const allIds = [...channelIds];
  const channels: YouTubeChannel[] = [];
  for (let i = 0; i < allIds.length; i += 50) {
    const batch = allIds.slice(i, i + 50);
    quota.charge(QUOTA_COST.channels);
    try {
      channels.push(...(await getChannels(batch)));
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        quotaExhausted = true;
        break;
      }
      reject(`channel lookup failed for ${batch.length}: ${reasonFor(error)}`);
    }
  }

  const creators: SourcedCreator[] = [];
  for (const channel of channels) {
    if (creators.length >= maxCreators) break;

    // Two different problems: a hidden count cannot be scored at any threshold, while a small
    // channel is a policy choice. Counting them together hides which one the filter is really doing.
    if (channel.hiddenSubscriberCount) {
      reject("subscriber count hidden");
      continue;
    }
    if (channel.subscriberCount < minSubscribers) {
      reject(`under ${minSubscribers} subscribers`);
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
    let videos;
    try {
      quota.charge(QUOTA_COST.playlistItems);
      const videoIds = await getRecentVideoIds(channel.uploadsPlaylistId, 25);
      quota.charge(QUOTA_COST.videos);
      videos = await getVideos(videoIds);
    } catch (error) {
      // Quota is the one error that ends a run: nothing further can be fetched. Anything else is
      // about this one channel, so skip it and carry on. A creator who deletes or privatises their
      // channel between discovery and enrichment 404s here, and rethrowing meant one dead channel
      // destroyed an entire run of several hundred — which is exactly what happened on 20 Nov.
      if (error instanceof QuotaExceededError) {
        quotaExhausted = true;
        break;
      }
      reject(reasonFor(error));
      continue;
    }

    // No fallback to the full history. That fallback existed to rescue thin channels and instead
    // priced dead ones on their past: a channel with two videos, both from 2021, was valued on a
    // five-year-old viral hit at ₹83 lakh a reel. A channel that has stopped posting is not
    // inventory a brand can buy, however well it once did.
    const lastUpload = Math.max(...videos.map((v) => Date.parse(v.publishedAt)).filter(Number.isFinite), 0);
    const dormantDays = Math.round((now - lastUpload) / 86_400_000);
    if (!Number.isFinite(lastUpload) || lastUpload === 0 || dormantDays > DORMANT_AFTER_DAYS) {
      reject(`dormant: nothing posted in ${Math.min(dormantDays, 9999)} days`);
      continue;
    }

    const window = recentVideos(videos, recentDays, now);
    const metrics = computeMetrics(window, now);
    if (metrics.sampleSize < MIN_SAMPLE_FOR_PRICING) {
      reject(`only ${metrics.sampleSize} video(s) in the last ${recentDays} days`);
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
    quotaExhausted: quotaExhausted || quota.remaining < QUOTA_COST.search,
  };
}
