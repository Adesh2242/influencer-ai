import { describe, expect, it } from "vitest";
import { computeMetrics, median, recentVideos } from "./metrics";
import type { YouTubeVideo } from "./youtube";

const NOW = Date.parse("2026-11-17T00:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function video(daysAgo: number, viewCount: number, likeCount: number | null, commentCount: number | null): YouTubeVideo {
  return {
    id: `v${daysAgo}-${viewCount}`,
    title: `Video ${daysAgo}`,
    publishedAt: new Date(NOW - daysAgo * DAY).toISOString(),
    viewCount,
    likeCount,
    commentCount,
  };
}

describe("median", () => {
  it("handles odd and even counts and empty input", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});

describe("computeMetrics", () => {
  it("is not dragged up by a single viral video", () => {
    const steady = [10, 20, 30, 40, 50].map((d) => video(d, 10_000, 500, 50));
    const withViral = [...steady, video(5, 5_000_000, 200_000, 9_000)];

    expect(computeMetrics(steady, NOW).avgViews).toBe(10_000);
    // A mean would be roughly 840,000 here; the median barely moves.
    expect(computeMetrics(withViral, NOW).avgViews).toBe(10_000);
  });

  it("computes engagement as likes plus comments over views", () => {
    const videos = [10, 20, 30].map((d) => video(d, 10_000, 400, 100));
    expect(computeMetrics(videos, NOW).engagementRate).toBe(5);
  });

  it("derives cadence from the span the sample actually covers", () => {
    const monthly = [0, 30, 60].map((d) => video(d, 1_000, 10, 1));
    expect(computeMetrics(monthly, NOW).postsPerMonth).toBeCloseTo(1.5, 1);

    const weekly = [0, 7, 14, 21, 28].map((d) => video(d, 1_000, 10, 1));
    expect(computeMetrics(weekly, NOW).postsPerMonth).toBeGreaterThan(4);
  });

  it("flags a channel that hides likes and still scores its comments", () => {
    const videos = [10, 20, 30].map((d) => video(d, 10_000, null, 200));
    const metrics = computeMetrics(videos, NOW);
    expect(metrics.likesHidden).toBe(true);
    expect(metrics.engagementRate).toBe(2);
  });

  it("ignores videos with no views and copes with an empty channel", () => {
    expect(computeMetrics([video(1, 0, 0, 0)], NOW).sampleSize).toBe(0);
    expect(computeMetrics([], NOW)).toMatchObject({ avgViews: 0, engagementRate: 0, sampleSize: 0 });
  });
});

describe("recentVideos", () => {
  it("keeps only videos inside the window", () => {
    const videos = [video(10, 100, 1, 1), video(200, 100, 1, 1)];
    expect(recentVideos(videos, 90, NOW)).toHaveLength(1);
  });
});
