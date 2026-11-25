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
 * Share of subscribers who can be expected to watch a given post. Generous: half an audience
 * turning up for one video is a very good channel.
 */
export const OWNED_SHARE = 0.5;

/**
 * How much of a creator's algorithmic reach counts towards a fee. Views far above subscriber count
 * come from YouTube's recommendations, not from an audience the creator brings — and the algorithm
 * decides that again for every post, with branded content typically faring worse than organic. Real
 * reach, so not worth nothing; not promised reach, so not worth full price.
 */
export const BORROWED_RATE = 0.2;

/**
 * Reach a creator could credibly commit to for a paid post, rather than whatever their best video
 * happened to do. A channel with 28,800 subscribers and a 27-million-view hit from 2021 was being
 * priced on the hit, at ₹83 lakh a reel.
 */
export function sellableReach(views: number, followers: number): number {
  if (views <= 0) return 0;
  const owned = Math.min(views, followers * OWNED_SHARE);
  const borrowed = Math.max(0, views - owned);
  return Math.round(owned + borrowed * BORROWED_RATE);
}

/**
 * Ceiling on fair value, as a multiple of what a creator of this size would ask. A genuine
 * overperformer is worth more than their tier suggests; nobody is worth a hundred times it, and a
 * number that far outside the market is a modelling error rather than a bargain.
 */
export const FAIR_VALUE_CEILING = 3;

/**
 * Below this, a branded booking is not a transaction anyone completes: the brief, the revisions and
 * the invoice cost more than the fee. Figures are per format, for the Maharashtra market.
 */
export const MIN_VIABLE_FEE: Record<Deliverable, number> = {
  video: 1_500,
  reel: 1_000,
  post: 750,
  story: 500,
};

/**
 * A channel whose median views fall below this share of its subscriber count is telling two
 * stories that cannot both be true. Above roughly a lakh of subscribers, a real audience does not
 * go this quiet: the subscribers were bought, or the channel has been abandoned and the counter is
 * a fossil. Either way there is nothing here to price, and a fee computed off the views is a number
 * with no meaning rather than a bargain.
 */
export const MIN_VIEW_RATE = 0.005;
/**
 * The catalogue's own follower floor, so the coherence rule covers every creator in it. Scoping it
 * to large channels left a gap at the small end: a 10,000-subscriber channel with 30 median views
 * passed, was floored to the minimum fee, and came out at ₹32,609 per thousand views — a quote
 * nobody would write. Half a percent of 10,000 is 50 views, which is not a demanding bar.
 */
export const VIEW_RATE_APPLIES_ABOVE = 10_000;

/**
 * Above this multiple of what the reach is worth, a creator is expensive and the buyer decides
 * whether to pay or walk. The verdict and the negotiation note put the number in front of them;
 * hiding them would remove creators a buyer could legitimately choose to pursue.
 */
export const EXPENSIVE_GAP = 4;

/**
 * Above this, it stops being a negotiation. A creator with 9,59,000 subscribers will open near
 * ₹60,000; if their videos deliver 9,148 views, the reach is worth about ₹1,500. Nobody comes down
 * forty-fold, and a plan that budgets ₹1,500 for them is fiction. The absolute floor below is
 * deliberately low, because ₹2,400 for a genuine 12,000-subscriber creator is an ordinary
 * Maharashtra booking — what makes the figure absurd is the distance from the creator's standing,
 * not the number of rupees.
 */
export const UNBRIDGEABLE_GAP = 10;


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
  /**
   * False when there is no price at which this booking happens, and `blocker` says why. The
   * arithmetic still produces a number in these cases, and that number is the problem: a creator
   * with 20,60,000 subscribers and 26 median views was being quoted ₹1,500, and a 9,59,000-
   * subscriber motovlogger ₹1,500, figures neither of them would answer. A plan costed on fees
   * nobody will accept falls apart on first contact, so the product has to say so instead.
   */
  viable: boolean;
  blocker: string | null;
  /**
   * Set when the fee is real but the creator's ask is likely to be far above it. This is a loud
   * warning, not a blocker: suppressing the number entirely left half the catalogue showing "n/a",
   * which reads as a broken product rather than a careful one, and the reach-based figure is the
   * most useful thing a buyer can walk into that negotiation holding.
   */
  caution: string | null;
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
  const sellable = sellableReach(views, followers);
  const base = (sellable / 1000) * cpm;
  const engagement = engagementMultiplier(platform?.engagementRate ?? 0, tier);
  const authenticity = authenticityMultiplier(creator.authenticity.score);
  const ask = likelyAsk(followers, tier, deliverable);
  const modelled = base * engagement * authenticity;
  // The ceiling is a sanity check on the model, not on the creator.
  const capped = Math.min(modelled, ask * FAIR_VALUE_CEILING);
  const fairValue = roundFee(capped, deliverable);
  const gap = fairValue > 0 ? ask / fairValue : Infinity;

  const workings: RateWorking[] = [
    {
      label: "Sellable reach",
      value: Math.round(base),
      detail:
        sellable < views
          ? `${views.toLocaleString("en-IN")} median views, of which ${sellable.toLocaleString("en-IN")} is reach they can commit to ` +
            `(${followers.toLocaleString("en-IN")} subscribers; the rest is algorithmic) × ₹${Math.round(cpm).toLocaleString("en-IN")} per 1,000`
          : `${views.toLocaleString("en-IN")} median views × ₹${Math.round(cpm).toLocaleString("en-IN")} per 1,000`,
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

  if (capped < modelled) {
    workings.push({
      label: "Capped",
      value: fairValue,
      detail: `Held to ${FAIR_VALUE_CEILING}× what a ${tier} creator of this size would ask (₹${ask.toLocaleString("en-IN")}).`,
    });
  }

  // A capped figure is a ceiling the model refused to go above, not a valuation. Calling it
  // "underpriced" would read as a bargain and invite a buyer to overpay for reach that was
  // discounted precisely because it cannot be promised.
  const verdict: RateEstimate["verdict"] =
    gap >= EXPENSIVE_GAP ? "overpriced" : gap >= 2 ? "stretched" : gap >= 0.8 || capped < modelled ? "fair" : "underpriced";

  const effectiveCPM = views > 0 ? Math.round((fairValue / views) * 1000) : 0;

  // Whether a deal exists at all, checked before any of the prose below is believed.
  const viewRate = followers > 0 ? views / followers : 0;
  // Only "there is nothing to price here" blocks; "they are expensive" does not.
  const blocker =
    followers >= VIEW_RATE_APPLIES_ABOVE && viewRate < MIN_VIEW_RATE
      ? `${followers.toLocaleString("en-IN")} subscribers but a median of ${views.toLocaleString("en-IN")} views — ` +
        `${(viewRate * 100).toFixed(2)}% of the audience turns up. Those two figures cannot both be true, so there is nothing here to price.`
      : fairValue < MIN_VIABLE_FEE[deliverable]
        ? `The reach supports about ₹${fairValue.toLocaleString("en-IN")}, below the ₹${MIN_VIABLE_FEE[deliverable].toLocaleString("en-IN")} at which a booking is worth either side's paperwork.`
        : null;

  // Priceable, but go in with your eyes open.
  const caution =
    blocker === null && gap >= UNBRIDGEABLE_GAP
      ? `Likely to open near ₹${ask.toLocaleString("en-IN")} off ${followers.toLocaleString("en-IN")} subscribers — about ${gap.toFixed(0)}× what ${views.toLocaleString("en-IN")} median views are worth. Budget the gap or expect a long negotiation.`
      : null;

  const note =
    verdict === "overpriced"
      ? `Expect a quote near ₹${ask.toLocaleString("en-IN")} off ${followers.toLocaleString("en-IN")} subscribers, but the last videos delivered ${views.toLocaleString("en-IN")} views. That is ${gap.toFixed(1)}× what the reach is worth — open at ₹${fairValue.toLocaleString("en-IN")} or walk.`
      : verdict === "stretched"
        ? `The quote will be anchored to ${followers.toLocaleString("en-IN")} subscribers; the reach supports about ₹${fairValue.toLocaleString("en-IN")}. There is room to negotiate down.`
        : verdict === "underpriced"
          ? `Delivers ${views.toLocaleString("en-IN")} views for a tier that usually asks less. Good value — book before the rate card catches up.`
          : capped < modelled
            ? `Recent views are far above what ${followers.toLocaleString("en-IN")} subscribers can account for, so most of that reach is YouTube's recommendation engine rather than an audience they bring. ₹${fairValue.toLocaleString("en-IN")} is what the reach they can commit to is worth; treat anything above it as a bet on the algorithm repeating itself.`
            : `Ask and delivered reach line up. ₹${fairValue.toLocaleString("en-IN")} is a fair opening number.`;

  return {
    fairValue,
    viable: blocker === null,
    blocker,
    caution,
    likelyAsk: ask,
    gap: Number(gap.toFixed(2)),
    verdict,
    effectiveCPM,
    workings,
    negotiationNote: blocker ?? caution ?? note,
  };
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
