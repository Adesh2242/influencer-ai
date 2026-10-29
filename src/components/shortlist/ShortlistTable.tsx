import { Ban, X } from "lucide-react";
import { CreatorIdentity, PlatformIcon, TierBadge } from "@/components/creators/shared";
import { statsForResult } from "@/components/profile/helpers";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScoreRing } from "@/components/ui/Score";
import { PLATFORMS } from "@/data/taxonomy";
import { formatCount, formatINR, formatPercent } from "@/lib/format";
import type { MatchResult } from "@/types";

export interface ShortlistTableProps {
  results: MatchResult[];
  onRemove: (id: string) => void;
}

function PlatformCell({ result }: { result: MatchResult }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
      <PlatformIcon platform={result.platform} className="text-slate-500" />
      {PLATFORMS[result.platform].label}
    </span>
  );
}

function ExcludedNote({ reason }: { reason: string }) {
  return (
    <p className="flex items-start gap-1 text-xs text-rose-700">
      <Ban className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      <span>
        <span className="font-semibold">Filtered out: </span>
        {reason}
      </span>
    </p>
  );
}

function RemoveButton({ result, onRemove }: { result: MatchResult; onRemove: (id: string) => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="px-2 text-slate-500 hover:text-rose-700"
      onClick={() => onRemove(result.creator.id)}
      aria-label={`Remove ${result.creator.name} from shortlist`}
      title="Remove from shortlist"
    >
      <X className="size-4" aria-hidden="true" />
    </Button>
  );
}

/** A table from md up, stacked cards below it. */
export function ShortlistTable({ results, onRemove }: ShortlistTableProps) {
  return (
    <>
      <Card className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Shortlisted creators with estimates for your brief</caption>
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Creator
                </th>
                <th scope="col" className="px-4 py-3">
                  Platform
                </th>
                <th scope="col" className="px-4 py-3 text-center">
                  Match
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Est. cost
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Est. reach
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  ER
                </th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((result) => {
                const stats = statsForResult(result);
                return (
                  <tr key={result.creator.id} className="align-top">
                    <td className="max-w-80 px-4 py-3">
                      <div className="space-y-2">
                        <CreatorIdentity creator={result.creator} />
                        <TierBadge tier={result.creator.tier} />
                        {result.excludedReason ? <ExcludedNote reason={result.excludedReason} /> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <PlatformCell result={result} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ScoreRing score={result.score} size={40} strokeWidth={4} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-900">{formatINR(result.estimatedCostINR)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{formatCount(result.estimatedReach)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {stats ? formatPercent(stats.engagementRate) : "–"}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <RemoveButton result={result} onRemove={onRemove} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <ul className="space-y-3 md:hidden" aria-label="Shortlisted creators">
        {results.map((result) => {
          const stats = statsForResult(result);
          return (
            <li key={result.creator.id}>
              <Card className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  <CreatorIdentity creator={result.creator} className="flex-1" />
                  <ScoreRing score={result.score} size={44} strokeWidth={4} />
                  <RemoveButton result={result} onRemove={onRemove} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <TierBadge tier={result.creator.tier} />
                  <Badge>
                    <PlatformIcon platform={result.platform} className="size-3" />
                    {PLATFORMS[result.platform].label}
                  </Badge>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Est. cost</dt>
                    <dd className="font-semibold tabular-nums text-slate-900">{formatINR(result.estimatedCostINR)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Est. reach</dt>
                    <dd className="font-semibold tabular-nums text-slate-900">{formatCount(result.estimatedReach)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">ER</dt>
                    <dd className="font-semibold tabular-nums text-slate-900">{stats ? formatPercent(stats.engagementRate) : "–"}</dd>
                  </div>
                </dl>
                {result.excludedReason ? <ExcludedNote reason={result.excludedReason} /> : null}
              </Card>
            </li>
          );
        })}
      </ul>
    </>
  );
}
