// The product's whole argument, in one line on every creator.
//
// A follower count is what a creator leads their media kit with; it is also the number most likely
// to be wrong. In the first 60 creators ingested here, one channel carried 2.01 million
// subscribers and a median of 3,510 views — an audience 0.2% the size the headline implies. Any
// card that puts "Followers: 2.0M" at the top is repeating the claim the buyer came here to check.
//
// So the card leads with the gap instead: what they claim, what actually shows up, and how much of
// that lands in Maharashtra.
import { ArrowRight } from "lucide-react";
import { formatCount } from "@/lib/format";
import { localReachOf } from "@/lib/regional";
import { cn } from "@/lib/utils";
import type { Creator } from "@/types";

export type ReachVerdict = "healthy" | "soft" | "hollow";

export interface ReachCheck {
  followers: number;
  views: number;
  /** Views as a share of followers, 0..1. */
  showUpRate: number;
  verdict: ReachVerdict;
  localViews: number;
  localShare: number;
}

/**
 * Views against followers. The thresholds are deliberately blunt — below 1% of followers turning
 * up is not a judgement call, and above 3% is unremarkable — because a buyer needs a decision, not
 * a percentile.
 */
export function reachCheck(creator: Creator): ReachCheck {
  const platform = creator.platforms[0];
  const followers = platform?.followers ?? 0;
  const views = platform?.avgViews ?? 0;
  const showUpRate = followers > 0 ? views / followers : 0;
  const local = localReachOf(creator);

  // Small channels routinely swing either side of these lines, so the verdict only bites above
  // 10,000 followers, where a gap is a pattern rather than one quiet month.
  const verdict: ReachVerdict =
    followers < 10_000 ? "healthy" : showUpRate < 0.01 ? "hollow" : showUpRate < 0.03 ? "soft" : "healthy";

  return { followers, views, showUpRate, verdict, localViews: local.localViews, localShare: local.share };
}

const TONE: Record<ReachVerdict, { text: string; chip: string; label: string }> = {
  healthy: { text: "text-slate-900", chip: "bg-emerald-50 text-emerald-700", label: "turn up" },
  soft: { text: "text-amber-700", chip: "bg-amber-50 text-amber-800", label: "turn up" },
  hollow: { text: "text-rose-700", chip: "bg-rose-50 text-rose-700", label: "turn up" },
};

/**
 * "2.0M followers → 3,510 views". The arrow is the point: these are not the same number, and the
 * second one is what a brand is buying.
 */
export function ReachReality({ creator, className }: { creator: Creator; className?: string }) {
  const check = reachCheck(creator);
  const tone = TONE[check.verdict];
  const pct = check.showUpRate * 100;

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm", className)}>
      <span className="text-slate-500">
        <span className="tabular-nums">{formatCount(check.followers)}</span> followers
      </span>
      <ArrowRight className="size-3.5 shrink-0 self-center text-slate-400" aria-hidden="true" />
      <span className={cn("font-semibold tabular-nums", tone.text)}>{formatCount(check.views)} views</span>
      {check.verdict !== "healthy" ? (
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium tabular-nums", tone.chip)}>
          {pct < 0.1 ? "under 0.1" : pct.toFixed(1)}% {tone.label}
        </span>
      ) : null}
    </div>
  );
}

/** The slice of those views a Maharashtra brand can actually use. */
export function LocalReachLine({ creator, className }: { creator: Creator; className?: string }) {
  const check = reachCheck(creator);
  const strong = check.localShare >= 0.6;
  return (
    <p className={cn("text-xs", strong ? "text-emerald-700" : "text-slate-500", className)}>
      <span className="font-semibold tabular-nums">{formatCount(check.localViews)}</span> of those in Maharashtra
      <span className="text-slate-400"> · est. {Math.round(check.localShare * 100)}%</span>
    </p>
  );
}
