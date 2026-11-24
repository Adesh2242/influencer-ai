// Pulls the content signals a brand actually searches on — hashtags, video tags and whether a
// creator takes paid placements — out of a channel's recent videos.
//
// Measured coverage across 360 videos from 18 Maharashtra creators: 55% of videos carry hashtags,
// 41% carry tags. Both are worth having. The paid-placement flag is a different story: only 0.6%
// of those videos set it, so it is recorded as a floor, never as a collaboration history.
import type { YouTubeVideo } from "./youtube";

/** Latin, Devanagari and digits; YouTube hashtags allow no spaces or punctuation. */
const HASHTAG = /#([A-Za-z0-9_ऀ-ॿ]{2,30})/g;

/** Hashtags that say nothing about a creator's subject. Every second Indian Short carries these. */
const STOPTAGS = new Set([
  "shorts",
  "short",
  "shortvideo",
  "shortsvideo",
  "youtubeshorts",
  "ytshorts",
  "viral",
  "viralvideo",
  "viralshorts",
  "trending",
  "trend",
  "foryou",
  "fyp",
  "subscribe",
  "like",
  "youtube",
  "video",
  "new",
  "best",
  "india",
  "indian",
  "reels",
  "reel",
  "explore",
  "comedy_video",
]);

export interface ContentProfile {
  /** Most-used hashtags, commonest first, stop-tags removed. */
  hashtags: string[];
  /** Most-used video tags, commonest first. */
  tags: string[];
  /** Share of sampled videos that disclose a paid placement, 0..1. A floor, not a true rate. */
  sponsoredRatio: number;
  /** How many of the sampled videos disclosed one. */
  sponsoredCount: number;
  /** Videos the profile was built from. */
  sampleSize: number;
  /**
   * The channel's own YouTube topicDetails URLs, stored verbatim. Without these there is no way to
   * tell later whether a stored niche came from the creator's words or from YouTube's own
   * classification, and that ambiguity is what made the "Auto & EVs" tags unrepairable: a cooking
   * channel carrying `automotive` could not be distinguished from a genuine one.
   */
  topicCategories?: string[];
}

function rank(counts: Map<string, number>, limit: number): string[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value]) => value);
}

export function extractHashtags(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(HASHTAG)) {
    const tag = match[1].toLowerCase();
    if (!STOPTAGS.has(tag)) found.push(tag);
  }
  return found;
}

export function buildContentProfile(videos: YouTubeVideo[], limit = 15, topicCategories: string[] = []): ContentProfile {
  const hashtags = new Map<string, number>();
  const tags = new Map<string, number>();
  let sponsoredCount = 0;

  for (const video of videos) {
    for (const tag of extractHashtags(`${video.title} ${video.description ?? ""}`)) {
      hashtags.set(tag, (hashtags.get(tag) ?? 0) + 1);
    }
    for (const tag of video.tags ?? []) {
      const normalised = tag.toLowerCase().trim();
      // Tags are free text and creators stuff their own name into every one of them; keep the
      // multi-word subject tags ("indian street food") and drop single-word noise.
      if (normalised.length >= 3 && !STOPTAGS.has(normalised)) {
        tags.set(normalised, (tags.get(normalised) ?? 0) + 1);
      }
    }
    if (video.hasPaidProductPlacement) sponsoredCount++;
  }

  return {
    hashtags: rank(hashtags, limit),
    tags: rank(tags, limit),
    sponsoredRatio: videos.length > 0 ? Number((sponsoredCount / videos.length).toFixed(3)) : 0,
    sponsoredCount,
    sampleSize: videos.length,
    topicCategories,
  };
}

/**
 * The topics the matching engine scores on. Real hashtags and tags beat anything derived from a
 * niche label, because they are the creator's own words about their own videos.
 */
export function topicsFrom(profile: ContentProfile, fallback: string[], limit = 12): string[] {
  const merged = [...profile.hashtags, ...profile.tags];
  const unique = [...new Set(merged)].slice(0, limit);
  return unique.length > 0 ? unique : fallback;
}
