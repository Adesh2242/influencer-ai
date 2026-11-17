// Analysis that only becomes possible once creators carry real hashtags and a history of runs.
//
// Everything here is a pure function over records the ingestion already produced, so it can be
// tested without a database and reused by both the API and the UI.
import type { Creator } from "../types";

/** The minimum a pair needs before co-occurrence means anything rather than noise. */
const MIN_PAIR_SUPPORT = 2;

export interface TopicSource {
  id: string;
  name: string;
  topics: string[];
}

/**
 * Overlap between two topic sets, 0..1. Jaccard rather than raw count so a creator who tags fifty
 * things does not look similar to everyone.
 */
export function jaccard(a: readonly string[], b: readonly string[]): number {
  const left = new Set(a.map((t) => t.toLowerCase()));
  const right = new Set(b.map((t) => t.toLowerCase()));
  if (left.size === 0 || right.size === 0) return 0;

  let shared = 0;
  for (const topic of left) if (right.has(topic)) shared++;
  return shared / (left.size + right.size - shared);
}

export interface Lookalike {
  creator: Creator;
  similarity: number;
  /** The topics both creators use, so the UI can say why they matched. */
  sharedTopics: string[];
}

/**
 * Creators most like this one by the words they put on their own videos. This is the "find me more
 * of these" that a brand actually asks for after it likes one creator, and it works off real
 * hashtags rather than the coarse niche label.
 */
export function findLookalikes(target: Creator, pool: readonly Creator[], limit = 10): Lookalike[] {
  const targetTopics = new Set(target.topics.map((t) => t.toLowerCase()));

  return pool
    .filter((candidate) => candidate.id !== target.id)
    .map((candidate) => ({
      creator: candidate,
      similarity: jaccard(target.topics, candidate.topics),
      sharedTopics: candidate.topics.filter((topic) => targetTopics.has(topic.toLowerCase())),
    }))
    .filter((match) => match.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity || b.creator.platforms[0].followers - a.creator.platforms[0].followers)
    .slice(0, limit);
}

export interface TopicPair {
  a: string;
  b: string;
  /** How many creators use both. */
  support: number;
  /** P(b | a): of the creators using a, the share that also use b. */
  confidence: number;
}

/**
 * Hashtags that travel together across creators. Gives a brand a way in that no filter dropdown
 * offers: start from one tag it knows and find the vocabulary around it.
 */
export function topicCoOccurrence(creators: readonly TopicSource[], limit = 40): TopicPair[] {
  const counts = new Map<string, number>();
  const pairs = new Map<string, number>();

  for (const creator of creators) {
    const topics = [...new Set(creator.topics.map((t) => t.toLowerCase()))].sort();
    for (const topic of topics) counts.set(topic, (counts.get(topic) ?? 0) + 1);
    for (let i = 0; i < topics.length; i++) {
      for (let j = i + 1; j < topics.length; j++) {
        const key = `${topics[i]}\u0000${topics[j]}`;
        pairs.set(key, (pairs.get(key) ?? 0) + 1);
      }
    }
  }

  const out: TopicPair[] = [];
  for (const [key, support] of pairs) {
    if (support < MIN_PAIR_SUPPORT) continue;
    const [a, b] = key.split("\u0000");
    out.push({ a, b, support, confidence: Number((support / (counts.get(a) ?? support)).toFixed(3)) });
  }

  return out.sort((x, y) => y.support - x.support || y.confidence - x.confidence).slice(0, limit);
}

export interface Snapshot {
  capturedAt: string;
  followers: number;
  avgViews: number;
  engagementRate: number;
}

export interface GrowthTrend {
  /** Followers gained per 30 days, from the first and last snapshot. Negative when shrinking. */
  followersPerMonth: number;
  /** Percent change in followers across the window. */
  followersPctChange: number;
  /** Percentage points of change in engagement rate; negative means the audience cooled. */
  engagementDelta: number;
  /** Days between the first and last snapshot. */
  windowDays: number;
  label: "surging" | "growing" | "steady" | "declining" | "unknown";
}

/**
 * Follower velocity from the stored run history. Two snapshots are the minimum, and a window under
 * a day is treated as unknown rather than extrapolated into a wild monthly figure.
 */
export function growthFrom(snapshots: readonly Snapshot[]): GrowthTrend {
  const unknown: GrowthTrend = {
    followersPerMonth: 0,
    followersPctChange: 0,
    engagementDelta: 0,
    windowDays: 0,
    label: "unknown",
  };
  if (snapshots.length < 2) return unknown;

  const ordered = [...snapshots].sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt));
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const windowDays = (Date.parse(last.capturedAt) - Date.parse(first.capturedAt)) / 86_400_000;
  if (!Number.isFinite(windowDays) || windowDays < 1) return unknown;

  const gained = last.followers - first.followers;
  const followersPerMonth = Math.round((gained / windowDays) * 30);
  const followersPctChange = first.followers > 0 ? Number(((gained / first.followers) * 100).toFixed(2)) : 0;
  const monthlyPct = (followersPctChange / windowDays) * 30;

  const label: GrowthTrend["label"] =
    monthlyPct >= 10 ? "surging" : monthlyPct >= 2 ? "growing" : monthlyPct <= -2 ? "declining" : "steady";

  return {
    followersPerMonth,
    followersPctChange,
    engagementDelta: Number((last.engagementRate - first.engagementRate).toFixed(2)),
    windowDays: Number(windowDays.toFixed(1)),
    label,
  };
}

export interface ReachFlag {
  severity: "critical" | "warning" | "info";
  message: string;
}

/**
 * Turns the authenticity numbers into warnings a buyer can act on. The data was already computed
 * at ingest; what was missing was saying it where someone about to spend money would see it.
 */
export function reachFlags(creator: Creator): ReachFlag[] {
  const flags: ReachFlag[] = [];
  const platform = creator.platforms[0];
  if (!platform) return flags;

  const viewsPerFollower = platform.followers > 0 ? platform.avgViews / platform.followers : 0;

  if (platform.followers >= 10_000 && viewsPerFollower < 0.01) {
    flags.push({
      severity: "critical",
      message: `Median views are ${(viewsPerFollower * 100).toFixed(1)}% of subscribers — the audience is far smaller than the follower count suggests.`,
    });
  } else if (platform.followers >= 10_000 && viewsPerFollower < 0.03) {
    flags.push({
      severity: "warning",
      message: `Median views are ${(viewsPerFollower * 100).toFixed(1)}% of subscribers — expect well below headline reach.`,
    });
  }

  if (creator.authenticity.score < 50) {
    flags.push({ severity: "critical", message: `Authenticity estimate ${creator.authenticity.score}/100.` });
  } else if (creator.authenticity.score < 70) {
    flags.push({ severity: "warning", message: `Authenticity estimate ${creator.authenticity.score}/100.` });
  }

  for (const flag of creator.authenticity.flags) {
    flags.push({ severity: "info", message: flag });
  }

  return flags;
}
