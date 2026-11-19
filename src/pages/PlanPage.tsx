// The page an agency opens when a client says "we have ten lakh — who works for us?".
//
// It is built for that meeting: a budget goes in, four ways of spending it come out side by side
// with the trade-offs spelled out, and the recommended one opens into a creator list where every
// line says why it is there and what to check before committing. The CSV at the bottom is what
// gets emailed afterwards.
import { useDeferredValue, useId, useMemo, useState } from "react";
import { CircleCheck, Download, Info, OctagonAlert, TriangleAlert } from "lucide-react";
import { Link } from "react-router";
import { DatasetState } from "@/components/creators/DatasetState";
import { CreatorIdentity } from "@/components/creators/shared";
import { PageHeader } from "@/components/layout/Layout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/form";
import { useCreators } from "@/data/creatorStore";
import { SITE } from "@/config/site";
import { downloadCSV, toCSV, type CSVColumn } from "@/lib/csv";
import { inrCompact, type PlanInsight, type PlannedCreator } from "@/lib/mediaplan";
import { comparePlans, type ScenarioId } from "@/lib/scenarios";
import { getCity, LANGUAGES } from "@/data/taxonomy";
import { cn } from "@/lib/utils";
import type { CampaignGoal } from "@/types";

const PRESETS = [2_00_000, 5_00_000, 10_00_000, 25_00_000, 1_00_00_000];
const fmt = (n: number) => n.toLocaleString("en-IN");

const INSIGHT_STYLE: Record<PlanInsight["severity"], { icon: typeof Info; className: string }> = {
  critical: { icon: OctagonAlert, className: "border-rose-200 bg-rose-50 text-rose-900" },
  warning: { icon: TriangleAlert, className: "border-amber-200 bg-amber-50 text-amber-900" },
  good: { icon: CircleCheck, className: "border-emerald-200 bg-emerald-50 text-emerald-900" },
  info: { icon: Info, className: "border-slate-200 bg-slate-50 text-slate-700" },
};

function planColumns(origin: string): CSVColumn<PlannedCreator>[] {
  return [
    { header: "Name", value: (e) => e.creator.name },
    { header: "Handle", value: (e) => `@${e.creator.handle}` },
    { header: "Tier", value: (e) => e.creator.tier },
    { header: "City", value: (e) => getCity(e.creator.homeCityId)?.name ?? "" },
    { header: "Languages", value: (e) => e.creator.languages.map((c) => LANGUAGES[c].label).join("; ") },
    { header: "Followers", value: (e) => e.creator.platforms[0]?.followers ?? 0 },
    { header: "Median views", value: (e) => e.expectedViews },
    { header: "Views in Maharashtra (est)", value: (e) => e.localViews },
    { header: "Engagement %", value: (e) => e.creator.platforms[0]?.engagementRate ?? 0 },
    { header: "Authenticity", value: (e) => e.creator.authenticity.score },
    { header: "Fee INR", value: (e) => e.fee },
    { header: "Cost per 1000 relevant views INR", value: (e) => e.localCPM },
    { header: "Why", value: (e) => e.rationale.join(" ") },
    { header: "Check before booking", value: (e) => e.risks.join(" ") },
    { header: "Profile", value: (e) => `${origin}/creators/${encodeURIComponent(e.creator.id)}` },
  ];
}

export default function PlanPage() {
  const { creators, status, error, reload } = useCreators();
  const [budgetText, setBudgetText] = useState("1000000");
  const [goal, setGoal] = useState<CampaignGoal>("consideration");
  const [chosen, setChosen] = useState<ScenarioId | null>(null);
  const budgetId = useId();
  const goalId = useId();

  const budget = Math.max(0, Number(budgetText.replace(/[^\d]/g, "")) || 0);
  const deferredBudget = useDeferredValue(budget);

  const comparison = useMemo(
    () => (creators.length > 0 && deferredBudget > 0 ? comparePlans(creators, deferredBudget, { clientGoal: goal }) : null),
    [creators, deferredBudget, goal],
  );

  const active = useMemo(() => {
    if (!comparison) return null;
    const id = chosen ?? comparison.recommendation.scenarioId;
    return comparison.scenarios.find((s) => s.id === id) ?? comparison.scenarios[0] ?? null;
  }, [comparison, chosen]);

  function exportPlan() {
    if (!active) return;
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    downloadCSV(
      `influencerai-plan-${active.id}-${inrCompact(active.plan.spend).replace(/[₹\s]/g, "")}.csv`,
      toCSV(active.plan.creators, planColumns(origin)),
    );
  }

  return (
    <div className="container-page pb-16">
      <title>{"Plan a campaign · " + SITE.name}</title>
      <PageHeader
        eyebrow="Plan"
        title="What will this budget actually buy?"
        description="Four ways to spend the same money, costed on the reach that lands in Maharashtra rather than reach anywhere. Every creator comes with the reason it is in the plan and what to check before you commit."
      />

      <Card className="p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Field label="Budget" htmlFor={budgetId} hint={budget > 0 ? inrCompact(budget) : "Rupees"}>
            <Input
              id={budgetId}
              inputMode="numeric"
              value={budgetText}
              onChange={(event) => setBudgetText(event.target.value)}
              aria-describedby={`${budgetId}-presets`}
            />
          </Field>
          <Field label="What is the campaign for?" htmlFor={goalId}>
            <Select id={goalId} value={goal} onChange={(event) => setGoal(event.target.value as CampaignGoal)}>
              <option value="awareness">Awareness — people should know we exist</option>
              <option value="consideration">Consideration — people should take us seriously</option>
              <option value="conversions">Conversions — people should act</option>
              <option value="app_installs">App installs</option>
              <option value="ugc">Content for our own channels</option>
            </Select>
          </Field>
        </div>
        <div id={`${budgetId}-presets`} className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset}
              variant={budget === preset ? "primary" : "outline"}
              size="sm"
              onClick={() => setBudgetText(String(preset))}
            >
              {inrCompact(preset)}
            </Button>
          ))}
        </div>
      </Card>

      {status !== "ready" ? (
        <div className="mt-6">
          <DatasetState status={status} error={error} onRetry={reload} />
        </div>
      ) : !comparison ? (
        <p className="mt-8 text-slate-600">Enter a budget to see what it buys.</p>
      ) : (
        <>
          <section aria-labelledby="options-heading" className="mt-10">
            <h2 id="options-heading" className="text-xl font-bold text-slate-900">
              Four ways to spend {inrCompact(budget)}
            </h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {comparison.scenarios.map((scenario) => {
                const recommended = scenario.id === comparison.recommendation.scenarioId;
                const selected = active?.id === scenario.id;
                return (
                  <Card
                    key={scenario.id}
                    className={cn(
                      "flex flex-col gap-3 p-5 transition",
                      selected ? "ring-2 ring-brand-500" : "hover:border-slate-300",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{scenario.name}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-slate-600">{scenario.thesis}</p>
                      </div>
                      {recommended ? (
                        <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                          Recommended
                        </span>
                      ) : null}
                    </div>

                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 pt-3">
                      {scenario.highlights.slice(0, 4).map((h) => (
                        <div key={h.label}>
                          <dt className="text-xs text-slate-500">{h.label}</dt>
                          <dd className="font-semibold tabular-nums text-slate-900">{h.value}</dd>
                        </div>
                      ))}
                    </dl>

                    <p className="text-sm text-slate-500">{scenario.bestFor}</p>

                    <Button
                      variant={selected ? "primary" : "outline"}
                      onClick={() => setChosen(scenario.id)}
                      aria-pressed={selected}
                      className="mt-auto"
                    >
                      {selected ? "Showing this plan" : "See this plan"}
                    </Button>
                  </Card>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="recommendation-heading" className="mt-8">
            <h2 id="recommendation-heading" className="sr-only">
              Recommendation and trade-offs
            </h2>
            <Card className="border-brand-200 bg-brand-50/50 p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Our recommendation</p>
              <p className="mt-2 text-slate-800">{comparison.recommendation.because}</p>
              {comparison.tradeOffs.length > 0 ? (
                <ul className="mt-4 space-y-2 border-t border-brand-200/60 pt-4">
                  {comparison.tradeOffs.map((tradeOff) => (
                    <li key={tradeOff} className="flex gap-2 text-sm text-slate-700">
                      <span aria-hidden="true" className="text-brand-600">
                        →
                      </span>
                      <span>{tradeOff}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>
          </section>

          {active ? (
            <>
              <section aria-labelledby="checks-heading" className="mt-10">
                <h2 id="checks-heading" className="text-xl font-bold text-slate-900">
                  What to know before you sign this off
                </h2>
                <div className="mt-4 grid gap-3">
                  {active.plan.insights.map((insight) => {
                    const { icon: Icon, className } = INSIGHT_STYLE[insight.severity];
                    return (
                      <div key={insight.headline} className={cn("flex gap-3 rounded-xl border p-4", className)}>
                        <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
                        <div>
                          <p className="font-semibold">{insight.headline}</p>
                          <p className="mt-1 text-sm leading-relaxed opacity-90">{insight.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section aria-labelledby="coverage-heading" className="mt-10">
                <h2 id="coverage-heading" className="text-xl font-bold text-slate-900">
                  Where in Maharashtra this lands
                </h2>
                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full min-w-[32rem] text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-semibold">Sub-region</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Creators</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Views in-state</th>
                        <th className="px-4 py-2.5 text-right font-semibold">Population</th>
                      </tr>
                    </thead>
                    <tbody>
                      {active.plan.regional.coverage.map((row) => (
                        <tr key={row.subRegion} className="border-t border-slate-100">
                          <td className="px-4 py-2.5 font-medium text-slate-900">{row.label}</td>
                          <td className={cn("px-4 py-2.5 text-right tabular-nums", row.creators === 0 && "text-rose-600")}>
                            {row.creators}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{fmt(row.localViews)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">
                            {(row.population / 1_00_00_000).toFixed(1)} Cr
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section aria-labelledby="creators-heading" className="mt-10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 id="creators-heading" className="text-xl font-bold text-slate-900">
                    The {active.plan.creators.length} creators, and why
                  </h2>
                  <Button variant="outline" onClick={exportPlan} disabled={active.plan.creators.length === 0}>
                    <Download className="size-4" aria-hidden="true" />
                    Export CSV
                  </Button>
                </div>

                <ul className="mt-4 space-y-3">
                  {active.plan.creators.map((entry) => (
                    <li key={entry.creator.id}>
                      <Card className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <CreatorIdentity creator={entry.creator} />
                          <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                            <div>
                              <dt className="text-xs text-slate-500">Fee</dt>
                              <dd className="font-semibold tabular-nums text-slate-900">{inrCompact(entry.fee)}</dd>
                            </div>
                            <div>
                              <dt className="text-xs text-slate-500">Views in-state</dt>
                              <dd className="font-semibold tabular-nums text-slate-900">{fmt(entry.localViews)}</dd>
                            </div>
                            <div>
                              <dt className="text-xs text-slate-500">Per 1,000 relevant</dt>
                              <dd className="font-semibold tabular-nums text-slate-900">₹{fmt(entry.localCPM)}</dd>
                            </div>
                          </dl>
                        </div>

                        {entry.rationale.length > 0 ? (
                          <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                            {entry.rationale.map((reason) => (
                              <li key={reason} className="flex gap-2 text-sm text-slate-700">
                                <span aria-hidden="true" className="text-emerald-600">
                                  +
                                </span>
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}

                        {entry.risks.length > 0 ? (
                          <ul className="mt-2 space-y-1">
                            {entry.risks.map((risk) => (
                              <li key={risk} className="flex gap-2 text-sm text-amber-800">
                                <span aria-hidden="true">!</span>
                                <span>{risk}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}

                        <Link
                          to={`/creators/${entry.creator.id}`}
                          className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline"
                        >
                          Full profile
                        </Link>
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
