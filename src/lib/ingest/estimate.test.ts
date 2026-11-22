import { describe, expect, it } from "vitest";
import { authenticityBand, BAND_LABEL, estimateAuthenticity } from "./estimate";
import type { ChannelMetrics } from "./metrics";

function metrics(over: Partial<ChannelMetrics> = {}): ChannelMetrics {
  return {
    avgViews: 50_000,
    engagementRate: 3.5,
    postsPerMonth: 6,
    sampleSize: 12,
    likesHidden: false,
    daysSinceLastUpload: 7,
    viewSpread: 1.4,
    ...over,
  };
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
    expect(worst.dormantSubscriberPct).toBeLessThanOrEqual(100);
  });
});

/**
 * The score was labelled /100 but could only reach 88, and the "suspicious followers" figure was
 * derived from that 12-point headroom — so a spotless channel was publicly credited with 5% fake
 * followers, about a real named person, on no evidence at all.
 */
describe("score calibration", () => {
  const clean = metrics({ avgViews: 60_000, engagementRate: 4, postsPerMonth: 8, sampleSize: 20 });

  it("lets a clean channel with strong reach reach the top of the scale", () => {
    const result = estimateAuthenticity({ ...clean, avgViews: 400_000 }, 1_000_000, 0.12);
    expect(result.flags).toEqual([]);
    expect(result.score).toBe(100);
  });

  it("accuses a clean channel of nothing", () => {
    const result = estimateAuthenticity(clean, 200_000, 0.1);
    expect(result.dormantSubscriberPct).toBe(0);
    expect(result.flags).toEqual([]);
  });

  it("spans a wide range, so the number discriminates", () => {
    const best = estimateAuthenticity({ ...clean, avgViews: 400_000 }, 1_000_000, 0.12).score;
    const worst = estimateAuthenticity(
      metrics({ avgViews: 1_000, engagementRate: 0.1, postsPerMonth: 1, sampleSize: 2 }),
      2_000_000,
      0,
    ).score;
    expect(best - worst).toBeGreaterThan(70);
  });

  it("reports dormant subscribers only where the shortfall is real, and as what it is", () => {
    // 2.01M subscribers, 3,510 median views.
    const hollow = estimateAuthenticity(
      metrics({ avgViews: 3_510, engagementRate: 0.9, postsPerMonth: 5, sampleSize: 20 }),
      2_010_000,
      0.0001,
    );
    expect(hollow.dormantSubscriberPct).toBeGreaterThan(95);
    expect(hollow.score).toBeLessThan(50);
  });

  it("bands the score, because it does not carry two digits of precision", () => {
    expect(authenticityBand(95)).toBe("strong");
    expect(authenticityBand(75)).toBe("adequate");
    expect(authenticityBand(55)).toBe("weak");
    expect(authenticityBand(35)).toBe("poor");
    expect(BAND_LABEL.poor).toContain("inflated");
  });
});
