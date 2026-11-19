// The authenticity proxy: a field the Creator model needs that no free source reports.
//
// Rate cards used to live here too, priced at display-media CPMs. That model put 57 of 60 real
// creators below their own tier's market floor and has been replaced by lib/pricing.ts, which
// separates what a creator asks from what their reach is worth.
import type { ChannelMetrics } from "./metrics";

export interface AuthenticityEstimate {
  score: number;
  suspiciousFollowerPct: number;
  flags: string[];
}

/**
 * A reach-consistency proxy, not an audit. Vendors like HypeAuditor score authenticity by inspecting
 * individual followers, which no free API exposes. What public stats do show is whether a channel's
 * views, subscribers and comments move together the way a real audience's do, which catches the
 * crudest inflation and nothing subtler. Treat a high score as "no visible anomaly", not as proof.
 */
export function estimateAuthenticity(
  metrics: ChannelMetrics,
  subscriberCount: number,
  commentToLikeRatio: number | null,
): AuthenticityEstimate {
  const flags: string[] = [];
  let score = 82; // Start mid-high: absence of evidence is not evidence of fraud.

  // Views far below subscribers suggests bought or long-dead subscribers.
  const viewsPerSub = subscriberCount > 0 ? metrics.avgViews / subscriberCount : 0;
  if (subscriberCount >= 10_000) {
    if (viewsPerSub < 0.01) {
      score -= 30;
      flags.push("Median views are under 1% of subscribers");
    } else if (viewsPerSub < 0.03) {
      score -= 14;
      flags.push("Median views are low relative to subscribers");
    } else if (viewsPerSub > 0.25) {
      score += 6;
    }
  }

  if (metrics.engagementRate < 0.5 && !metrics.likesHidden) {
    score -= 16;
    flags.push("Engagement rate under 0.5%");
  }

  // Real audiences comment at a fairly steady fraction of likes. A near-zero ratio on a channel with
  // plenty of likes is a classic sign of purchased engagement.
  if (commentToLikeRatio !== null && commentToLikeRatio < 0.002) {
    score -= 12;
    flags.push("Almost no comments relative to likes");
  }

  if (metrics.sampleSize < 5) {
    score -= 8;
    flags.push(`Only ${metrics.sampleSize} recent video${metrics.sampleSize === 1 ? "" : "s"} to judge from`);
  }

  if (metrics.likesHidden) {
    flags.push("Channel hides likes, so engagement counts comments only");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  // Expressed as the share of the audience the score implies, so the UI has a number to show. It is
  // a restatement of the score, not a separate measurement.
  const suspiciousFollowerPct = Number(Math.max(0, (100 - score) * 0.45).toFixed(1));

  return { score, suspiciousFollowerPct, flags };
}
