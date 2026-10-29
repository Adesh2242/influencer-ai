import { describe, expect, it } from "vitest";
import type { Creator } from "@/types";
import { computeCoverage } from "./coverage";

function makeCreator(overrides: Partial<Creator>): Creator {
  return {
    id: "test",
    name: "Test Creator",
    handle: "test.creator",
    bio: "",
    homeCityId: "mumbai",
    languages: ["hi"],
    niches: ["food"],
    topics: [],
    platforms: [],
    tier: "micro",
    audience: {
      gender: { female: 0.5, male: 0.5 },
      age: { "13-17": 0, "18-24": 0.5, "25-34": 0.5, "35-44": 0, "45+": 0 },
      tiers: { 1: 1, 2: 0, 3: 0 },
      regions: { north: 0, south: 0, east: 0, west: 1, central: 0, northeast: 0 },
      topCities: [],
      languages: [],
    },
    authenticity: { score: 90, suspiciousFollowerPct: 5, flags: [] },
    brandSafety: { score: 90, flags: [] },
    rates: { reel: 10_000, story: 4_000, post: 6_000, video: null },
    collaborations: [],
    responseRate: 0.8,
    avgTurnaroundDays: 3,
    verified: false,
    gstRegistered: false,
    joinedMonthsAgo: 6,
    avatarHue: 200,
    ...overrides,
  };
}

describe("computeCoverage", () => {
  it("returns zeros for an empty dataset", () => {
    const coverage = computeCoverage([]);
    expect(coverage).toMatchObject({ creators: 0, languages: 0, cities: 0, nonMetroCities: 0, niches: 0 });
    expect(Object.values(coverage.creatorsByLanguage).every((count) => count === 0)).toBe(true);
  });

  it("counts distinct languages, known home cities and niches", () => {
    const coverage = computeCoverage([
      makeCreator({ id: "a", homeCityId: "mumbai", languages: ["hi", "en"], niches: ["food", "travel"] }),
      makeCreator({ id: "b", homeCityId: "coimbatore", languages: ["ta", "en"], niches: ["food"] }),
      makeCreator({ id: "c", homeCityId: "coimbatore", languages: ["ta", "ta"], niches: ["tech"] }),
      makeCreator({ id: "d", homeCityId: "not-a-city", languages: ["as"], niches: ["devotional"] }),
    ]);

    expect(coverage.creators).toBe(4);
    expect(coverage.languages).toBe(4);
    expect(coverage.cities).toBe(2);
    expect(coverage.nonMetroCities).toBe(1);
    expect(coverage.niches).toBe(4);
    expect(coverage.creatorsByLanguage.ta).toBe(2);
    expect(coverage.creatorsByLanguage.en).toBe(2);
    expect(coverage.creatorsByLanguage.bn).toBe(0);
  });
});
