// Turns raw video stats into the reach and engagement numbers the matching engine scores on.
// Everything here is arithmetic on figures YouTube actually reported: no modelling, no priors.
import type { YouTubeVideo } from "./youtube";

export interface ChannelMetrics {
  /** Median views per recent video. */
  avgViews: number;
  /** Percent, e.g. 3.4 means 3.4%. Median of per-video (likes + comments) / views. */
  engagementRate: number;
  postsPerMonth: number;
  /** How many videos the figures are based on. Below ~5 the medians are not worth much. */
  sampleSize: number;
  /** True when the channel hides likes, so engagement counts comments only and reads low. */
  likesHidden: boolean;
}

/**
 * Median rather than mean throughout. One video that happens to go viral drags a mean far above
 * what a brand can expect from the next post, and creators with a single breakout video are exactly
 * the ones a shortlist should not over-rank.
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Videos published in the last `days`, so a dormant channel is not scored on its old peak. */
export function recentVideos(videos: YouTubeVideo[], days: number, now = Date.now()): YouTubeVideo[] {
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return videos.filter((video) => {
    const at = Date.parse(video.publishedAt);
    return Number.isFinite(at) && at >= cutoff;
  });
}

export function computeMetrics(videos: YouTubeVideo[], now = Date.now()): ChannelMetrics {
  const usable = videos.filter((video) => video.viewCount > 0);
  if (usable.length === 0) {
    return { avgViews: 0, engagementRate: 0, postsPerMonth: 0, sampleSize: 0, likesHidden: false };
  }

  const likesHidden = usable.every((video) => video.likeCount === null);

  const engagementRates = usable.map((video) => {
    const interactions = (video.likeCount ?? 0) + (video.commentCount ?? 0);
    return (interactions / video.viewCount) * 100;
  });

  // Cadence over the window the sample actually spans, not a fixed assumption. A channel with 25
  // uploads across 2 months posts far more often than one with 25 across 3 years.
  const times = usable.map((video) => Date.parse(video.publishedAt)).filter(Number.isFinite);
  const oldest = Math.min(...times);
  const spanMonths = Math.max(0.5, (now - oldest) / (30 * 24 * 60 * 60 * 1000));

  return {
    avgViews: Math.round(median(usable.map((video) => video.viewCount))),
    engagementRate: Number(median(engagementRates).toFixed(2)),
    postsPerMonth: Number((usable.length / spanMonths).toFixed(1)),
    sampleSize: usable.length,
    likesHidden,
  };
}
