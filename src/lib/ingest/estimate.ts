// The authenticity proxy: a field the Creator model needs that no free source reports.
//
// Rate cards used to live here too, priced at display-media CPMs. That model put 57 of 60 real
// creators below their own tier's market floor and has been replaced by lib/pricing.ts, which
// separates what a creator asks from what their reach is worth.
import type { ChannelMetrics } from "./metrics";

export interface AuthenticityEstimate {
  /** 0-100, and the full range is reachable: a clean channel with strong reach scores 100. */
  score: number;
  /**
   * Share of subscribers who did not watch a typical recent video, as a percentage. This is
   * arithmetic on two public numbers, not an estimate of fake followers — inactive, lapsed and
   * inauthentic subscribers are indistinguishable from here. Zero when there is no shortfall
   * worth reporting.
   */
  dormantSubscriberPct: number;
  flags: string[];
}

/** Coarse bands for display, because the score does not carry two digits of precision. */
export type AuthenticityBand = "strong" | "adequate" | "weak" | "poor";

export function authenticityBand(score: number): AuthenticityBand {
  if (score >= 85) return "strong";
  if (score >= 70) return "adequate";
  if (score >= 50) return "weak";
  return "poor";
}

export const BAND_LABEL: Record<AuthenticityBand, string> = {
  strong: "No anomalies found",
  adequate: "Mostly consistent",
  weak: "Worth checking",
  poor: "Reach looks inflated",
};

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
  // A clean channel with an adequate sample starts here and can reach 100 on strong reach. The
  // previous base of 82 with a +6 ceiling meant a flawless creator could never score above 88 on
  // a scale labelled /100 — and the derived "suspicious followers" figure read that 12-point
  // shortfall as evidence, accusing spotless channels of 5% fake followers.
  let score = 95;

  // Views far below subscribers suggests bought or long-dead subscribers.
  const viewsPerSub = subscriberCount > 0 ? metrics.avgViews / subscriberCount : 0;
  if (subscriberCount >= 10_000) {
    if (viewsPerSub < 0.01) {
      score -= 45;
      flags.push("Median views are under 1% of subscribers");
    } else if (viewsPerSub < 0.03) {
      score -= 22;
      flags.push("Median views are low relative to subscribers");
    } else if (viewsPerSub > 0.25) {
      score += 5;
    }
  }

  if (metrics.engagementRate < 0.5 && !metrics.likesHidden) {
    score -= 18;
    flags.push("Engagement rate under 0.5%");
  }

  // Real audiences comment at a fairly steady fraction of likes. A near-zero ratio on a channel with
  // plenty of likes is a classic sign of purchased engagement.
  if (commentToLikeRatio !== null && commentToLikeRatio < 0.002) {
    score -= 15;
    flags.push("Almost no comments relative to likes");
  }

  if (metrics.sampleSize < 5) {
    score -= 10;
    flags.push(`Only ${metrics.sampleSize} recent video${metrics.sampleSize === 1 ? "" : "s"} to judge from`);
  }

  if (metrics.likesHidden) {
    flags.push("Channel hides likes, so engagement counts comments only");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  // Reported only where the shortfall is large enough to mean something, and described as what it
  // is: subscribers who did not watch. Deriving it from the score instead invented an accusation
  // out of the score's own headroom.
  const dormant = subscriberCount > 0 ? 1 - Math.min(1, viewsPerSub) : 0;
  const dormantSubscriberPct =
    subscriberCount >= 10_000 && viewsPerSub < 0.03 ? Number((dormant * 100).toFixed(1)) : 0;

  return { score, dormantSubscriberPct, flags };
}
