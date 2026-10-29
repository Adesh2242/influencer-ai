import { describe, expect, it } from "vitest";
import { creators } from "../../data/creators";
import { SAMPLE_BRIEFS } from "../../data/sampleBriefs";
import { matchCreators } from "./engine";
import { planCampaign, summarizeSelection } from "./optimize";
import type { Creator, MatchResult } from "../../types";

function fakeResult(creator: Creator, score: number, cost: number, reach: number, overrides: Partial<MatchResult> = {}): MatchResult {
  return {
    creator,
    score,
    components: [],
    reasons: [],
    warnings: [],
    platform: creator.platforms[0].platform,
    estimatedCostINR: cost,
    estimatedReach: reach,
    estimatedEngagements: Math.round(reach * 0.04),
    excludedReason: null,
    ...overrides,
  };
}

/** Creators from distinct home cities, so the city cap doesn't interfere unless a test wants it to. */
function distinctCityCreators(count: number): Creator[] {
  const seen = new Set<string>();
  const picked: Creator[] = [];
  for (const creator of creators) {
    if (seen.has(creator.homeCityId)) continue;
    seen.add(creator.homeCityId);
    picked.push(creator);
    if (picked.length === count) break;
  }
  return picked;
}

const totalCost = (list: MatchResult[]) => list.reduce((sum, r) => sum + r.estimatedCostINR, 0);

describe("summarizeSelection", () => {
  it("adds up totals, CPM, CPE and the remaining budget", () => {
    const [a, b] = distinctCityCreators(2);
    const plan = summarizeSelection([fakeResult(a, 80, 20_000, 40_000), fakeResult(b, 70, 30_000, 60_000)], 100_000);
    expect(plan.totalCostINR).toBe(50_000);
    expect(plan.totalReach).toBe(100_000);
    expect(plan.totalEngagements).toBe(4_000);
    expect(plan.cpmINR).toBe(500);
    expect(plan.cpeINR).toBe(12.5);
    expect(plan.remainingBudgetINR).toBe(50_000);
    expect(plan.notes).toContain("Within budget: ₹50K left of ₹1 L");
  });

  it("flags overspend and city concentration", () => {
    const mumbai = creators.filter((c) => c.homeCityId === "mumbai").slice(0, 4);
    const elsewhere = creators.filter((c) => c.homeCityId !== "mumbai").slice(0, 2);
    expect(mumbai).toHaveLength(4);
    const selection = [...mumbai, ...elsewhere].map((c) => fakeResult(c, 80, 50_000, 10_000));
    const plan = summarizeSelection(selection, 180_000);
    expect(plan.remainingBudgetINR).toBe(-120_000);
    expect(plan.notes).toContain("Over budget by ₹1.2 L");
    expect(plan.notes).toContain("4 of 6 creators are from Mumbai: add other cities for wider reach");
  });

  it("handles an empty selection and no budget", () => {
    const empty = summarizeSelection([], 50_000);
    expect(empty).toMatchObject({ totalCostINR: 0, totalReach: 0, cpmINR: 0, cpeINR: 0, remainingBudgetINR: 50_000 });
    const [creator] = distinctCityCreators(1);
    const unbudgeted = summarizeSelection([fakeResult(creator, 80, 10_000, 0, { estimatedEngagements: 0 })], 0);
    expect(unbudgeted.remainingBudgetINR).toBe(-10_000);
    expect(unbudgeted.cpmINR).toBe(0);
    expect(unbudgeted.cpeINR).toBe(0);
  });
});

describe("planCampaign", () => {
  const matches = SAMPLE_BRIEFS.map((sample) => ({ sample, results: matchCreators(sample.brief, creators).results }));

  it("never exceeds a positive budget and never picks more than asked", () => {
    for (const { results } of matches) {
      for (const budget of [2_500, 25_000, 100_000, 300_000, 1_000_000, 5_000_000]) {
        for (const wanted of [1, 3, 8, 20]) {
          const plan = planCampaign(results, budget, wanted);
          expect(plan.totalCostINR).toBeLessThanOrEqual(budget);
          expect(plan.totalCostINR).toBe(totalCost(plan.selected));
          expect(plan.remainingBudgetINR).toBe(budget - plan.totalCostINR);
          expect(plan.selected.length).toBeLessThanOrEqual(wanted);
          expect(new Set(plan.selected.map((r) => r.creator.id)).size).toBe(plan.selected.length);
        }
      }
    }
  });

  it("fills every slot for each sample brief and explains the plan", () => {
    for (const { sample, results } of matches) {
      const plan = planCampaign(results, sample.brief.budgetINR, sample.brief.creatorsWanted);
      expect(plan.selected, sample.id).toHaveLength(sample.brief.creatorsWanted);
      expect(plan.totalCostINR).toBeLessThanOrEqual(sample.brief.budgetINR);
      expect(plan.notes[0]).toMatch(/^Picked \d+ of \d+ eligible creators/);
      expect(plan.notes.some((note) => note.startsWith("Mix: "))).toBe(true);
      for (let i = 1; i < plan.selected.length; i++) expect(plan.selected[i].score).toBeLessThanOrEqual(plan.selected[i - 1].score);
    }
  });

  it("uses leftover budget to upgrade beyond the cheapest picks", () => {
    const people = distinctCityCreators(6);
    const candidates = [
      fakeResult(people[0], 60, 1_000, 2_000),
      fakeResult(people[1], 60, 1_000, 2_000),
      fakeResult(people[2], 95, 40_000, 200_000),
      fakeResult(people[3], 90, 45_000, 150_000),
    ];
    const plan = planCampaign(candidates, 90_000, 2);
    expect(plan.selected.map((r) => r.creator.id).sort()).toEqual([people[2].id, people[3].id].sort());
    expect(plan.notes.some((note) => /upgrade/.test(note))).toBe(true);
  });

  it("keeps at most ~40% of picks from one home city when there is a choice", () => {
    const mumbai = creators.filter((c) => c.homeCityId === "mumbai").slice(0, 5);
    const others = distinctCityCreators(20).filter((c) => c.homeCityId !== "mumbai").slice(0, 5);
    const candidates = [
      ...mumbai.map((c) => fakeResult(c, 95, 5_000, 50_000)),
      ...others.map((c) => fakeResult(c, 70, 5_000, 20_000)),
    ];
    const plan = planCampaign(candidates, 100_000, 5);
    expect(plan.selected).toHaveLength(5);
    expect(plan.selected.filter((r) => r.creator.homeCityId === "mumbai")).toHaveLength(2);

    const onlyMumbai = planCampaign(mumbai.map((c) => fakeResult(c, 90, 5_000, 50_000)), 100_000, 4);
    expect(onlyMumbai.selected).toHaveLength(4);
    expect(onlyMumbai.notes.some((note) => note.startsWith("Not enough creators from other cities"))).toBe(true);
  });

  it("takes the top creators by score when no budget is set", () => {
    const { results } = matches[0];
    const plan = planCampaign(results, 0, 5);
    expect(plan.selected.map((r) => r.creator.id)).toEqual(results.slice(0, 5).map((r) => r.creator.id));
    expect(plan.remainingBudgetINR).toBe(-plan.totalCostINR);
  });

  it("ignores excluded results and duplicates", () => {
    const [a, b, c] = distinctCityCreators(3);
    const candidates = [
      fakeResult(a, 99, 1_000, 90_000, { excludedReason: "Not on Moj" }),
      fakeResult(b, 80, 1_000, 10_000),
      fakeResult(b, 80, 1_000, 10_000),
      fakeResult(c, 70, 1_000, 10_000),
    ];
    const plan = planCampaign(candidates, 50_000, 3);
    expect(plan.selected.map((r) => r.creator.id)).toEqual([b.id, c.id]);
    expect(plan.notes.some((note) => note.startsWith("Left out 2 creators"))).toBe(true);
  });

  it("handles empty input, zero creators and budgets too small for anyone", () => {
    expect(planCampaign([], 100_000, 5)).toMatchObject({ selected: [], totalCostINR: 0, remainingBudgetINR: 100_000 });
    expect(planCampaign([], 100_000, 5).notes[0]).toBe("No matching creators to plan with.");
    expect(planCampaign(matches[0].results, 100_000, 0).selected).toEqual([]);

    const tiny = planCampaign(matches[0].results, 400, 5);
    expect(tiny.selected).toEqual([]);
    expect(tiny.totalCostINR).toBe(0);
    expect(tiny.notes.some((note) => /^No eligible creator fits within ₹400: the lowest fee is ₹/.test(note))).toBe(true);
  });

  it("is deterministic and independent of input order", () => {
    const { sample, results } = matches[1];
    const first = planCampaign(results, sample.brief.budgetINR, sample.brief.creatorsWanted);
    const again = planCampaign(results, sample.brief.budgetINR, sample.brief.creatorsWanted);
    const reversed = planCampaign([...results].reverse(), sample.brief.budgetINR, sample.brief.creatorsWanted);
    expect(again).toEqual(first);
    expect(reversed.selected.map((r) => r.creator.id)).toEqual(first.selected.map((r) => r.creator.id));
  });
});
