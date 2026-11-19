// What a creator will ask for, what their reach is actually worth, and the gap between the two.
//
// The previous model priced purely on delivered views at display-media CPMs and put 57 of 60 real
// creators below their own tier's floor — a 5.26M-subscriber channel came out at ₹14,000 a reel
// against a market range of ₹6-25 lakh. Influencer rates are not media rates: a brand is buying
// production, trust and exclusivity, not impressions at ad-exchange prices.
//
// The fix is not a bigger constant. Two different numbers were being conflated:
//
//   ask       - what the creator quotes, anchored to follower count, because that is the number
//               on their media kit and in their head
//   fairValue - what the reach is worth, anchored to views actually delivered
//
// For a healthy creator these land close together. When they diverge the gap is the most useful
// thing a buyer can be told, because it is exactly the negotiating position.
import { CREATOR_TIERS, PLATFORMS } from "../data/taxonomy";
import type { Creator, CreatorTier, Deliverable } from "../types";

/**
 * Rupees per 1,000 delivered views, by tier, for a video integration. Chosen to reconcile each
 * tier's market rate range with the views a creator in that tier typically delivers.
 *
 * Note it RISES with tier, which surprises people used to media buying: a mega creator charges a
 * premium per view for production value and brand safety. That is precisely why nano and micro
 * creators are the efficient buy on a performance campaign, and the planner leans on it.
 */
export const CPM_BY_TIER: Record<CreatorTier, number> = {
  nano: 1_200,
  micro: 1_100,
  mid: 1_300,
  macro: 1_600,
  mega: 2_200,
};

/** Format multipliers against a long-form integration, which is the reference deliverable. */
export const FORMAT_MULTIPLIER: Record<Deliverable, number> = {
  video: 1,
  reel: 0.62,
  post: 0.42,
  story: 0.2,
};

/**
 * Per-format minimum fees. A creator will not get out of bed for less, and the minimums differ by
 * format for the same reason the rates do: a long-form integration is a day's work, a story is a
 * few minutes. Applying one flat floor collapsed every format to the same number for the small
 * channels this product actually collects, which inverted the rate card.
 */
export const MIN_FEE: Record<Deliverable, number> = {
  video: 2_500,
  reel: 1_500,
  post: 1_000,
  story: 500,
};

/** Falls back to a reel for anything unrecognised, rather than pricing it as NaN. */
function asDeliverable(value: Deliverable): Deliverable {
  return value in FORMAT_MULTIPLIER ? value : "reel";
}

/** An audience that reacts is worth paying more to reach; a flat one is worth less. */
export function engagementMultiplier(engagementRate: number, tier: CreatorTier): number {
  const benchmark = CREATOR_TIERS[tier].engagementBenchmark;
  if (benchmark <= 0) return 1;
  const ratio = engagementRate / benchmark;
  // Capped both ways: engagement is a signal, not a licence to triple or erase a fee.
  return Math.max(0.7, Math.min(1.5, 0.7 + 0.6 * ratio));
}

/** A creator whose numbers look inflated is worth less per view, not more. */
export function authenticityMultiplier(score: number): number {
  if (score >= 80) return 1;
  if (score >= 65) return 0.9;
  if (score >= 50) return 0.75;
  return 0.55;
}

/**
 * Rupee fees are quoted in round numbers, coarser as they get larger. The floor is per-format so
 * the card keeps its order: rounding a story and a post to the same ₹500 made post < story false.
 */
function roundFee(value: number, deliverable: Deliverable = "reel"): number {
  const floor = MIN_FEE[deliverable] ?? MIN_FEE.reel;
  if (!Number.isFinite(value)) return floor;
  const rounded =
    value >= 1_00_000
      ? Math.round(value / 25_000) * 25_000
      : value >= 10_000
        ? Math.round(value / 2_500) * 2_500
        : Math.round(value / 500) * 500;
  return Math.max(floor, rounded);
}

export interface RateWorking {
  label: string;
  /** The running value after this step, in rupees. */
  value: number;
  detail: string;
}

export interface RateEstimate {
  /** What the reach is worth, in rupees, for the given deliverable. */
  fairValue: number;
  /** What the creator is likely to quote, from their follower count. */
  likelyAsk: number;
  /** likelyAsk / fairValue. Above 1 means the ask outruns the reach. */
  gap: number;
  verdict: "underpriced" | "fair" | "stretched" | "overpriced";
  /** Cost per 1,000 delivered views at fairValue. */
  effectiveCPM: number;
  /** The arithmetic, step by step, so a buyer can check it and argue with it. */
  workings: RateWorking[];
  /** One sentence a buyer could put in an email. */
  negotiationNote: string;
}

/** Where a creator sits inside their tier's follower band, 0..1. */
function positionInTier(followers: number, tier: CreatorTier): number {
  const { minFollowers, maxFollowers } = CREATOR_TIERS[tier];
  const span = maxFollowers - minFollowers;
  if (span <= 0) return 0.5;
  return Math.max(0, Math.min(1, (followers - minFollowers) / span));
}

/**
 * What the creator quotes. Anchored to followers because that is what a media kit leads with, and
 * positioned inside the tier's market range rather than at an arbitrary point in it.
 */
export function likelyAsk(followers: number, tier: CreatorTier, requested: Deliverable = "reel"): number {
  const deliverable = asDeliverable(requested);
  const [low, high] = CREATOR_TIERS[tier].reelRate;
  const reelAsk = low + positionInTier(followers, tier) * (high - low);
  // reelRate is quoted for a reel; scale to the requested format.
  return roundFee((reelAsk / FORMAT_MULTIPLIER.reel) * FORMAT_MULTIPLIER[deliverable], deliverable);
}

/**
 * The platform a deliverable would actually run on. Pricing a YouTube integration off an
 * Instagram-primary creator's Instagram views overstated the fee by roughly 90x in testing,
 * and that figure was written into creator.rates and then read by the matching engine.
 */
export function platformFor(creator: Creator, deliverable: Deliverable): Creator["platforms"][number] | undefined {
  return (
    creator.platforms.find((p) => PLATFORMS[p.platform]?.deliverables.includes(deliverable)) ?? creator.platforms[0]
  );
}

export function estimateRate(creator: Creator, requested: Deliverable = "reel"): RateEstimate {
  const deliverable = asDeliverable(requested);
  const platform = platformFor(creator, deliverable);
  const views = platform?.avgViews ?? 0;
  const followers = platform?.followers ?? 0;
  const tier = creator.tier;

  const cpm = CPM_BY_TIER[tier] * FORMAT_MULTIPLIER[deliverable];
  const base = (views / 1000) * cpm;
  const engagement = engagementMultiplier(platform?.engagementRate ?? 0, tier);
  const authenticity = authenticityMultiplier(creator.authenticity.score);
  const fairValue = roundFee(base * engagement * authenticity, deliverable);
  const ask = likelyAsk(followers, tier, deliverable);
  const gap = fairValue > 0 ? ask / fairValue : Infinity;

  const workings: RateWorking[] = [
    {
      label: "Delivered reach",
      value: Math.round(base),
      detail: `${views.toLocaleString("en-IN")} median views × ₹${Math.round(cpm).toLocaleString("en-IN")} per 1,000`,
    },
    {
      label: "Engagement",
      value: Math.round(base * engagement),
      detail: `${(platform?.engagementRate ?? 0).toFixed(2)}% against a ${CREATOR_TIERS[tier].engagementBenchmark}% benchmark for ${tier} (×${engagement.toFixed(2)})`,
    },
    {
      label: "Authenticity",
      value: fairValue,
      detail: `score ${creator.authenticity.score}/100 (×${authenticity.toFixed(2)})`,
    },
  ];

  const verdict: RateEstimate["verdict"] =
    gap >= 4 ? "overpriced" : gap >= 2 ? "stretched" : gap >= 0.8 ? "fair" : "underpriced";

  const effectiveCPM = views > 0 ? Math.round((fairValue / views) * 1000) : 0;

  const note =
    verdict === "overpriced"
      ? `Expect a quote near ₹${ask.toLocaleString("en-IN")} off ${followers.toLocaleString("en-IN")} subscribers, but the last videos delivered ${views.toLocaleString("en-IN")} views. That is ${gap.toFixed(1)}× what the reach is worth — open at ₹${fairValue.toLocaleString("en-IN")} or walk.`
      : verdict === "stretched"
        ? `The quote will be anchored to ${followers.toLocaleString("en-IN")} subscribers; the reach supports about ₹${fairValue.toLocaleString("en-IN")}. There is room to negotiate down.`
        : verdict === "underpriced"
          ? `Delivers ${views.toLocaleString("en-IN")} views for a tier that usually asks less. Good value — book before the rate card catches up.`
          : `Ask and delivered reach line up. ₹${fairValue.toLocaleString("en-IN")} is a fair opening number.`;

  return { fairValue, likelyAsk: ask, gap: Number(gap.toFixed(2)), verdict, effectiveCPM, workings, negotiationNote: note };
}

/** Full rate card at fair value, for the Creator model. */
export function rateCardFor(creator: Creator): { reel: number; story: number; post: number; video: number | null } {
  const carriesVideo = creator.platforms.some((p) => PLATFORMS[p.platform]?.deliverables.includes("video"));
  return {
    reel: estimateRate(creator, "reel").fairValue,
    story: estimateRate(creator, "story").fairValue,
    post: estimateRate(creator, "post").fairValue,
    video: carriesVideo ? estimateRate(creator, "video").fairValue : null,
  };
}
