// Turns a budget into a media plan rather than a shopping list.
//
// "Here are 40 creators that fit ₹20 crore" is not planning. A buyer needs to know what the money
// actually buys: how many real people it reaches once duplication is taken out, how often each of
// them sees the campaign, what that costs per thousand against the category norm, and whether the
// mix of creator sizes suits the goal. Those are the questions a planner is paid to answer, and
// every one of them is computable from what the ingestion already collects.
import { CREATOR_TIER_LIST, CREATOR_TIERS } from "../data/taxonomy";
import { estimateRate } from "./pricing";
import { coverageBySubRegion, regionalValue, SUB_REGIONS, type CoverageRow } from "./regional";
import { upcomingFestivals } from "../data/calendar";
import type { CampaignGoal, Creator, CreatorTier, Deliverable } from "../types";

/**
 * Adults in Maharashtra reachable by online video. State population is about 12.6 crore; this is a
 * deliberately conservative slice of it, and it only ever scales the duplication maths — a bigger
 * universe means less overlap between creators, not more reach.
 */
export const DEFAULT_UNIVERSE = 6_00_00_000;

/**
 * Target share of spend by tier, per goal.
 *
 * Awareness buys reach, and reach is cheapest in absolute terms from large creators. Conversions
 * buy trust, which sits with small ones: a nano creator's audience takes a recommendation
 * personally in a way a mega creator's does not, and the CPM table shows they cost roughly half as
 * much per view. Most brands over-weight the top of this table because it is more impressive to
 * present, which is the single most expensive habit in Indian influencer marketing.
 */
export const GOAL_MIX: Record<CampaignGoal, Record<CreatorTier, number>> = {
  awareness: { nano: 0.05, micro: 0.1, mid: 0.25, macro: 0.3, mega: 0.3 },
  consideration: { nano: 0.1, micro: 0.25, mid: 0.35, macro: 0.2, mega: 0.1 },
  conversions: { nano: 0.25, micro: 0.4, mid: 0.25, macro: 0.1, mega: 0 },
  app_installs: { nano: 0.2, micro: 0.4, mid: 0.3, macro: 0.1, mega: 0 },
  ugc: { nano: 0.5, micro: 0.35, mid: 0.15, macro: 0, mega: 0 },
};

/** Blended CPM a well-built Indian influencer campaign lands near, used as the comparison point. */
export const CATEGORY_CPM_BENCHMARK = 1_400;

export interface PlannedCreator {
  creator: Creator;
  fee: number;
  expectedViews: number;
  cpm: number;
  /** Views estimated to land inside Maharashtra, and what they cost per thousand. */
  localViews: number;
  localCPM: number;
  /** Why this creator is in the plan, in words a client will accept. */
  rationale: string[];
  /** What to check before committing budget to them. */
  risks: string[];
}

export interface PlanInsight {
  severity: "critical" | "warning" | "good" | "info";
  headline: string;
  detail: string;
}

export interface MediaPlan {
  budget: number;
  spend: number;
  unspent: number;
  creators: PlannedCreator[];
  reach: {
    /** Sum of expected views: every view, including repeats to the same person. */
    impressions: number;
    /** People reached at least once, after duplication. */
    uniqueReach: number;
    /** Average times a reached person sees the campaign. */
    frequency: number;
    universe: number;
    /** Share of the addressable universe reached. */
    penetration: number;
  };
  efficiency: {
    blendedCPM: number;
    /** Against uniqueReach rather than impressions: the honest cost of reaching a person. */
    costPerPersonReached: number;
    benchmarkCPM: number;
    /** Percent better (negative) or worse (positive) than the benchmark. */
    vsBenchmark: number;
  };
  mix: { tier: CreatorTier; count: number; spend: number; share: number }[];
  /** The only reach figure a Maharashtra brand should plan on. */
  regional: {
    localImpressions: number;
    localUniqueReach: number;
    /** Cost per 1,000 views that actually land in the state. */
    localCPM: number;
    /** Share of all bought views that land in Maharashtra. */
    localShare: number;
    coverage: CoverageRow[];
  };
  insights: PlanInsight[];
}

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

/** Compact Indian money: ₹20 Cr, ₹4.5 L. */
export function inrCompact(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(n % 1_00_00_000 === 0 ? 0 : 1)} Cr`;
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(n % 1_00_000 === 0 ? 0 : 1)} L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return inr(n);
}

/**
 * Unique reach across overlapping audiences, by the random-duplication (Sainsbury) model:
 * nobody is reached by creator A and B independently more often than chance, so the share NOT
 * reached is the product of each creator's share not reached.
 *
 * It is an approximation — two Pune food creators overlap far more than chance — so the planner
 * warns separately when a plan is concentrated in one city or niche. Without any duplication model
 * at all, adding creators would appear to add reach forever, which is the error that makes
 * influencer plans look better on a slide than in the field.
 */
export function uniqueReachOf(viewCounts: readonly number[], universe = DEFAULT_UNIVERSE): number {
  if (universe <= 0) return 0;
  let notReached = 1;
  for (const views of viewCounts) {
    notReached *= 1 - Math.min(1, Math.max(0, views / universe));
  }
  return Math.round(universe * (1 - notReached));
}

/** Plain-language reasons this creator earns a place in the plan. */
function rationaleFor(
  creator: Creator,
  regional: ReturnType<typeof regionalValue>,
  rate: ReturnType<typeof estimateRate>,
): string[] {
  const out: string[] = [];
  const platform = creator.platforms[0];
  const benchmark = CREATOR_TIERS[creator.tier].engagementBenchmark;

  if (regional.share >= 0.6) {
    out.push(`About ${Math.round(regional.share * 100)}% of the audience is in Maharashtra — ${inr(regional.localCPM)} per thousand relevant views.`);
  }
  if (creator.languages.includes("mr")) {
    out.push("Publishes in Marathi, so the audience is in-state and the message does not need translating.");
  }
  if ((platform?.engagementRate ?? 0) > benchmark) {
    out.push(`${platform?.engagementRate.toFixed(1)}% engagement against a ${benchmark}% benchmark for ${creator.tier} creators.`);
  }
  if (rate.verdict === "underpriced") {
    out.push("Delivers more reach than the tier usually asks for — good value before the rate card catches up.");
  }
  if (creator.authenticity.score >= 85) {
    out.push("No reach-consistency anomalies: views, subscribers and comments move together.");
  }
  const topics = creator.topics.slice(0, 3);
  if (topics.length > 0) out.push(`Posts about ${topics.join(", ")}.`);
  return out;
}

/** What a planner should check before committing budget. */
function risksFor(creator: Creator, regional: ReturnType<typeof regionalValue>): string[] {
  const out: string[] = [];
  const platform = creator.platforms[0];

  if (regional.share < 0.35) {
    out.push(`Only about ${Math.round(regional.share * 100)}% of views land in Maharashtra — real cost is ${inr(regional.localCPM)} per thousand relevant views.`);
  }
  if (creator.authenticity.score < 70) {
    out.push(`Authenticity estimate ${creator.authenticity.score}/100. ${creator.authenticity.flags[0] ?? ""}`.trim());
  }
  if (platform && platform.followers > 0 && platform.avgViews / platform.followers < 0.03 && platform.followers > 10_000) {
    out.push(`Median views are ${((platform.avgViews / platform.followers) * 100).toFixed(1)}% of subscribers — expect well below headline reach.`);
  }
  if ((platform?.postsPerMonth ?? 0) < 1) {
    out.push("Posts less than once a month; confirm they are still active before booking.");
  }
  return out;
}

function concentration(creators: readonly Creator[], key: (c: Creator) => string): { top: string; share: number } {
  const counts = new Map<string, number>();
  for (const creator of creators) {
    const value = key(creator);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const [top, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
  return { top, share: creators.length > 0 ? count / creators.length : 0 };
}

export interface PlanOptions {
  goal?: CampaignGoal;
  deliverable?: Deliverable;
  universe?: number;
  /** Cap on creators; omit to let the budget decide. */
  maxCreators?: number;
  /** Injected by tests so festival timing is deterministic. */
  now?: Date;
  /**
   * What to optimise for when choosing between candidates.
   *   localCPM   cheapest reach that lands in Maharashtra (the default, and usually right)
   *   reach      most views per rupee, wherever they land
   *   engagement most reactive audience first
   */
  rank?: "localCPM" | "reach" | "engagement";
  /** Restrict to creators publishing in Marathi. */
  marathiOnly?: boolean;
}

/**
 * Fills the goal's target mix tier by tier, best value first within each tier, then spends any
 * remainder on whatever is left. Value is reach per rupee, not score: a plan is judged on what it
 * delivers, and the matching score has already decided who is eligible to be here.
 */
export function buildMediaPlan(pool: readonly Creator[], budget: number, options: PlanOptions = {}): MediaPlan {
  const {
    goal = "awareness",
    deliverable = "reel",
    universe = DEFAULT_UNIVERSE,
    maxCreators,
    rank = "localCPM",
    marathiOnly = false,
  } = options;
  const targetMix = GOAL_MIX[goal];

  const ranked = (a: PlannedCreator, b: PlannedCreator): number => {
    if (rank === "reach") return b.expectedViews / Math.max(b.fee, 1) - a.expectedViews / Math.max(a.fee, 1);
    if (rank === "engagement") return (b.creator.platforms[0]?.engagementRate ?? 0) - (a.creator.platforms[0]?.engagementRate ?? 0);
    return a.localCPM - b.localCPM;
  };

  const priced = pool
    .filter((creator) => !marathiOnly || creator.languages.includes("mr"))
    .map((creator) => {
      const rate = estimateRate(creator, deliverable);
      const views = creator.platforms[0]?.avgViews ?? 0;
      const regional = regionalValue(creator, rate.fairValue);
      return {
        creator,
        fee: rate.fairValue,
        expectedViews: views,
        cpm: rate.effectiveCPM,
        localViews: regional.localViews,
        localCPM: regional.localCPM,
        rationale: rationaleFor(creator, regional, rate),
        risks: risksFor(creator, regional),
      };
    })
    .filter((entry) => entry.fee > 0 && entry.expectedViews > 0);

  const chosen: PlannedCreator[] = [];
  let spend = 0;
  const limit = maxCreators ?? Number.POSITIVE_INFINITY;

  for (const tier of CREATOR_TIER_LIST) {
    const tierBudget = budget * (targetMix[tier] ?? 0);
    if (tierBudget <= 0) continue;
    let tierSpend = 0;
    const candidates = priced
      .filter((entry) => entry.creator.tier === tier && !chosen.some((c) => c.creator.id === entry.creator.id))
      // Sorted on local CPM, not national: a plan for a Maharashtra brand should prefer the
      // creator who delivers relevant views cheaply, not the one who looks cheap nationally.
      .sort(ranked);

    for (const entry of candidates) {
      if (chosen.length >= limit) break;
      if (tierSpend + entry.fee > tierBudget) continue;
      chosen.push(entry);
      tierSpend += entry.fee;
      spend += entry.fee;
    }
  }

  // Spend what the mix left on the ground — but a tier the goal gives no budget to is excluded on
  // purpose, not merely unfunded. Buying mega creators with the remainder of a conversions budget
  // would undo the allocation the goal just made, and with a large budget that is exactly what
  // happens: every tier becomes affordable and the plan quietly reverts to "buy everyone".
  const leftovers = priced
    .filter((entry) => !chosen.some((c) => c.creator.id === entry.creator.id))
    .filter((entry) => (targetMix[entry.creator.tier] ?? 0) > 0)
    .sort(
      (a, b) =>
        (targetMix[b.creator.tier] ?? 0) - (targetMix[a.creator.tier] ?? 0) || ranked(a, b),
    );
  for (const entry of leftovers) {
    if (chosen.length >= limit) break;
    if (spend + entry.fee > budget) continue;
    chosen.push(entry);
    spend += entry.fee;
  }

  const impressions = chosen.reduce((sum, entry) => sum + entry.expectedViews, 0);
  const uniqueReach = uniqueReachOf(chosen.map((entry) => entry.expectedViews), universe);
  const frequency = uniqueReach > 0 ? impressions / uniqueReach : 0;
  const blendedCPM = impressions > 0 ? Math.round((spend / impressions) * 1000) : 0;

  const mix = CREATOR_TIER_LIST.map((tier) => {
    const inTier = chosen.filter((entry) => entry.creator.tier === tier);
    const tierSpend = inTier.reduce((sum, entry) => sum + entry.fee, 0);
    return { tier, count: inTier.length, spend: tierSpend, share: spend > 0 ? tierSpend / spend : 0 };
  });

  const localImpressions = chosen.reduce((sum, entry) => sum + entry.localViews, 0);
  const localUniqueReach = uniqueReachOf(chosen.map((entry) => entry.localViews), universe);

  const plan: MediaPlan = {
    budget,
    spend,
    unspent: budget - spend,
    creators: chosen,
    reach: {
      impressions,
      uniqueReach,
      frequency: Number(frequency.toFixed(2)),
      universe,
      penetration: Number(((uniqueReach / universe) * 100).toFixed(2)),
    },
    efficiency: {
      blendedCPM,
      costPerPersonReached: uniqueReach > 0 ? Number((spend / uniqueReach).toFixed(2)) : 0,
      benchmarkCPM: CATEGORY_CPM_BENCHMARK,
      vsBenchmark: Number((((blendedCPM - CATEGORY_CPM_BENCHMARK) / CATEGORY_CPM_BENCHMARK) * 100).toFixed(1)),
    },
    mix,
    regional: {
      localImpressions,
      localUniqueReach,
      localCPM: localImpressions > 0 ? Math.round((spend / localImpressions) * 1000) : 0,
      localShare: impressions > 0 ? Number(((localImpressions / impressions) * 100).toFixed(1)) : 0,
      coverage: coverageBySubRegion(chosen.map((entry) => entry.creator)),
    },
    insights: [],
  };

  plan.insights = buildInsights(plan, priced.length, goal, options.now);
  return plan;
}

function buildInsights(plan: MediaPlan, poolSize: number, goal: CampaignGoal, now = new Date()): PlanInsight[] {
  const insights: PlanInsight[] = [];
  const creators = plan.creators.map((entry) => entry.creator);

  // The headline number for a Maharashtra brand, and usually a surprise.
  if (plan.regional.localShare > 0 && plan.regional.localShare < 60) {
    insights.push({
      severity: "critical",
      headline: `Only ${plan.regional.localShare}% of the views you are buying land in Maharashtra`,
      detail:
        `${plan.reach.impressions.toLocaleString("en-IN")} views nationally, about ` +
        `${plan.regional.localImpressions.toLocaleString("en-IN")} of them in-state. That makes the real cost ` +
        `${inr(plan.regional.localCPM)} per thousand relevant views, not ${inr(plan.efficiency.blendedCPM)}. ` +
        `Marathi-language creators carry far more of their audience inside the state than Mumbai creators ` +
        `publishing in Hindi to a national following.`,
    });
  } else if (plan.regional.localShare >= 60) {
    insights.push({
      severity: "good",
      headline: `${plan.regional.localShare}% of bought views land in Maharashtra`,
      detail: `${inr(plan.regional.localCPM)} per thousand relevant views. A nationally-sourced plan typically wastes far more.`,
    });
  }

  // A plan can look well funded and still leave a quarter of the state untouched.
  const empty = plan.regional.coverage.filter((row) => row.creators === 0);
  if (empty.length > 0 && creators.length >= 5) {
    const missed = empty.reduce((sum, row) => sum + row.population, 0);
    insights.push({
      severity: "warning",
      headline: `No creators in ${empty.map((row) => row.label).join(", ")}`,
      detail:
        `About ${(missed / 1_00_00_000).toFixed(1)} crore people in sub-regions this plan does not touch. ` +
        `Maharashtra is planned by sub-region, not by city tier — ${SUB_REGIONS[empty[0].subRegion].note} is its own market.`,
    });
  }

  // Rates and availability move with the state's own calendar, not the national one.
  const next = upcomingFestivals(now, 120)[0];
  if (next) {
    const f = next.festival;
    insights.push({
      severity: next.bookNow ? "warning" : next.tooLate ? "info" : "info",
      headline: next.tooLate
        ? `${f.name} is ${next.daysAway} days away — the usual booking window has closed`
        : `${f.name} is about ${next.daysAway} days away`,
      detail: next.tooLate
        ? `Good creators are typically committed ${f.bookingLeadWeeks} weeks out. Expect limited inventory and rates near ${f.rateMultiplier}x. ${f.why}`
        : `Rates typically run about ${f.rateMultiplier}x inside the run-up and inventory is usually gone ` +
          `${f.bookingLeadWeeks} weeks ahead, so roughly ${Math.max(0, next.daysToBook)} days to commit. ${f.why}`,
    });
  }

  // The thing a big budget most needs to hear, and the thing a shopping list never says.
  if (plan.unspent > plan.budget * 0.15) {
    insights.push({
      severity: "critical",
      headline: `${inrCompact(plan.unspent)} of ${inrCompact(plan.budget)} cannot be spent on this roster`,
      detail:
        `Every creator worth booking is already in the plan — ${plan.creators.length} of ${poolSize} available. ` +
        `Paying more than fair value for the rest buys nothing extra. Widen the brief, add more creators ` +
        `to the database, or run the campaign in flights across several months.`,
    });
  }

  if (plan.reach.frequency > 4) {
    insights.push({
      severity: "warning",
      headline: `Average person sees this ${plan.reach.frequency.toFixed(1)} times`,
      detail:
        `Past roughly three exposures the extra views mostly reach people already counted. ` +
        `Cutting the heaviest-overlapping creators and spending elsewhere would buy new people instead of repeats.`,
    });
  } else if (plan.reach.frequency >= 1.5 && plan.reach.frequency <= 3.5) {
    insights.push({
      severity: "good",
      headline: `Frequency of ${plan.reach.frequency.toFixed(1)} is in the effective range`,
      detail: "Enough repetition to be remembered, not so much that spend is wasted on the same people.",
    });
  }

  const cityMix = concentration(creators, (c) => c.homeCityId);
  if (cityMix.share > 0.5 && creators.length >= 4) {
    insights.push({
      severity: "warning",
      headline: `${Math.round(cityMix.share * 100)}% of the plan sits in one city`,
      detail:
        `These audiences overlap more than the reach figure assumes, so true unique reach is lower than ` +
        `${plan.reach.uniqueReach.toLocaleString("en-IN")}. Spreading across districts would widen it at the same cost.`,
    });
  }

  if (plan.efficiency.blendedCPM > 0) {
    const better = plan.efficiency.vsBenchmark < 0;
    insights.push({
      severity: better ? "good" : "info",
      headline: `Blended CPM ${inr(plan.efficiency.blendedCPM)} against a ${inr(CATEGORY_CPM_BENCHMARK)} benchmark`,
      detail: better
        ? `${Math.abs(plan.efficiency.vsBenchmark)}% cheaper per thousand views than a typical Indian influencer campaign.`
        : `${plan.efficiency.vsBenchmark}% above the benchmark. Shifting spend towards micro and nano creators ` +
          `would bring it down: they cost roughly half as much per view as mega creators.`,
    });
  }

  // Where the money went versus where the goal wanted it.
  const heavy = plan.mix.filter((row) => row.share > 0).sort((a, b) => b.share - a.share)[0];
  if (heavy) {
    const target = GOAL_MIX[goal][heavy.tier] ?? 0;
    if (heavy.share > target + 0.2) {
      insights.push({
        severity: "warning",
        headline: `${Math.round(heavy.share * 100)}% of spend went to ${heavy.tier} creators`,
        detail:
          `A ${goal} campaign targets about ${Math.round(target * 100)}% there. The roster did not have enough ` +
          `creators in the other tiers to fill the mix, so the plan drifted to what was available.`,
      });
    }
  }

  return insights;
}
