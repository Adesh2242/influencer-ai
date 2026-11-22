import { describe, expect, it } from "vitest";
import { CREATOR_TIERS } from "../data/taxonomy";
import { authenticityMultiplier, engagementMultiplier, estimateRate, likelyAsk, rateCardFor, sellableReach } from "./pricing";
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
    authenticity: { score: over.authenticity ?? 85, dormantSubscriberPct: 7, flags: [] },
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
    expect(workings.map((w) => w.label)).toEqual(["Sellable reach", "Engagement", "Authenticity"]);
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

/** Regressions from a max-level review. Each of these shipped. */
describe("review regressions", () => {
  it("prices an unknown deliverable as a reel rather than NaN", () => {
    const c = creator({ tier: "mid", followers: 200_000, avgViews: 60_000 });
    const rate = estimateRate(c, "carousel" as never);
    expect(Number.isFinite(rate.fairValue)).toBe(true);
    expect(Number.isFinite(rate.likelyAsk)).toBe(true);
    // The NaN version reported a confident "overpriced" verdict with an Infinity gap.
    expect(rate.negotiationNote).not.toContain("NaN");
    expect(rate.fairValue).toBe(estimateRate(c, "reel").fairValue);
  });

  it("prices a video off the platform that carries video, not platforms[0]", () => {
    const c = creator({ tier: "micro", followers: 50_000, avgViews: 20_000 });
    c.platforms = [
      { platform: "instagram", handle: "ig", followers: 50_000, avgViews: 20_000, engagementRate: 3, postsPerMonth: 8 },
      { platform: "youtube", handle: "yt", followers: 2_000, avgViews: 300, engagementRate: 3, postsPerMonth: 4 },
    ];
    const card = rateCardFor(c);
    // Priced off 20,000 Instagram views, the integration came out ~90x too high.
    expect(card.video!).toBeLessThan(card.reel);
  });

  it("keeps the rate card in order for the small channels the ingestion collects", () => {
    // A single flat ₹500 floor collapsed post and story to the same number here.
    for (const [followers, views] of [[1_000, 1_000], [60_000, 1_500], [500, 200]] as const) {
      const c = creator({ tier: followers > 10_000 ? "micro" : "nano", followers, avgViews: views });
      const card = rateCardFor(c);
      expect(card.video!, `video vs reel at ${views} views`).toBeGreaterThan(card.reel);
      expect(card.reel, `reel vs post at ${views} views`).toBeGreaterThan(card.post);
      expect(card.post, `post vs story at ${views} views`).toBeGreaterThan(card.story);
    }
  });
});

/**
 * A live case from the database: "Marathi Djs of Pune" — 28,800 subscribers, two videos, both from
 * 2021, one of them a 27-million-view hit. The median of two was 13.5M and the card quoted ₹83 lakh
 * for a reel.
 */
describe("reach that cannot be sold", () => {
  it("prices on reach a creator could commit to, not on one viral video", () => {
    const viral = creator({ tier: "micro", followers: 28_800, avgViews: 13_493_107, engagementRate: 1.1 });
    const rate = estimateRate(viral, "reel");
    // The old model returned ₹83,00,000 here.
    expect(rate.fairValue).toBeLessThan(1_00_000);
    expect(rate.workings[0].detail).toContain("algorithmic");
  });

  it("never values a creator at more than three times what their size would ask", () => {
    const viral = creator({ tier: "micro", followers: 28_800, avgViews: 13_493_107, engagementRate: 1.1 });
    const rate = estimateRate(viral, "reel");
    expect(rate.fairValue).toBeLessThanOrEqual(rate.likelyAsk * 3);
    expect(rate.workings.some((w) => w.label === "Capped")).toBe(true);
  });

  it("leaves a normal creator untouched, because their views are within their audience", () => {
    const normal = creator({ tier: "mid", followers: 300_000, avgViews: 90_000 });
    expect(sellableReach(90_000, 300_000)).toBe(90_000);
    expect(estimateRate(normal, "reel").workings.some((w) => w.label === "Capped")).toBe(false);
  });

  it("discounts a live channel whose reach is mostly algorithmic", () => {
    // 310K subscribers, 1.64M median views: real Shorts performance, but not promised reach.
    expect(sellableReach(1_640_000, 310_000)).toBeLessThan(1_640_000);
    expect(sellableReach(1_640_000, 310_000)).toBeGreaterThan(310_000 * 0.5);
  });
});
