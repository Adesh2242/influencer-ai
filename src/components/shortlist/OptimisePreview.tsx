import { ArrowRight, CircleCheck, CircleMinus } from "lucide-react";
import { forwardRef } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/Card";
import { formatCount, formatINR, formatINRCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CampaignPlan, MatchResult } from "@/types";

export interface OptimisePreviewProps {
  /** Totals for the shortlist as it is now. */
  current: CampaignPlan;
  /** The suggested selection from planCampaign. */
  plan: CampaignPlan;
  budgetINR: number;
  onApply: () => void;
  onCancel: () => void;
}

function NameList({ title, results, kept }: { title: string; results: MatchResult[]; kept: boolean }) {
  const Icon = kept ? CircleCheck : CircleMinus;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-900">
        {title} <span className="font-normal text-slate-500">({results.length})</span>
      </h3>
      {results.length === 0 ? (
        <p className="text-sm text-slate-500">{kept ? "Nobody fits." : "Nobody."}</p>
      ) : (
        <ul className="space-y-1.5">
          {results.map((result) => (
            <li key={result.creator.id} className="flex items-start gap-2 text-sm">
              <Icon className={cn("mt-0.5 size-4 shrink-0", kept ? "text-emerald-600" : "text-slate-400")} aria-hidden="true" />
              <span className={cn("min-w-0 flex-1", kept ? "text-slate-800" : "text-slate-500")}>
                {result.creator.name}
                {!kept && result.excludedReason ? <span className="block text-xs text-rose-700">Fails the brief's filters</span> : null}
              </span>
              <span className="shrink-0 tabular-nums text-slate-500">{formatINRCompact(result.estimatedCostINR)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Delta({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 flex flex-wrap items-center gap-1.5 text-sm tabular-nums">
        <span className="text-slate-500">{before}</span>
        <ArrowRight className="size-3.5 text-slate-400" aria-label="to" role="img" />
        <span className="font-semibold text-slate-900">{after}</span>
      </dd>
    </div>
  );
}

/** Keep/drop preview for the budget optimiser. The heading takes focus when it opens. */
export const OptimisePreview = forwardRef<HTMLHeadingElement, OptimisePreviewProps>(function OptimisePreview(
  { current, plan, budgetINR, onApply, onCancel },
  headingRef,
) {
  const keptIds = new Set(plan.selected.map((result) => result.creator.id));
  const kept = current.selected.filter((result) => keptIds.has(result.creator.id));
  const dropped = current.selected.filter((result) => !keptIds.has(result.creator.id));
  const unchanged = dropped.length === 0;
  const remaining = plan.remainingBudgetINR;

  return (
    <Card className="border-brand-200 ring-4 ring-brand-50" role="region" aria-labelledby="optimise-heading">
      <CardHeader>
        <h2 id="optimise-heading" ref={headingRef} tabIndex={-1} className="text-base font-semibold text-slate-900 focus:outline-none">
          Suggested plan within {formatINRCompact(budgetINR)}
        </h2>
        <CardDescription>
          {unchanged
            ? "Your shortlist already fits this budget and team size, so nothing needs to change."
            : `Keeps ${kept.length} of ${current.selected.length} creators, favouring strong matches with good reach per rupee.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <NameList title="Keep" results={kept} kept />
          <NameList title="Drop" results={dropped} kept={false} />
        </div>

        <dl className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-4">
          <Delta label="Total cost" before={formatINRCompact(current.totalCostINR)} after={formatINRCompact(plan.totalCostINR)} />
          <Delta label="Est. reach" before={formatCount(current.totalReach)} after={formatCount(plan.totalReach)} />
          <Delta
            label="CPM"
            before={current.cpmINR > 0 ? formatINR(current.cpmINR) : "–"}
            after={plan.cpmINR > 0 ? formatINR(plan.cpmINR) : "–"}
          />
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{remaining < 0 ? "Over budget" : "Left over"}</dt>
            <dd className={cn("mt-1 text-sm font-semibold tabular-nums", remaining < 0 ? "text-rose-700" : "text-emerald-700")}>
              {formatINRCompact(Math.abs(remaining))}
            </dd>
          </div>
        </dl>

        {plan.notes.length > 0 ? (
          <ul className="space-y-1 text-sm text-slate-600">
            {plan.notes.map((note) => (
              <li key={note} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-400" />
                {note}
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
      <CardFooter className="justify-end">
        <Button variant="ghost" onClick={onCancel}>
          {unchanged ? "Close" : "Cancel"}
        </Button>
        {unchanged ? null : (
          <Button onClick={onApply} disabled={kept.length === 0}>
            Apply: keep {kept.length}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
});
