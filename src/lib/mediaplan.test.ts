import { describe, expect, it } from "vitest";
import { buildMediaPlan, DEFAULT_UNIVERSE, GOAL_MIX, inrCompact, uniqueReachOf } from "./mediaplan";
import { CREATOR_TIER_LIST } from "../data/taxonomy";
import type { Creator, CreatorTier } from "../types";

let seq = 0;
function creator(tier: CreatorTier, followers: number, avgViews: number, cityId = "pune"): Creator {
  seq++;
  return {
    id: `c${seq}`,
    name: `Creator ${seq}`,
    handle: `c${seq}`,
    bio: "",
    homeCityId: cityId,
    languages: ["mr"],
    niches: ["food"],
    topics: ["food"],
    platforms: [{ platform: "youtube", handle: `c${seq}`, followers, avgViews, engagementRate: 3, postsPerMonth: 8 }],
    tier,
    audience: {} as Creator["audience"],
    authenticity: { score: 85, suspiciousFollowerPct: 7, flags: [] },
    brandSafety: { score: 80, flags: [] },
    rates: { reel: 0, story: 0, post: 0, video: null },
    collaborations: [],
    responseRate: 0.5,
    avgTurnaroundDays: 7,
    verified: false,
    gstRegistered: false,
    joinedMonthsAgo: 24,
    avatarHue: 10,
  };
}

const roster = [
  ...Array.from({ length: 8 }, () => creator("mega", 2_000_000, 400_000)),
  ...Array.from({ length: 8 }, () => creator("macro", 700_000, 200_000)),
  ...Array.from({ length: 12 }, () => creator("mid", 250_000, 70_000)),
  ...Array.from({ length: 20 }, () => creator("micro", 50_000, 20_000)),
  ...Array.from({ length: 20 }, () => creator("nano", 5_000, 2_500)),
];

describe("uniqueReachOf", () => {
  it("is less than the sum of views, because audiences overlap", () => {
    const views = [1_000_000, 1_000_000, 1_000_000];
    expect(uniqueReachOf(views)).toBeLessThan(3_000_000);
  });

  it("shows diminishing returns: each added creator buys less new reach", () => {
    const one = uniqueReachOf([5_000_000]);
    const two = uniqueReachOf([5_000_000, 5_000_000]);
    const three = uniqueReachOf([5_000_000, 5_000_000, 5_000_000]);
    expect(two - one).toBeGreaterThan(three - two);
  });

  it("never exceeds the universe", () => {
    const huge = Array.from({ length: 50 }, () => DEFAULT_UNIVERSE);
    expect(uniqueReachOf(huge)).toBeLessThanOrEqual(DEFAULT_UNIVERSE);
  });

  it("is zero for no creators", () => {
    expect(uniqueReachOf([])).toBe(0);
  });
});

describe("buildMediaPlan", () => {
  it("never spends more than the budget", () => {
    const plan = buildMediaPlan(roster, 50_00_000);
    expect(plan.spend).toBeLessThanOrEqual(plan.budget);
    expect(plan.unspent).toBe(plan.budget - plan.spend);
  });

  it("says plainly when the budget outruns the roster", () => {
    // ₹20 crore against a roster worth a fraction of it.
    const plan = buildMediaPlan(roster, 20_00_00_000);
    const critical = plan.insights.find((i) => i.severity === "critical");
    expect(critical?.headline).toContain("cannot be spent");
    expect(critical?.detail).toContain("Widen the brief");
  });

  it("weights a conversions campaign towards small creators and awareness towards large", () => {
    const budget = 80_00_000;
    const conversions = buildMediaPlan(roster, budget, { goal: "conversions" });
    const awareness = buildMediaPlan(roster, budget, { goal: "awareness" });

    const smallShare = (plan: typeof conversions) =>
      plan.mix.filter((m) => m.tier === "nano" || m.tier === "micro").reduce((s, m) => s + m.share, 0);

    expect(smallShare(conversions)).toBeGreaterThan(smallShare(awareness));
  });

  it("reports frequency as impressions over unique reach", () => {
    const plan = buildMediaPlan(roster, 1_00_00_000);
    expect(plan.reach.frequency).toBeCloseTo(plan.reach.impressions / plan.reach.uniqueReach, 1);
    expect(plan.reach.uniqueReach).toBeLessThanOrEqual(plan.reach.impressions);
  });

  it("warns when the plan is concentrated in one city", () => {
    const allPune = Array.from({ length: 10 }, () => creator("mid", 250_000, 70_000, "pune"));
    const plan = buildMediaPlan(allPune, 50_00_000);
    expect(plan.insights.some((i) => i.headline.includes("one city"))).toBe(true);
  });

  it("does not warn about concentration for a spread plan", () => {
    const spread = ["pune", "mumbai", "nagpur", "nashik", "kolhapur", "nanded"].flatMap((city) =>
      Array.from({ length: 2 }, () => creator("mid", 250_000, 70_000, city)),
    );
    const plan = buildMediaPlan(spread, 50_00_000);
    expect(plan.insights.some((i) => i.headline.includes("one city"))).toBe(false);
  });

  it("compares blended CPM against the category benchmark", () => {
    const plan = buildMediaPlan(roster, 50_00_000);
    const cpmInsight = plan.insights.find((i) => i.headline.includes("Blended CPM"));
    expect(cpmInsight).toBeDefined();
    expect(plan.efficiency.blendedCPM).toBeGreaterThan(0);
  });

  it("respects a creator cap", () => {
    const plan = buildMediaPlan(roster, 20_00_00_000, { maxCreators: 5 });
    expect(plan.creators).toHaveLength(5);
  });

  it("books nobody with no budget, and reports no reach", () => {
    const plan = buildMediaPlan(roster, 0);
    expect(plan.creators).toHaveLength(0);
    expect(plan.reach.uniqueReach).toBe(0);
    expect(plan.reach.frequency).toBe(0);
  });
});

describe("GOAL_MIX", () => {
  it("allocates all of the budget for every goal", () => {
    for (const [goal, mix] of Object.entries(GOAL_MIX)) {
      const total = CREATOR_TIER_LIST.reduce((sum, tier) => sum + (mix[tier] ?? 0), 0);
      expect(total, `${goal} mix does not sum to 1`).toBeCloseTo(1, 5);
    }
  });
});

describe("inrCompact", () => {
  it("writes Indian money the way Indian buyers read it", () => {
    expect(inrCompact(20_00_00_000)).toBe("₹20 Cr");
    expect(inrCompact(4_50_000)).toBe("₹4.5 L");
    expect(inrCompact(25_000)).toBe("₹25K");
  });
});
