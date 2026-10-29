import { CREATOR_TIER_LIST, CREATOR_TIERS } from "@/data/taxonomy";
import { formatINRCompact, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { followerRangeLabel, tierName } from "./options";

const cell = "px-3 py-3 sm:px-5";

/**
 * Follower range, typical engagement and typical reel fee per creator tier, from CREATOR_TIERS.
 * On phones the follower range moves under the tier name so the table fits a 360px screen.
 */
export function RateBenchmarkTable({ caption, className }: { caption: string; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card", className)}>
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className={cell}>
              Tier
            </th>
            <th scope="col" className={cn(cell, "hidden sm:table-cell")}>
              Followers
            </th>
            <th scope="col" className={cn(cell, "text-right")}>
              Typical engagement
            </th>
            <th scope="col" className={cn(cell, "text-right")}>
              Typical reel fee
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {CREATOR_TIER_LIST.map((tier) => {
            const { engagementBenchmark, reelRate } = CREATOR_TIERS[tier];
            const range = followerRangeLabel(tier);
            return (
              <tr key={tier}>
                <th scope="row" className={cn(cell, "font-semibold text-slate-900")}>
                  {tierName(tier)}
                  <span className="block text-xs font-normal tabular-nums text-slate-500 sm:hidden">{range} followers</span>
                </th>
                <td className={cn(cell, "hidden whitespace-nowrap tabular-nums text-slate-700 sm:table-cell")}>{range}</td>
                <td className={cn(cell, "text-right tabular-nums text-slate-700")}>{formatPercent(engagementBenchmark)}</td>
                <td className={cn(cell, "text-right tabular-nums text-slate-900")}>
                  <span className="whitespace-nowrap">{formatINRCompact(reelRate[0])} –</span>{" "}
                  <span className="whitespace-nowrap">{formatINRCompact(reelRate[1])}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
