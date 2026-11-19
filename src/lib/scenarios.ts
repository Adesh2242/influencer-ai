// The same budget, spent three or four different ways, with the trade-offs made explicit.
//
// An agency does not walk into a client meeting with one plan. It walks in with options and a
// recommendation, because the right answer depends on what the brand is actually trying to do and
// that conversation is easier with numbers in front of everyone. "₹10 lakh buys either 8.2 lakh
// people once, or 2.1 lakh people three times from creators who publish in Marathi" is a decision
// a marketing head can make. A single ranked list is not.
import { buildMediaPlan, type MediaPlan, type PlanOptions } from "./mediaplan";
import type { CampaignGoal, Creator } from "../types";

export type ScenarioId = "reach" | "maharashtra" | "conversion" | "balanced";

export interface Scenario {
  id: ScenarioId;
  name: string;
  /** What this way of spending the money is betting on. */
  thesis: string;
  /** The brief this scenario answers. */
  bestFor: string;
  plan: MediaPlan;
  /** The figures that distinguish it, ready to put on a slide. */
  highlights: { label: string; value: string; hint?: string }[];
}

export interface ScenarioComparison {
  budget: number;
  scenarios: Scenario[];
  /** Which to lead with, and why, in a sentence a planner can say out loud. */
  recommendation: { scenarioId: ScenarioId; because: string };
  /** Where the scenarios genuinely differ, rather than every number side by side. */
  tradeOffs: string[];
}

const SPECS: Record<ScenarioId, { name: string; thesis: string; bestFor: string; options: PlanOptions }> = {
  reach: {
    name: "Reach-led",
    thesis: "Buy the largest number of people the budget can touch, accepting that some of them are outside the state.",
    bestFor: "A launch or a category the audience does not know yet, where being seen at all is the job.",
    options: { goal: "awareness", rank: "reach" },
  },
  maharashtra: {
    name: "Maharashtra-first",
    thesis: "Buy only creators publishing in Marathi, so almost every view lands on someone who can actually buy.",
    bestFor: "A regional brand, a state-wide retail footprint, or anything priced and sold in Maharashtra.",
    options: { goal: "consideration", rank: "localCPM", marathiOnly: true },
  },
  conversion: {
    name: "Conversion-led",
    thesis: "Buy the most reactive audiences rather than the biggest, weighted to small creators whose word carries.",
    bestFor: "A product with a clear action — an app install, a code, a store visit — where response beats reach.",
    options: { goal: "conversions", rank: "engagement" },
  },
  balanced: {
    name: "Balanced",
    thesis: "Spread across tiers and sub-regions at the cheapest relevant reach, with no single bet.",
    bestFor: "An always-on programme, or a first campaign where the brand is still learning what works.",
    options: { goal: "consideration", rank: "localCPM" },
  },
};

const fmtInt = (n: number) => n.toLocaleString("en-IN");

function highlightsFor(plan: MediaPlan): Scenario["highlights"] {
  const engagements = plan.creators.reduce(
    (sum, entry) => sum + entry.localViews * ((entry.creator.platforms[0]?.engagementRate ?? 0) / 100),
    0,
  );
  return [
    { label: "Creators", value: fmtInt(plan.creators.length) },
    {
      label: "People reached in Maharashtra",
      value: fmtInt(plan.regional.localUniqueReach),
      hint: "After removing duplication between overlapping audiences",
    },
    { label: "Cost per thousand relevant views", value: `₹${fmtInt(plan.regional.localCPM)}` },
    { label: "Times each person sees it", value: plan.reach.frequency.toFixed(1) },
    {
      label: "Expected engagements",
      value: fmtInt(Math.round(engagements)),
      hint: "In-state views × each creator's measured engagement rate",
    },
    { label: "Share of views in-state", value: `${plan.regional.localShare}%` },
  ];
}

export interface CompareOptions extends Omit<PlanOptions, "goal" | "rank" | "marathiOnly"> {
  /** Restrict the comparison; omit for all four. */
  only?: ScenarioId[];
  /**
   * What the brand says the campaign is for. Each scenario keeps its own strategy — that is the
   * point of comparing them — so this steers the recommendation rather than the plans.
   */
  clientGoal?: CampaignGoal;
}

export function comparePlans(
  pool: readonly Creator[],
  budget: number,
  options: CompareOptions = {},
): ScenarioComparison {
  const ids = options.only ?? (Object.keys(SPECS) as ScenarioId[]);

  const scenarios: Scenario[] = ids.map((id) => {
    const spec = SPECS[id];
    const plan = buildMediaPlan(pool, budget, { ...options, ...spec.options });
    return { id, name: spec.name, thesis: spec.thesis, bestFor: spec.bestFor, plan, highlights: highlightsFor(plan) };
  });

  return {
    budget,
    scenarios,
    recommendation: recommend(scenarios, options.clientGoal),
    tradeOffs: tradeOffsBetween(scenarios),
  };
}

/**
 * Picks the scenario to lead with. Reach is only worth paying for if it reaches the right people,
 * so the default lean is towards whichever option delivers the most in-state reach per rupee —
 * unless one of them is clearly starved of creators, which happens when the roster is thin.
 */
/** The scenario that most directly serves each stated goal. */
const GOAL_FIT: Record<CampaignGoal, ScenarioId> = {
  awareness: "reach",
  consideration: "balanced",
  conversions: "conversion",
  app_installs: "conversion",
  ugc: "conversion",
};

function recommend(scenarios: readonly Scenario[], clientGoal?: CampaignGoal): ScenarioComparison["recommendation"] {
  const viable = scenarios.filter((s) => s.plan.creators.length >= 3);
  if (viable.length === 0) {
    return {
      scenarioId: scenarios[0]?.id ?? "balanced",
      because: "Too few creators match this budget to tell the options apart. Widen the brief or raise the budget.",
    };
  }

  const best = [...viable].sort(
    (a, b) => b.plan.regional.localUniqueReach - a.plan.regional.localUniqueReach,
  )[0];

  const cheapest = [...viable].sort((a, b) => a.plan.regional.localCPM - b.plan.regional.localCPM)[0];

  // A brand that has told us what it wants should get that, unless following it costs a large
  // share of the reach available — in which case say so rather than quietly overriding them.
  const wanted = clientGoal ? viable.find((s) => s.id === GOAL_FIT[clientGoal]) : undefined;
  if (wanted && wanted.id !== best.id) {
    const shortfall = 1 - wanted.plan.regional.localUniqueReach / Math.max(best.plan.regional.localUniqueReach, 1);
    if (shortfall <= 0.25) {
      return {
        scenarioId: wanted.id,
        because: `${wanted.name} fits what you said the campaign is for, and on this roster it reaches ${fmtInt(wanted.plan.regional.localUniqueReach)} people in the state — close enough to the best available that the strategy is worth keeping.`,
      };
    }
    return {
      scenarioId: best.id,
      because: `${wanted.name} matches the stated goal but reaches ${Math.round(shortfall * 100)}% fewer people in Maharashtra on this roster. ${best.name} reaches ${fmtInt(best.plan.regional.localUniqueReach)}. Take ${wanted.name} if the strategy matters more than the scale.`,
    };
  }

  if (best.id === cheapest.id) {
    return {
      scenarioId: best.id,
      because: `${best.name} reaches the most people in Maharashtra and does it at the lowest cost per relevant view (₹${fmtInt(best.plan.regional.localCPM)} per thousand). On this roster it wins on both counts.`,
    };
  }

  return {
    scenarioId: best.id,
    because: `${best.name} reaches ${fmtInt(best.plan.regional.localUniqueReach)} people in the state, the most of any option. ${cheapest.name} is cheaper per relevant view at ₹${fmtInt(cheapest.plan.regional.localCPM)} against ₹${fmtInt(best.plan.regional.localCPM)}, so take that one if efficiency matters more than scale.`,
  };
}

/** Only the differences worth a client's attention. */
function tradeOffsBetween(scenarios: readonly Scenario[]): string[] {
  const out: string[] = [];
  const withCreators = scenarios.filter((s) => s.plan.creators.length > 0);
  if (withCreators.length < 2) return out;

  const byReach = [...withCreators].sort((a, b) => b.plan.regional.localUniqueReach - a.plan.regional.localUniqueReach);
  const top = byReach[0];
  const bottom = byReach[byReach.length - 1];
  if (bottom.plan.regional.localUniqueReach > 0) {
    const multiple = top.plan.regional.localUniqueReach / bottom.plan.regional.localUniqueReach;
    if (multiple >= 1.3) {
      out.push(
        `${top.name} reaches ${multiple.toFixed(1)}× as many people in Maharashtra as ${bottom.name} for the same money.`,
      );
    }
  }

  const byLocalShare = [...withCreators].sort((a, b) => b.plan.regional.localShare - a.plan.regional.localShare);
  if (byLocalShare[0].plan.regional.localShare - byLocalShare.at(-1)!.plan.regional.localShare > 15) {
    out.push(
      `${byLocalShare[0].name} puts ${byLocalShare[0].plan.regional.localShare}% of views in-state against ${byLocalShare.at(-1)!.plan.regional.localShare}% for ${byLocalShare.at(-1)!.name}. The rest is paid for and wasted.`,
    );
  }

  const byCreatorCount = [...withCreators].sort((a, b) => b.plan.creators.length - a.plan.creators.length);
  if (byCreatorCount[0].plan.creators.length >= byCreatorCount.at(-1)!.plan.creators.length * 2) {
    out.push(
      `${byCreatorCount[0].name} means managing ${byCreatorCount[0].plan.creators.length} creators against ${byCreatorCount.at(-1)!.plan.creators.length} for ${byCreatorCount.at(-1)!.name} — more briefing, more approvals, more invoices.`,
    );
  }

  const starved = withCreators.filter((s) => s.plan.unspent > s.plan.budget * 0.25);
  for (const scenario of starved) {
    out.push(
      `${scenario.name} cannot absorb the full budget: ${Math.round((scenario.plan.unspent / scenario.plan.budget) * 100)}% would go unspent on the creators available.`,
    );
  }

  return out;
}
