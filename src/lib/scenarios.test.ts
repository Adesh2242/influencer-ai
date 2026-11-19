import { describe, expect, it } from "vitest";
import { comparePlans } from "./scenarios";
import type { Creator, CreatorTier, LanguageCode } from "../types";

let seq = 0;
function creator(over: {
  tier: CreatorTier;
  languages: LanguageCode[];
  followers: number;
  avgViews: number;
  engagementRate?: number;
  cityId?: string;
}): Creator {
  seq++;
  return {
    id: `c${seq}`,
    name: `Creator ${seq}`,
    handle: `c${seq}`,
    bio: "",
    homeCityId: over.cityId ?? "pune",
    languages: over.languages,
    niches: ["food"],
    topics: ["food"],
    platforms: [
      {
        platform: "youtube",
        handle: `c${seq}`,
        followers: over.followers,
        avgViews: over.avgViews,
        engagementRate: over.engagementRate ?? 3,
        postsPerMonth: 8,
      },
    ],
    tier: over.tier,
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

/** A roster shaped like the real one: Mumbai-heavy and national, with a Marathi minority. */
const roster = [
  ...Array.from({ length: 6 }, () => creator({ tier: "mega", languages: ["en"], followers: 2_000_000, avgViews: 200_000, cityId: "mumbai" })),
  ...Array.from({ length: 8 }, () => creator({ tier: "mid", languages: ["hi"], followers: 200_000, avgViews: 50_000, cityId: "mumbai" })),
  ...Array.from({ length: 10 }, () => creator({ tier: "mid", languages: ["mr", "hi"], followers: 150_000, avgViews: 40_000, cityId: "nashik" })),
  ...Array.from({ length: 14 }, () => creator({ tier: "micro", languages: ["mr", "hi"], followers: 40_000, avgViews: 15_000, engagementRate: 6, cityId: "nagpur" })),
  ...Array.from({ length: 10 }, () => creator({ tier: "nano", languages: ["mr"], followers: 5_000, avgViews: 2_500, engagementRate: 8, cityId: "kolhapur" })),
];

const TEN_LAKH = 10_00_000;
const NOW = new Date("2026-11-19T00:00:00Z");

describe("comparePlans", () => {
  it("offers four distinct ways to spend the same money", () => {
    const comparison = comparePlans(roster, TEN_LAKH, { now: NOW });
    expect(comparison.scenarios).toHaveLength(4);
    expect(new Set(comparison.scenarios.map((s) => s.id)).size).toBe(4);
    for (const scenario of comparison.scenarios) {
      expect(scenario.plan.spend).toBeLessThanOrEqual(TEN_LAKH);
      expect(scenario.thesis.length).toBeGreaterThan(30);
      expect(scenario.highlights.length).toBeGreaterThan(3);
    }
  });

  it("puts far more of the budget in-state under Maharashtra-first", () => {
    const comparison = comparePlans(roster, TEN_LAKH, { now: NOW });
    const mh = comparison.scenarios.find((s) => s.id === "maharashtra")!;
    const reach = comparison.scenarios.find((s) => s.id === "reach")!;
    expect(mh.plan.regional.localShare).toBeGreaterThan(reach.plan.regional.localShare);
  });

  it("books only Marathi creators under Maharashtra-first", () => {
    const mh = comparePlans(roster, TEN_LAKH, { now: NOW }).scenarios.find((s) => s.id === "maharashtra")!;
    expect(mh.plan.creators.length).toBeGreaterThan(0);
    for (const entry of mh.plan.creators) {
      expect(entry.creator.languages).toContain("mr");
    }
  });

  it("names the trade-offs rather than listing every number", () => {
    const comparison = comparePlans(roster, TEN_LAKH, { now: NOW });
    expect(comparison.tradeOffs.length).toBeGreaterThan(0);
    for (const tradeOff of comparison.tradeOffs) {
      expect(tradeOff).toMatch(/[.!]$/);
    }
  });

  it("follows a stated goal when it costs little reach", () => {
    const comparison = comparePlans(roster, TEN_LAKH, { now: NOW, clientGoal: "conversions" });
    // Either it recommends the matching scenario, or it explains what following it would cost.
    if (comparison.recommendation.scenarioId !== "conversion") {
      expect(comparison.recommendation.because).toContain("fewer people");
    } else {
      expect(comparison.recommendation.because).toContain("fits what you said");
    }
  });

  it("gives every booked creator a reason it is there", () => {
    const comparison = comparePlans(roster, TEN_LAKH, { now: NOW });
    const plan = comparison.scenarios.find((s) => s.id === comparison.recommendation.scenarioId)!.plan;
    expect(plan.creators.length).toBeGreaterThan(0);
    for (const entry of plan.creators) {
      expect(entry.rationale.length, `${entry.creator.name} has no rationale`).toBeGreaterThan(0);
    }
  });

  it("says plainly when the roster is too thin to compare", () => {
    const comparison = comparePlans([roster[0]], TEN_LAKH, { now: NOW });
    expect(comparison.recommendation.because).toContain("Widen the brief");
  });

  it("copes with no budget without throwing", () => {
    const comparison = comparePlans(roster, 0, { now: NOW });
    for (const scenario of comparison.scenarios) {
      expect(scenario.plan.creators).toHaveLength(0);
    }
  });

  it("can be narrowed to a subset of options", () => {
    const comparison = comparePlans(roster, TEN_LAKH, { now: NOW, only: ["reach", "maharashtra"] });
    expect(comparison.scenarios.map((s) => s.id)).toEqual(["reach", "maharashtra"]);
  });
});

describe("risk flags in a plan", () => {
  it("warns about a creator whose audience is mostly outside the state", () => {
    const national = creator({ tier: "mega", languages: ["en"], followers: 3_000_000, avgViews: 300_000, cityId: "mumbai" });
    const plan = comparePlans([national, ...roster], TEN_LAKH, { now: NOW, only: ["reach"] }).scenarios[0].plan;
    const booked = plan.creators.find((e) => e.creator.id === national.id);
    if (booked) {
      expect(booked.risks.join(" ")).toContain("Maharashtra");
    }
  });
});

/** Regressions from a max-level review. Each of these shipped. */
describe("review regressions", () => {
  it("makes reach-led a genuinely different plan from balanced", () => {
    // At a budget that binds. Above the roster's total value every strategy buys everyone, and
    // converging there is correct — the point is that they differ when the money runs out.
    const comparison = comparePlans(roster, 5_00_000, { now: NOW });
    const reach = comparison.scenarios.find((s) => s.id === "reach")!.plan;
    const balanced = comparison.scenarios.find((s) => s.id === "balanced")!.plan;
    // Ranked on views-per-rupee these were byte-identical, because fee is proportional to views.
    const same =
      reach.creators.length === balanced.creators.length &&
      reach.regional.localUniqueReach === balanced.regional.localUniqueReach &&
      reach.regional.localCPM === balanced.regional.localCPM;
    expect(same).toBe(false);
  });

  it("never recommends a plan that reaches nobody in the state at a quoted ₹0", () => {
    const comparison = comparePlans(roster, 50_00_000, { now: NOW });
    expect(comparison.recommendation.because).not.toContain("₹0 ");
    const recommended = comparison.scenarios.find((s) => s.id === comparison.recommendation.scenarioId)!;
    expect(recommended.plan.regional.localImpressions).toBeGreaterThan(0);
  });
});
