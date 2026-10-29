import { describe, expect, it } from "vitest";
import { creators } from "@/data/creators";
import { DEFAULT_BRIEF, mergeBrief } from "@/lib/brief/defaults";
import { matchCreators } from "@/lib/matching/engine";
import { estimateStats, exclusionKind, groupExclusions, isBlankBrief, sortResults, summarizeMatches } from "./results";

const brief = mergeBrief(DEFAULT_BRIEF, { niches: ["beauty"], languages: ["ta", "te"], targetRegions: ["south"], budgetINR: 300_000, creatorsWanted: 8 });
const { results, excluded } = matchCreators(brief, creators);

function isSorted(values: number[], direction: "asc" | "desc"): boolean {
  return values.every((v, i) => i === 0 || (direction === "asc" ? values[i - 1] <= v : values[i - 1] >= v));
}

describe("sortResults", () => {
  it("orders by each sort key without mutating the input", () => {
    const before = results.map((r) => r.creator.id);
    expect(isSorted(sortResults(results, "score").map((r) => r.score), "desc")).toBe(true);
    expect(isSorted(sortResults(results, "cost").map((r) => r.estimatedCostINR), "asc")).toBe(true);
    expect(isSorted(sortResults(results, "reach").map((r) => r.estimatedReach), "desc")).toBe(true);
    expect(isSorted(sortResults(results, "engagement").map((r) => estimateStats(r).engagementRate), "desc")).toBe(true);
    expect(results.map((r) => r.creator.id)).toEqual(before);
  });
});

describe("summarizeMatches", () => {
  it("summarises the top N by score against the budget", () => {
    const summary = summarizeMatches(results, excluded, brief);
    const top = results.slice(0, 8);
    expect(summary.eligible).toBe(results.length);
    expect(summary.excluded).toBe(excluded.length);
    expect(summary.topCount).toBe(Math.min(8, results.length));
    expect(summary.topCostINR).toBe(top.reduce((s, r) => s + r.estimatedCostINR, 0));
    expect(summary.overBudget).toBe(summary.topCostINR > 300_000);
    expect(summarizeMatches(results, excluded, { creatorsWanted: 3, budgetINR: 0 }).overBudget).toBeNull();
    expect(summarizeMatches([], excluded, brief)).toMatchObject({ topCount: 0, topAverageScore: 0, topCostINR: 0 });
  });
});

describe("exclusion grouping", () => {
  it("classifies every reason the engine produces", () => {
    const strict = mergeBrief(DEFAULT_BRIEF, {
      platforms: ["linkedin"],
      deliverable: "story",
      creatorTiers: ["nano"],
      minAuthenticity: 95,
      minEngagementRate: 12,
    });
    for (const r of matchCreators(strict, creators).excluded) {
      expect(exclusionKind(r.excludedReason ?? "")).not.toBe("other");
    }
    expect(exclusionKind("Authenticity score 48 is below your minimum of 70")).toBe("authenticity");
    expect(exclusionKind("Not on Instagram or YouTube")).toBe("platform");
    expect(exclusionKind("Worked with Glowleaf Naturals 2 months ago (competitor)")).toBe("competitor");
  });

  // The engine reports the first failing filter only, so relaxing one may surface the next.
  it("suggests a relaxation that shrinks the largest exclusion group", () => {
    const impossible = mergeBrief(DEFAULT_BRIEF, { minAuthenticity: 100, minEngagementRate: 19 });
    const response = matchCreators(impossible, creators);
    expect(response.results).toHaveLength(0);
    const [biggest] = groupExclusions(response.excluded, impossible);
    expect(biggest.relax).not.toBeNull();
    const relaxed = mergeBrief(impossible, biggest.relax ?? {});
    const after = groupExclusions(matchCreators(relaxed, creators).excluded, relaxed).find((g) => g.kind === biggest.kind);
    expect(after?.count ?? 0).toBeLessThan(biggest.count);
  });
});

describe("isBlankBrief", () => {
  it("treats the default brief as blank and any targeting as not", () => {
    expect(isBlankBrief(DEFAULT_BRIEF)).toBe(true);
    expect(isBlankBrief(brief)).toBe(false);
  });
});
