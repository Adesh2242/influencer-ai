import { describe, expect, it } from "vitest";
import { CREATOR_TIERS } from "../data/taxonomy";
import { authenticityMultiplier, engagementMultiplier, estimateRate, likelyAsk, rateCardFor } from "./pricing";
import type { Creator, CreatorTier } from "../types";

function creator(over: {
  tier: CreatorTier;
  followers: number;
  avgViews: number;
  engagementRate?: number;
  authenticity?: number;
}): Creator {
  return {
    id: "c1",
    name: "Test Creator",
    handle: "test",
    bio: "",
    homeCityId: "pune",
    languages: ["mr"],
    niches: ["food"],
    topics: ["food"],
    platforms: [
      {
        platform: "youtube",
        handle: "test",
        followers: over.followers,
        avgViews: over.avgViews,
        engagementRate: over.engagementRate ?? CREATOR_TIERS[over.tier].engagementBenchmark,
        postsPerMonth: 8,
      },
    ],
    tier: over.tier,
    audience: {} as Creator["audience"],
    authenticity: { score: over.authenticity ?? 85, suspiciousFollowerPct: 7, flags: [] },
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

/**
 * The bug this file exists for: the old model priced 57 of 60 real creators below their own tier's
 * market floor, a 5.26M-subscriber channel at ₹14,000 against a ₹6-25 lakh range.
 */
describe("rates against the market ranges", () => {
  it("prices a healthy creator inside their tier's range", () => {
    // A mid-tier creator delivering views in proportion to followers.
    const c = creator({ tier: "mid", followers: 300_000, avgViews: 90_000 });
    const [low, high] = CREATOR_TIERS.mid.reelRate;
    const { fairValue } = estimateRate(c, "reel");
    expect(fairValue).toBeGreaterThanOrEqual(low * 0.6);
    expect(fairValue).toBeLessThanOrEqual(high * 1.2);
  });

  it("no longer puts a large healthy creator at a nano price", () => {
    const c = creator({ tier: "mega", followers: 5_260_000, avgViews: 1_200_000, engagementRate: 2 });
    // The old model returned ₹14,000 here.
    expect(estimateRate(c, "reel").fairValue).toBeGreaterThan(5_00_000);
  });

  it("charges more for a long-form integration than a story", () => {
    const c = creator({ tier: "micro", followers: 50_000, avgViews: 20_000 });
    const card = rateCardFor(c);
    expect(card.video!).toBeGreaterThan(card.reel);
    expect(card.reel).toBeGreaterThan(card.post);
    expect(card.post).toBeGreaterThan(card.story);
  });

  it("returns round rupee figures", () => {
    const c = creator({ tier: "micro", followers: 40_000, avgViews: 18_000 });
    expect(estimateRate(c, "reel").fairValue % 500).toBe(0);
  });
});

describe("ask versus worth", () => {
  it("flags a creator whose followers far outrun their views", () => {
    // Real case: 2.01M subscribers, 3,510 median views.
    const inflated = creator({ tier: "mega", followers: 2_010_000, avgViews: 3_510, engagementRate: 0.9, authenticity: 40 });
    const rate = estimateRate(inflated, "reel");
    expect(rate.verdict).toBe("overpriced");
    expect(rate.gap).toBeGreaterThan(10);
    expect(rate.negotiationNote).toContain("walk");
  });

  it("calls it fair when the ask and the reach agree", () => {
    const solid = creator({ tier: "macro", followers: 768_000, avgViews: 409_431, engagementRate: 1.6 });
    expect(estimateRate(solid, "reel").verdict).toBe("fair");
  });

  it("spots a creator delivering more than their tier suggests", () => {
    const bargain = creator({ tier: "micro", followers: 12_000, avgViews: 90_000, engagementRate: 6 });
    const rate = estimateRate(bargain, "reel");
    expect(rate.verdict).toBe("underpriced");
    expect(rate.fairValue).toBeGreaterThan(rate.likelyAsk);
  });

  it("shows its arithmetic so a buyer can argue with it", () => {
    const c = creator({ tier: "mid", followers: 200_000, avgViews: 60_000 });
    const { workings } = estimateRate(c, "reel");
    expect(workings.map((w) => w.label)).toEqual(["Delivered reach", "Engagement", "Authenticity"]);
    expect(workings[0].detail).toContain("60,000 median views");
    // Each step carries the running total forward.
    expect(workings.at(-1)!.value).toBe(estimateRate(c, "reel").fairValue);
  });

  it("quotes a bigger ask for a creator higher up the same tier band", () => {
    expect(likelyAsk(900_000, "macro")).toBeGreaterThan(likelyAsk(520_000, "macro"));
  });
});

describe("multipliers", () => {
  it("rewards engagement above the tier benchmark and penalises below", () => {
    expect(engagementMultiplier(6.4, "micro")).toBeGreaterThan(1);
    expect(engagementMultiplier(0.5, "micro")).toBeLessThan(1);
  });

  it("never lets engagement triple or erase a fee", () => {
    expect(engagementMultiplier(100, "micro")).toBeLessThanOrEqual(1.5);
    expect(engagementMultiplier(0, "micro")).toBeGreaterThanOrEqual(0.7);
  });

  it("discounts a creator whose numbers look inflated", () => {
    expect(authenticityMultiplier(90)).toBe(1);
    expect(authenticityMultiplier(40)).toBeLessThan(0.7);
  });
});
