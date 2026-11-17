import { describe, expect, it } from "vitest";
import { engagementMultiplier, estimateAuthenticity, estimateRates } from "./estimate";
import type { ChannelMetrics } from "./metrics";

function metrics(over: Partial<ChannelMetrics> = {}): ChannelMetrics {
  return { avgViews: 50_000, engagementRate: 3.5, postsPerMonth: 6, sampleSize: 12, likesHidden: false, ...over };
}

describe("estimateRates", () => {
  it("prices off measured views, so more reach costs more", () => {
    const small = estimateRates(metrics({ avgViews: 10_000 }), "micro");
    const large = estimateRates(metrics({ avgViews: 100_000 }), "micro");
    expect(large.reel).toBeGreaterThan(small.reel);
    expect(large.reel / small.reel).toBeCloseTo(10, 0);
  });

  it("charges a lower CPM as creators get bigger", () => {
    const perThousand = (tier: "nano" | "mega") => estimateRates(metrics({ avgViews: 100_000 }), tier).reel / 100;
    expect(perThousand("nano")).toBeGreaterThan(perThousand("mega"));
  });

  it("returns round rupee figures and no sub-₹500 fee", () => {
    const rates = estimateRates(metrics({ avgViews: 200 }), "nano");
    for (const fee of [rates.reel, rates.story, rates.post]) {
      expect(fee % 500).toBe(0);
      expect(fee).toBeGreaterThanOrEqual(500);
    }
  });

  it("leaves video null for a creator with no YouTube channel", () => {
    expect(estimateRates(metrics(), "mid", false).video).toBeNull();
  });

  it("pays a premium for engagement and discounts a flat audience", () => {
    expect(engagementMultiplier(9)).toBeGreaterThan(engagementMultiplier(3.5));
    expect(engagementMultiplier(0.4)).toBeLessThan(1);
  });
});

describe("estimateAuthenticity", () => {
  it("leaves a healthy channel unflagged", () => {
    const result = estimateAuthenticity(metrics({ avgViews: 30_000 }), 200_000, 0.1);
    expect(result.flags).toEqual([]);
    expect(result.score).toBeGreaterThanOrEqual(80);
  });

  it("penalises views far below subscribers", () => {
    const result = estimateAuthenticity(metrics({ avgViews: 500 }), 500_000, 0.1);
    expect(result.score).toBeLessThan(60);
    expect(result.flags.join(" ")).toContain("under 1% of subscribers");
  });

  it("penalises an audience that never comments", () => {
    const result = estimateAuthenticity(metrics({ avgViews: 30_000 }), 200_000, 0.0001);
    expect(result.flags.join(" ")).toContain("Almost no comments");
  });

  it("says so when there is too little to judge", () => {
    const result = estimateAuthenticity(metrics({ avgViews: 30_000, sampleSize: 2 }), 200_000, 0.1);
    expect(result.flags.join(" ")).toContain("2 recent videos");
  });

  it("notes hidden likes rather than treating them as low engagement", () => {
    const result = estimateAuthenticity(metrics({ avgViews: 30_000, engagementRate: 0.3, likesHidden: true }), 200_000, null);
    expect(result.flags.join(" ")).toContain("hides likes");
    expect(result.flags.join(" ")).not.toContain("under 0.5%");
  });

  it("keeps the score inside 0-100", () => {
    const worst = estimateAuthenticity(metrics({ avgViews: 1, engagementRate: 0, sampleSize: 1 }), 1_000_000, 0);
    expect(worst.score).toBeGreaterThanOrEqual(0);
    expect(worst.suspiciousFollowerPct).toBeLessThanOrEqual(100);
  });
});
