// Pure helpers behind the match workspace: sorting, the summary bar and the "nothing fits" advice.
import { DEFAULT_BRIEF } from "@/lib/brief/defaults";
import type { CampaignBrief, MatchResult, PlatformStats } from "@/types";

export type MatchSort = "score" | "cost" | "reach" | "engagement";

export const MATCH_SORTS: readonly { value: MatchSort; label: string }[] = [
  { value: "score", label: "Best match" },
  { value: "cost", label: "Lowest cost" },
  { value: "reach", label: "Highest reach" },
  { value: "engagement", label: "Highest engagement" },
];

/** Stats on the platform the engine used for this result's estimates. */
export function estimateStats(result: MatchResult): PlatformStats {
  return result.creator.platforms.find((p) => p.platform === result.platform) ?? result.creator.platforms[0];
}

/** Returns a new array; ties fall back to the match score so the order stays stable and useful. */
export function sortResults(results: readonly MatchResult[], sort: MatchSort): MatchResult[] {
  const byScore = (a: MatchResult, b: MatchResult) => b.score - a.score || a.creator.id.localeCompare(b.creator.id);
  const sorted = [...results];
  switch (sort) {
    case "cost":
      return sorted.sort((a, b) => a.estimatedCostINR - b.estimatedCostINR || byScore(a, b));
    case "reach":
      return sorted.sort((a, b) => b.estimatedReach - a.estimatedReach || byScore(a, b));
    case "engagement":
      return sorted.sort((a, b) => estimateStats(b).engagementRate - estimateStats(a).engagementRate || byScore(a, b));
    default:
      return sorted.sort(byScore);
  }
}

export interface MatchSummary {
  eligible: number;
  excluded: number;
  /** min(creatorsWanted, eligible). */
  topCount: number;
  /** Average score of the top N by score; 0 when nothing is eligible. */
  topAverageScore: number;
  topCostINR: number;
  topReach: number;
  /** null when the brief has no budget. */
  overBudget: boolean | null;
}

/** `results` must be sorted by score, as matchCreators returns them. */
export function summarizeMatches(
  results: readonly MatchResult[],
  excluded: readonly MatchResult[],
  brief: Pick<CampaignBrief, "creatorsWanted" | "budgetINR">,
): MatchSummary {
  const top = results.slice(0, Math.max(1, brief.creatorsWanted));
  const topCostINR = top.reduce((sum, r) => sum + r.estimatedCostINR, 0);
  return {
    eligible: results.length,
    excluded: excluded.length,
    topCount: top.length,
    topAverageScore: top.length > 0 ? Math.round(top.reduce((sum, r) => sum + r.score, 0) / top.length) : 0,
    topCostINR,
    topReach: top.reduce((sum, r) => sum + r.estimatedReach, 0),
    overBudget: brief.budgetINR > 0 ? topCostINR > brief.budgetINR : null,
  };
}

export type ExclusionKind = "platform" | "deliverable" | "tier" | "authenticity" | "engagement" | "competitor" | "other";

// Mirrors the sentences produced by exclusionReason() in lib/matching/engine.ts.
const EXCLUSION_PATTERNS: [ExclusionKind, RegExp][] = [
  ["deliverable", /supports |, which this creator isn't on$/],
  ["platform", /^Not on /],
  ["tier", /creator \(.+ followers\); you asked for /],
  ["authenticity", /^Authenticity score /],
  ["engagement", / engagement on .+ is below your /],
  ["competitor", /\(competitor\)$/],
];

export function exclusionKind(reason: string): ExclusionKind {
  return EXCLUSION_PATTERNS.find(([, pattern]) => pattern.test(reason))?.[0] ?? "other";
}

export interface ExclusionGroup {
  kind: ExclusionKind;
  count: number;
  /** Which filter to relax, in plain words. */
  suggestion: string;
  /** Brief patch that relaxes the filter; null when there is nothing sensible to change automatically. */
  relax: Partial<CampaignBrief> | null;
  relaxLabel: string;
}

function relaxFor(kind: ExclusionKind, brief: CampaignBrief): Omit<ExclusionGroup, "kind" | "count"> {
  switch (kind) {
    case "platform":
      return { suggestion: "Your platform choice rules them out.", relax: { platforms: [] }, relaxLabel: "Allow any platform" };
    case "deliverable":
      return {
        suggestion: "The deliverable is not available on the platforms you picked.",
        relax: { deliverable: DEFAULT_BRIEF.deliverable, platforms: [] },
        relaxLabel: "Switch to reels on any platform",
      };
    case "tier":
      return { suggestion: "They fall outside the creator sizes you selected.", relax: { creatorTiers: [] }, relaxLabel: "Allow every creator size" };
    case "authenticity": {
      const lower = Math.max(0, Math.min(brief.minAuthenticity - 20, 50));
      return {
        suggestion: `Their authenticity score is under your minimum of ${brief.minAuthenticity}.`,
        relax: { minAuthenticity: lower },
        relaxLabel: `Lower minimum to ${lower}`,
      };
    }
    case "engagement":
      return { suggestion: "Their engagement rate is under your minimum.", relax: { minEngagementRate: 0 }, relaxLabel: "Remove engagement minimum" };
    case "competitor":
      return { suggestion: "They recently worked with a brand you excluded.", relax: { excludeBrands: [] }, relaxLabel: "Clear excluded brands" };
    default:
      return { suggestion: "Other hard filters.", relax: null, relaxLabel: "" };
  }
}

/** Groups excluded results by the filter that removed them, largest group first. */
export function groupExclusions(excluded: readonly MatchResult[], brief: CampaignBrief): ExclusionGroup[] {
  const counts = new Map<ExclusionKind, number>();
  for (const result of excluded) {
    if (!result.excludedReason) continue;
    const kind = exclusionKind(result.excludedReason);
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([kind, count]) => ({ kind, count, ...relaxFor(kind, brief) }));
}

/** True while the brief still has no targeting: the ranking is then the overall quality order. */
export function isBlankBrief(brief: CampaignBrief): boolean {
  return (
    brief.brandName.trim() === "" &&
    brief.productCategory.trim() === "" &&
    brief.description.trim() === "" &&
    brief.niches.length === 0 &&
    brief.languages.length === 0 &&
    brief.targetGender === "any" &&
    brief.targetAges.length === 0 &&
    brief.targetTiers.length === 0 &&
    brief.targetRegions.length === 0 &&
    brief.targetCityIds.length === 0 &&
    brief.creatorTiers.length === 0
  );
}
