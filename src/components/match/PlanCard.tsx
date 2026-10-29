import { ArrowRight, BookmarkPlus, Calculator, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Avatar, Stat } from "@/components/ui/misc";
import { formatCount, formatINR, formatINRCompact } from "@/lib/format";
import { useShortlist } from "@/state/ShortlistContext";
import type { CampaignPlan } from "@/types";

export function PlanCard({ plan, budgetINR, onClose }: { plan: CampaignPlan; budgetINR: number; onClose: () => void }) {
  const { add, has } = useShortlist();
  const [added, setAdded] = useState(false);
  const allSaved = plan.selected.length > 0 && plan.selected.every((r) => has(r.creator.id));
  const overBudget = budgetINR > 0 && plan.remainingBudgetINR < 0;

  return (
    <Card role="region" className="border-brand-200 bg-linear-to-br from-brand-50/70 to-white" aria-labelledby="plan-title">
      <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <Calculator className="size-5 text-brand-600" aria-hidden="true" />
          <h2 id="plan-title" className="text-base font-semibold text-slate-900">
            Plan within budget
          </h2>
          <Badge tone={overBudget ? "warning" : "success"}>{plan.selected.length} creators</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close plan">
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 px-4 py-4 sm:grid-cols-4 sm:px-5">
        <Stat
          label="Total cost"
          value={formatINRCompact(plan.totalCostINR)}
          hint={budgetINR > 0 ? `of ${formatINRCompact(budgetINR)} budget` : "No budget set"}
        />
        <Stat label="Est. reach" value={formatCount(plan.totalReach)} hint="views" />
        <Stat label="CPM" value={plan.cpmINR > 0 ? formatINR(plan.cpmINR) : "–"} hint="per 1,000 views" />
        <Stat label="CPE" value={plan.cpeINR > 0 ? formatINR(plan.cpeINR) : "–"} hint="per engagement" />
      </div>

      {plan.selected.length > 0 ? (
        <ul className="flex flex-wrap gap-2 px-4 sm:px-5" aria-label="Creators in the plan">
          {plan.selected.map((r) => (
            <li key={r.creator.id} className="inline-flex items-center gap-1.5 rounded-full bg-white py-0.5 pl-0.5 pr-2.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
              <Avatar name={r.creator.name} hue={r.creator.avatarHue} size="sm" className="size-6 text-[10px]" />
              {r.creator.name}
              <span className="tabular-nums text-slate-500">{formatINRCompact(r.estimatedCostINR)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {plan.notes.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 px-4 pl-9 text-sm text-slate-600 sm:pl-10">
          {plan.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-brand-100 px-4 py-3 sm:px-5">
        <Button
          size="sm"
          disabled={plan.selected.length === 0 || allSaved}
          onClick={() => {
            plan.selected.forEach((r) => add(r.creator.id));
            setAdded(true);
          }}
        >
          <BookmarkPlus className="size-4" aria-hidden="true" />
          {allSaved ? "All in shortlist" : "Add all to shortlist"}
        </Button>
        <ButtonLink to="/shortlist" variant="outline" size="sm">
          Open shortlist
          <ArrowRight className="size-4" aria-hidden="true" />
        </ButtonLink>
        <span role="status" className="text-xs text-slate-500">
          {added && allSaved ? `${plan.selected.length} creators saved to your shortlist.` : ""}
        </span>
      </div>
    </Card>
  );
}
