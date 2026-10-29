import { describe, expect, it } from "vitest";
import { creators } from "../../data/creators";
import { DEFAULT_BRIEF, mergeBrief } from "../brief/defaults";
import { DEFAULT_WEIGHTS, SCORE_LABELS, matchCreators, scoreCreator } from "./engine";
import type { CampaignBrief, MatchResult, ScoreKey } from "../../types";

/** A brief with no preferences and no hard filters beyond the defaults' deliverable. */
const OPEN_BRIEF: CampaignBrief = mergeBrief(DEFAULT_BRIEF, { platforms: [], budgetINR: 0, minAuthenticity: 0 });

const FULL_BRIEF: CampaignBrief = mergeBrief(DEFAULT_BRIEF, {
  brandName: "Mallige Botanicals",
  productCategory: "skincare",
  description: "Vitamin C serum and sunscreen launch for women in South India.",
  niches: ["beauty"],
  languages: ["ta", "te"],
  platforms: ["instagram", "youtube"],
  targetGender: "female",
  targetAges: ["18-24", "25-34"],
  targetRegions: ["south"],
  budgetINR: 300_000,
  creatorsWanted: 8,
});

const brief = (patch: Partial<CampaignBrief>) => mergeBrief(OPEN_BRIEF, patch);
const component = (result: MatchResult, key: ScoreKey) => result.components.find((c) => c.key === key)!;
const weightSum = (result: MatchResult) => result.components.reduce((total, c) => total + c.weight, 0);

describe("scoreCreator hard filters", () => {
  it("excludes creators who aren't on any of the brief's platforms", () => {
    const creator = creators.find((c) => !c.platforms.some((p) => p.platform === "moj"))!;
    expect(scoreCreator(brief({ platforms: ["moj"] }), creator).excludedReason).toBe("Not on Moj");
    const both = creators.find((c) => !c.platforms.some((p) => p.platform === "moj" || p.platform === "sharechat"))!;
    expect(scoreCreator(brief({ platforms: ["moj", "sharechat"] }), both).excludedReason).toBe("Not on Moj or ShareChat");
  });

  it("excludes creators below the minimum authenticity score", () => {
    const creator = creators.find((c) => c.authenticity.score < 60)!;
    const result = scoreCreator(brief({ minAuthenticity: 70 }), creator);
    expect(result.excludedReason).toBe(`Authenticity score ${Math.round(creator.authenticity.score)} is below your minimum of 70`);
    expect(scoreCreator(brief({ minAuthenticity: 0 }), creator).excludedReason).toBeNull();
  });

  it("excludes creators below the minimum engagement rate on the chosen platform", () => {
    const creator = creators[0];
    const result = scoreCreator(brief({ minEngagementRate: 40 }), creator);
    expect(result.excludedReason).toMatch(/engagement on .+ is below your 40% minimum$/);
    expect(scoreCreator(brief({ minEngagementRate: 0 }), creator).excludedReason).toBeNull();
  });

  it("excludes creators outside the requested size tiers", () => {
    const micro = creators.find((c) => c.tier === "micro")!;
    expect(scoreCreator(brief({ creatorTiers: ["nano", "mega"] }), micro).excludedReason).toMatch(
      /^Micro creator \(.+ followers\); you asked for nano or mega creators$/,
    );
    expect(scoreCreator(brief({ creatorTiers: ["micro"] }), micro).excludedReason).toBeNull();
  });

  it("excludes recent competitor work with a trimmed, case-insensitive, partial brand match", () => {
    const creator = creators.find((c) => c.collaborations.some((w) => w.monthsAgo <= 6))!;
    const work = creator.collaborations.filter((w) => w.monthsAgo <= 6).sort((a, b) => a.monthsAgo - b.monthsAgo)[0];
    const months = work.monthsAgo === 1 ? "1 month ago" : `${work.monthsAgo} months ago`;
    const firstWord = work.brand.split(" ")[0];
    for (const term of [`  ${work.brand.toUpperCase()}  `, firstWord]) {
      expect(scoreCreator(brief({ excludeBrands: [term] }), creator).excludedReason).toBe(`Worked with ${work.brand} ${months} (competitor)`);
    }
  });

  it("only warns about competitor work 7-12 months ago", () => {
    const creator = creators.find(
      (c) => c.collaborations.some((w) => w.monthsAgo > 6 && w.monthsAgo <= 12) && c.authenticity.score >= 70,
    )!;
    const work = creator.collaborations.find((w) => w.monthsAgo > 6 && w.monthsAgo <= 12)!;
    const others = creator.collaborations.filter((w) => w.brand === work.brand && w.monthsAgo <= 6);
    expect(others).toHaveLength(0);
    const result = scoreCreator(brief({ excludeBrands: [work.brand] }), creator);
    expect(result.excludedReason).toBeNull();
    expect(result.warnings).toContain(`Worked with ${work.brand} ${work.monthsAgo} months ago (competitor)`);
  });

  it("excludes creators who can't deliver the requested format", () => {
    const creator = creators.find((c) => !c.platforms.some((p) => p.platform === "youtube" || p.platform === "linkedin"))!;
    expect(scoreCreator(brief({ deliverable: "video" }), creator).excludedReason).toBe(
      "Long-form videos need YouTube or LinkedIn, which this creator isn't on",
    );
    expect(scoreCreator(brief({ deliverable: "video", platforms: ["instagram"] }), creators[0]).excludedReason).toBe(
      "None of your selected platforms supports long-form videos",
    );
  });

  it("still scores excluded creators", () => {
    const result = scoreCreator(brief({ minEngagementRate: 40 }), creators[0]);
    expect(result.excludedReason).not.toBeNull();
    expect(result.score).toBeGreaterThan(0);
    expect(result.estimatedCostINR).toBeGreaterThan(0);
    expect(result.components).toHaveLength(8);
  });
});

describe("scoreCreator components and weights", () => {
  it("leaves unspecified criteria out and re-normalises the rest to 1", () => {
    const result = scoreCreator(OPEN_BRIEF, creators[0]);
    const applied = result.components.filter((c) => c.applied).map((c) => c.key);
    expect(applied.sort()).toEqual(["authenticity", "engagement"]);
    for (const c of result.components.filter((c) => !c.applied)) expect(c.weight).toBe(0);
    const base = DEFAULT_WEIGHTS.engagement + DEFAULT_WEIGHTS.authenticity;
    expect(component(result, "engagement").weight).toBeCloseTo(DEFAULT_WEIGHTS.engagement / base, 10);
    expect(component(result, "authenticity").weight).toBeCloseTo(DEFAULT_WEIGHTS.authenticity / base, 10);
    expect(weightSum(result)).toBeCloseTo(1, 10);
  });

  it("applies every component for a complete brief, with labelled details and a weighted, rounded score", () => {
    for (const creator of creators.slice(0, 40)) {
      const result = scoreCreator(FULL_BRIEF, creator);
      expect(result.components.every((c) => c.applied)).toBe(true);
      expect(weightSum(result)).toBeCloseTo(1, 10);
      for (const c of result.components) {
        expect(c.label).toBe(SCORE_LABELS[c.key]);
        expect(c.score).toBeGreaterThanOrEqual(0);
        expect(c.score).toBeLessThanOrEqual(100);
        expect(c.detail.length).toBeGreaterThan(10);
      }
      const expected = result.components.reduce((total, c) => total + c.weight * c.score, 0);
      expect(Number.isInteger(result.score)).toBe(true);
      expect(Math.abs(result.score - expected)).toBeLessThanOrEqual(0.5 + 1e-9);
      expect(result.reasons.length).toBeLessThanOrEqual(4);
    }
  });

  it("applies only the criteria the brief sets", () => {
    const result = scoreCreator(brief({ languages: ["hi"], budgetINR: 100_000 }), creators[0]);
    const applied = result.components.filter((c) => c.applied).map((c) => c.key);
    expect(applied.sort()).toEqual(["authenticity", "budget", "engagement", "language"]);
    expect(weightSum(result)).toBeCloseTo(1, 10);
  });

  it("is deterministic", () => {
    expect(scoreCreator(FULL_BRIEF, creators[5])).toEqual(scoreCreator(FULL_BRIEF, creators[5]));
  });
});

describe("matchCreators", () => {
  it("splits eligible from excluded and sorts by score, then by cost", () => {
    const { results, excluded } = matchCreators(FULL_BRIEF, creators);
    expect(results.length + excluded.length).toBe(creators.length);
    expect(results.length).toBeGreaterThan(10);
    expect(results.every((r) => r.excludedReason === null)).toBe(true);
    expect(excluded.every((r) => typeof r.excludedReason === "string" && r.excludedReason.length > 0)).toBe(true);
    for (let i = 1; i < results.length; i++) {
      const [prev, next] = [results[i - 1], results[i]];
      expect(prev.score > next.score || (prev.score === next.score && prev.estimatedCostINR <= next.estimatedCostINR)).toBe(true);
    }
  });

  it("puts the best niche fit at the top for a focused brief", () => {
    const [top] = matchCreators(FULL_BRIEF, creators).results;
    expect(top.creator.niches).toContain("beauty");
    expect(top.reasons.length).toBeGreaterThan(0);
  });

  it("applies the limit to results only", () => {
    const all = matchCreators(FULL_BRIEF, creators);
    const limited = matchCreators(FULL_BRIEF, creators, { limit: 5 });
    expect(limited.results).toEqual(all.results.slice(0, 5));
    expect(limited.excluded).toHaveLength(all.excluded.length);
  });

  it("merges weight overrides with the defaults", () => {
    const weights = { ...DEFAULT_WEIGHTS, authenticity: 5 };
    const { results } = matchCreators(FULL_BRIEF, creators, { weights: { authenticity: 5 } });
    for (const result of results.slice(0, 10)) {
      expect(result.score).toBe(scoreCreator(FULL_BRIEF, result.creator, weights).score);
      expect(component(result, "authenticity").weight).toBeCloseTo(5 / (1 - DEFAULT_WEIGHTS.authenticity + 5), 10);
    }
    const byAuthenticity = (list: MatchResult[]) => list.slice(0, 10).reduce((t, r) => t + r.creator.authenticity.score, 0);
    expect(byAuthenticity(results)).toBeGreaterThanOrEqual(byAuthenticity(matchCreators(FULL_BRIEF, creators).results));

    const noNiche = matchCreators(FULL_BRIEF, creators, { weights: { niche: 0 } }).results[0];
    expect(component(noNiche, "niche").weight).toBe(0);
    expect(weightSum(noNiche)).toBeCloseTo(1, 10);
  });

  it("matches the whole dataset in under 15 ms once warm", () => {
    for (let i = 0; i < 3; i++) matchCreators({ ...FULL_BRIEF }, creators);
    const timings: number[] = [];
    for (let i = 0; i < 9; i++) {
      // A fresh brief object each run, so the per-brief context cache doesn't hide the work.
      const fresh = { ...FULL_BRIEF, description: `${FULL_BRIEF.description} Run ${i}.` };
      const start = performance.now();
      matchCreators(fresh, creators);
      timings.push(performance.now() - start);
    }
    // The fastest run is the stable measure; the median swings when other test files run in parallel.
    expect(Math.min(...timings)).toBeLessThan(15);
  });
});
