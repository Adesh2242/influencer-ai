import { describe, expect, it } from "vitest";
import { estimateAuthenticity } from "./estimate";
import type { ChannelMetrics } from "./metrics";

function metrics(over: Partial<ChannelMetrics> = {}): ChannelMetrics {
  return { avgViews: 50_000, engagementRate: 3.5, postsPerMonth: 6, sampleSize: 12, likesHidden: false, ...over };
}

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
