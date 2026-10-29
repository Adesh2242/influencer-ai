import { ChevronDown, Info, SearchX, Wand2 } from "lucide-react";
import { useDeferredValue, useId, useMemo, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Label, Select } from "@/components/ui/form";
import { EmptyState, Stat } from "@/components/ui/misc";
import { creators } from "@/data/creators";
import { formatCount, formatINRCompact } from "@/lib/format";
import { matchCreators } from "@/lib/matching/engine";
import { planCampaign } from "@/lib/matching/optimize";
import { cn } from "@/lib/utils";
import { useBrief } from "@/state/BriefContext";
import type { CampaignBrief, MatchResult } from "@/types";
import { MatchCard } from "./MatchCard";
import { PlanCard } from "./PlanCard";
import { groupExclusions, isBlankBrief, MATCH_SORTS, sortResults, summarizeMatches, type MatchSort } from "./results";

const PAGE_SIZE = 20;

function ExcludedList({ excluded }: { excluded: MatchResult[] }) {
  return (
    <ul className="max-h-80 divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-200 bg-white">
      {excluded.map((r) => (
        <li key={r.creator.id} className="flex flex-col gap-0.5 px-3 py-2 text-sm sm:flex-row sm:items-baseline sm:gap-3">
          <Link to={`/creators/${r.creator.id}`} className="shrink-0 font-medium text-slate-900 hover:text-brand-700 hover:underline">
            {r.creator.name}
          </Link>
          <span className="text-slate-500">{r.excludedReason}</span>
        </li>
      ))}
    </ul>
  );
}

function NothingEligible({ excluded, brief, onRelax }: { excluded: MatchResult[]; brief: CampaignBrief; onRelax: (patch: Partial<CampaignBrief>) => void }) {
  const groups = groupExclusions(excluded, brief);
  return (
    <EmptyState
      icon={SearchX}
      title="No creator passes every filter"
      description="Your hard filters rule out the whole dataset. Here is what removed them; relax the biggest one first."
      action={
        <ul className="flex w-full max-w-lg flex-col gap-2 text-left">
          {groups.map((group) => (
            <li key={group.kind} className="flex flex-col gap-2 rounded-xl border border-slate-200 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                <span className="font-semibold tabular-nums text-slate-900">{group.count}</span>{" "}
                <span className="text-slate-600">{group.suggestion}</span>
              </div>
              {group.relax ? (
                <Button size="sm" variant="secondary" onClick={() => onRelax(group.relax ?? {})}>
                  {group.relaxLabel}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      }
    />
  );
}

export function ResultsPanel() {
  const { brief, updateBrief } = useBrief();
  const deferredBrief = useDeferredValue(brief);
  const stale = deferredBrief !== brief;
  const { results, excluded } = useMemo(() => matchCreators(deferredBrief, creators), [deferredBrief]);
  const summary = useMemo(() => summarizeMatches(results, excluded, deferredBrief), [results, excluded, deferredBrief]);

  const [sort, setSort] = useState<MatchSort>("score");
  const sorted = useMemo(() => sortResults(results, sort), [results, sort]);
  const rankById = useMemo(() => new Map(results.map((r, i) => [r.creator.id, i + 1])), [results]);
  const [showExcluded, setShowExcluded] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const plan = useMemo(
    () => (planOpen ? planCampaign(results, deferredBrief.budgetINR, deferredBrief.creatorsWanted) : null),
    [planOpen, results, deferredBrief.budgetINR, deferredBrief.creatorsWanted],
  );

  // Back to the first page whenever the ranking itself changes.
  const [page, setPage] = useState({ size: PAGE_SIZE, key: sorted });
  const visibleCount = page.key === sorted ? page.size : PAGE_SIZE;
  const visible = sorted.slice(0, visibleCount);

  const sortId = useId();
  const excludedId = useId();
  const blank = isBlankBrief(deferredBrief);

  return (
    <section aria-labelledby="results-heading" className="flex min-w-0 flex-col gap-4">
      <h2 id="results-heading" className="sr-only">
        Matching creators
      </h2>

      <Card className="p-4 sm:p-5">
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Eligible</dt>
            <dd className="text-xl font-bold tabular-nums text-slate-900">{summary.eligible}</dd>
            <dd className="text-xs text-slate-500">of {creators.length} demo creators</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Excluded</dt>
            <dd className="text-xl font-bold tabular-nums text-slate-900">{summary.excluded}</dd>
            <dd>
              {summary.excluded > 0 ? (
                <button
                  type="button"
                  aria-expanded={showExcluded}
                  aria-controls={excludedId}
                  onClick={() => setShowExcluded((v) => !v)}
                  className="inline-flex cursor-pointer items-center gap-0.5 rounded text-xs font-medium text-brand-700 hover:underline focus-visible:outline-2 focus-visible:outline-brand-500"
                >
                  {showExcluded ? "Hide reasons" : "See why"}
                  <ChevronDown className={cn("size-3.5 transition-transform", showExcluded && "rotate-180")} aria-hidden="true" />
                </button>
              ) : (
                <span className="text-xs text-slate-500">by hard filters</span>
              )}
            </dd>
          </div>
          <Stat label={`Avg score, top ${summary.topCount}`} value={summary.topCount > 0 ? summary.topAverageScore : "–"} />
          <Stat
            label={`Cost, top ${summary.topCount}`}
            value={
              <span className={cn(summary.overBudget && "text-amber-700")}>{summary.topCount > 0 ? formatINRCompact(summary.topCostINR) : "–"}</span>
            }
            hint={
              summary.overBudget === null
                ? "No budget set"
                : `${summary.overBudget ? "Over" : "Within"} ${formatINRCompact(deferredBrief.budgetINR)} budget`
            }
          />
        </dl>
        <div id={excludedId} hidden={!showExcluded} className="mt-4">
          {showExcluded ? <ExcludedList excluded={excluded} /> : null}
        </div>
      </Card>

      {blank ? (
        <p className="flex gap-2 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-800">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            This is the overall ranking for a general brief. Describe your campaign or try a sample brief to rank creators for your brand,
            audience and budget.
          </span>
        </p>
      ) : null}

      {results.length > 0 ? (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor={sortId} className="shrink-0">
                Sort by
              </Label>
              <Select id={sortId} value={sort} onChange={(e) => setSort(e.target.value as MatchSort)} className="w-auto">
                {MATCH_SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
            <Button variant={planOpen ? "secondary" : "primary"} onClick={() => setPlanOpen((v) => !v)} aria-expanded={planOpen}>
              <Wand2 className="size-4" aria-hidden="true" />
              Plan within budget
            </Button>
          </div>

          {plan ? <PlanCard plan={plan} budgetINR={deferredBrief.budgetINR} onClose={() => setPlanOpen(false)} /> : null}

          <p className="text-sm text-slate-500" aria-live="polite">
            Showing {visible.length} of {sorted.length} · top {summary.topCount} reach {formatCount(summary.topReach)} views
          </p>

          <ol className={cn("grid gap-4 transition-opacity", stale && "opacity-60")} aria-busy={stale}>
            {visible.map((result) => (
              <li key={result.creator.id}>
                <MatchCard result={result} rank={rankById.get(result.creator.id) ?? 0} />
              </li>
            ))}
          </ol>

          {visible.length < sorted.length ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setPage({ size: visibleCount + PAGE_SIZE, key: sorted })}>
                Show {Math.min(PAGE_SIZE, sorted.length - visible.length)} more
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <NothingEligible excluded={excluded} brief={deferredBrief} onRelax={updateBrief} />
      )}
    </section>
  );
}
