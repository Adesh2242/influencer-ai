// Fields the Creator model needs that no free source reports. Every number here is modelled from
// real reach by a stated formula and is marked "estimated" in the provenance map, so the UI can
// show it as an estimate rather than a fact. None of it is observed.
import type { CreatorTier, RateCard } from "../../types";
import type { ChannelMetrics } from "./metrics";

/**
 * Indicative Indian CPM bands in rupees per 1,000 views, by creator size. Rates fall per thousand
 * as audiences grow: a nano creator's few thousand views cost more each than a mega creator's.
 * These are planning benchmarks for the Indian market, not quotes — a creator's real price depends
 * on exclusivity, usage rights and how badly the brand wants them.
 */
export const CPM_BY_TIER: Record<CreatorTier, { video: number; short: number }> = {
  nano: { video: 700, short: 420 },
  micro: { video: 550, short: 330 },
  mid: { video: 420, short: 250 },
  macro: { video: 320, short: 190 },
  mega: { video: 240, short: 145 },
};

/** Engagement lifts or discounts the price: an audience that reacts is worth paying more to reach. */
export function engagementMultiplier(engagementRate: number): number {
  if (engagementRate >= 8) return 1.35;
  if (engagementRate >= 5) return 1.2;
  if (engagementRate >= 3) return 1.05;
  if (engagementRate >= 1.5) return 1;
  return 0.85;
}

/** Rupee fees are quoted in round numbers: nearest ₹500, never below ₹500. */
function roundFee(value: number): number {
  return Math.max(500, Math.round(value / 500) * 500);
}

/**
 * Builds an indicative rate card from measured reach.
 *
 *   fee = (median views / 1000) × CPM for the tier and format × engagement multiplier
 *
 * Priced off views rather than subscribers on purpose: a brand buys the views, and subscriber counts
 * on YouTube lag reality badly.
 */
export function estimateRates(metrics: ChannelMetrics, tier: CreatorTier, hasYouTube = true): RateCard {
  const cpm = CPM_BY_TIER[tier];
  const multiplier = engagementMultiplier(metrics.engagementRate);
  const thousands = metrics.avgViews / 1000;

  const short = roundFee(thousands * cpm.short * multiplier);
  return {
    reel: short,
    // A story is a lighter, shorter-lived placement; a static post sits between the two.
    story: roundFee(short * 0.35),
    post: roundFee(short * 0.7),
    video: hasYouTube ? roundFee(thousands * cpm.video * multiplier) : null,
  };
}

export interface AuthenticityEstimate {
  score: number;
  suspiciousFollowerPct: number;
  flags: string[];
}

/**
 * A reach-consistency proxy, not an audit. Vendors like HypeAuditor score authenticity by inspecting
 * individual followers, which no free API exposes. What public stats do show is whether a channel's
 * views, subscribers and comments move together the way a real audience's do, which catches the
 * crudest inflation and nothing subtler. Treat a high score as "no visible anomaly", not as proof.
 */
export function estimateAuthenticity(
  metrics: ChannelMetrics,
  subscriberCount: number,
  commentToLikeRatio: number | null,
): AuthenticityEstimate {
  const flags: string[] = [];
  let score = 82; // Start mid-high: absence of evidence is not evidence of fraud.

  // Views far below subscribers suggests bought or long-dead subscribers.
  const viewsPerSub = subscriberCount > 0 ? metrics.avgViews / subscriberCount : 0;
  if (subscriberCount >= 10_000) {
    if (viewsPerSub < 0.01) {
      score -= 30;
      flags.push("Median views are under 1% of subscribers");
    } else if (viewsPerSub < 0.03) {
      score -= 14;
      flags.push("Median views are low relative to subscribers");
    } else if (viewsPerSub > 0.25) {
      score += 6;
    }
  }

  if (metrics.engagementRate < 0.5 && !metrics.likesHidden) {
    score -= 16;
    flags.push("Engagement rate under 0.5%");
  }

  // Real audiences comment at a fairly steady fraction of likes. A near-zero ratio on a channel with
  // plenty of likes is a classic sign of purchased engagement.
  if (commentToLikeRatio !== null && commentToLikeRatio < 0.002) {
    score -= 12;
    flags.push("Almost no comments relative to likes");
  }

  if (metrics.sampleSize < 5) {
    score -= 8;
    flags.push(`Only ${metrics.sampleSize} recent video${metrics.sampleSize === 1 ? "" : "s"} to judge from`);
  }

  if (metrics.likesHidden) {
    flags.push("Channel hides likes, so engagement counts comments only");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  // Expressed as the share of the audience the score implies, so the UI has a number to show. It is
  // a restatement of the score, not a separate measurement.
  const suspiciousFollowerPct = Number(Math.max(0, (100 - score) * 0.45).toFixed(1));

  return { score, suspiciousFollowerPct, flags };
}
