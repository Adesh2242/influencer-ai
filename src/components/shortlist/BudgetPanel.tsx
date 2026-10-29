import { WandSparkles } from "lucide-react";
import { useState, type Ref } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/form";
import { formatCount, formatINR, formatINRCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CampaignPlan } from "@/types";

export interface BudgetPanelProps {
  budgetINR: number;
  creatorsWanted: number;
  summary: CampaignPlan;
  onBudgetChange: (budgetINR: number) => void;
  onCreatorsWantedChange: (creatorsWanted: number) => void;
  onOptimise: () => void;
  canOptimise: boolean;
  optimiseRef?: Ref<HTMLButtonElement>;
}

function parseWhole(value: string): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/** Budget and team-size inputs plus totals for the current shortlist. */
export function BudgetPanel({
  budgetINR,
  creatorsWanted,
  summary,
  onBudgetChange,
  onCreatorsWantedChange,
  onOptimise,
  canOptimise,
  optimiseRef,
}: BudgetPanelProps) {
  // Lets the field be cleared while typing a new number; it snaps back to the saved value on blur.
  const [wantedDraft, setWantedDraft] = useState<string | null>(null);
  const hasBudget = budgetINR > 0;
  const over = hasBudget && summary.remainingBudgetINR < 0;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-slate-900">Budget</h2>
        <CardDescription>Totals use each creator's estimated fee for your brief's deliverable.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
          <Field label="Campaign budget (₹)" htmlFor="shortlist-budget" hint={hasBudget ? formatINR(budgetINR) : "Not set"}>
            <Input
              id="shortlist-budget"
              type="number"
              inputMode="numeric"
              min={0}
              step={10000}
              placeholder="e.g. 500000"
              value={budgetINR > 0 ? budgetINR : ""}
              onChange={(event) => onBudgetChange(parseWhole(event.target.value))}
            />
          </Field>
          <Field label="Creators" htmlFor="shortlist-creators-wanted" hint="Wanted">
            <Input
              id="shortlist-creators-wanted"
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              value={wantedDraft ?? String(creatorsWanted)}
              onChange={(event) => {
                setWantedDraft(event.target.value);
                const wanted = parseWhole(event.target.value);
                if (wanted >= 1) onCreatorsWantedChange(Math.min(100, wanted));
              }}
              onBlur={() => setWantedDraft(null)}
            />
          </Field>
        </div>

        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Total cost</dt>
            <dd className="mt-1 text-xl font-bold tabular-nums text-slate-900">{formatINRCompact(summary.totalCostINR)}</dd>
            <dd className="text-xs tabular-nums text-slate-500">{formatINR(summary.totalCostINR)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{over ? "Over budget" : "Remaining"}</dt>
            <dd
              className={cn(
                "mt-1 text-xl font-bold tabular-nums",
                !hasBudget ? "text-slate-400" : over ? "text-rose-700" : "text-emerald-700",
              )}
            >
              {hasBudget ? formatINRCompact(Math.abs(summary.remainingBudgetINR)) : "–"}
            </dd>
            <dd className="text-xs text-slate-500">{hasBudget ? `of ${formatINRCompact(budgetINR)}` : "Set a budget to compare"}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Est. reach</dt>
            <dd className="mt-1 text-lg font-bold tabular-nums text-slate-900">{formatCount(summary.totalReach)}</dd>
            <dd className="text-xs text-slate-500">views</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Creators</dt>
            <dd className="mt-1 text-lg font-bold tabular-nums text-slate-900">{summary.selected.length}</dd>
            <dd className="text-xs text-slate-500">{creatorsWanted} wanted</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">CPM</dt>
            <dd className="mt-1 text-lg font-bold tabular-nums text-slate-900">{summary.cpmINR > 0 ? formatINR(summary.cpmINR) : "–"}</dd>
            <dd className="text-xs text-slate-500">per 1,000 views</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">CPE</dt>
            <dd className="mt-1 text-lg font-bold tabular-nums text-slate-900">{summary.cpeINR > 0 ? formatINR(summary.cpeINR) : "–"}</dd>
            <dd className="text-xs text-slate-500">per engagement</dd>
          </div>
        </dl>

        {summary.notes.length > 0 ? (
          <ul className="space-y-1 border-t border-slate-100 pt-4 text-sm text-slate-600">
            {summary.notes.map((note) => (
              <li key={note} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-saffron-500" />
                {note}
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
      <CardFooter>
        <Button ref={optimiseRef} variant="secondary" className="w-full" onClick={onOptimise} disabled={!canOptimise}>
          <WandSparkles className="size-4" aria-hidden="true" />
          Optimise within budget
        </Button>
        {!canOptimise ? (
          <p className="w-full text-xs text-slate-500">Set a budget to let us suggest which creators to keep.</p>
        ) : null}
      </CardFooter>
    </Card>
  );
}
