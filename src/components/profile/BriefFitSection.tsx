import { Ban, CircleAlert, CircleCheck, Sparkles } from "lucide-react";
import { ScoreBreakdown, PlatformIcon } from "@/components/creators/shared";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/Card";
import { ScoreRing } from "@/components/ui/Score";
import { PLATFORMS } from "@/data/taxonomy";
import { formatCount, formatINR } from "@/lib/format";
import type { CampaignBrief, MatchResult } from "@/types";
import { briefSummary } from "./helpers";

export interface BriefFitSectionProps {
  brief: CampaignBrief;
  /** The creator scored against the brief, or null when the brief has no targeting yet. */
  result: MatchResult | null;
}

export function BriefFitSection({ brief, result }: BriefFitSectionProps) {
  if (!result) {
    return (
      <Card className="border-brand-200 bg-brand-50/50">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-brand-600 shadow-sm">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900">How well does this creator fit your campaign?</h2>
              <p className="text-sm text-slate-600">
                Describe your campaign and every profile shows an explainable match score for it.
              </p>
            </div>
          </div>
          <ButtonLink to="/match">Describe your campaign</ButtonLink>
        </CardContent>
      </Card>
    );
  }

  const summary = briefSummary(brief);
  const excluded = result.excludedReason !== null;

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-base font-semibold text-slate-900">Fit for your current brief</h2>
          <CardDescription>
            {brief.brandName.trim() ? `${brief.brandName.trim()}: ` : null}
            {summary.length > 0 ? summary.join(" · ") : "Your saved campaign brief"}
          </CardDescription>
        </div>
        <ButtonLink to="/match" variant="ghost" size="sm">
          Edit brief
        </ButtonLink>
      </CardHeader>
      <CardContent className="space-y-6">
        {excluded ? (
          <div role="note" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <Ban className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>
              <span className="font-semibold">Filtered out by your brief. </span>
              {result.excludedReason}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <ScoreRing score={result.score} size={84} strokeWidth={8} />
          <dl className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Estimate on</dt>
              <dd className="mt-1 flex items-center gap-1.5 font-semibold text-slate-900">
                <PlatformIcon platform={result.platform} />
                {PLATFORMS[result.platform].label}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Est. cost</dt>
              <dd className="mt-1 font-semibold tabular-nums text-slate-900">{formatINR(result.estimatedCostINR)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Est. reach</dt>
              <dd className="mt-1 font-semibold tabular-nums text-slate-900">{formatCount(result.estimatedReach)} views</dd>
            </div>
          </dl>
        </div>

        {result.reasons.length > 0 || result.warnings.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {result.reasons.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900">Why it fits</h3>
                <ul className="space-y-1.5">
                  {result.reasons.map((reason) => (
                    <li key={reason} className="flex items-start gap-1.5 text-sm text-slate-700">
                      <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {result.warnings.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-900">Worth checking</h3>
                <ul className="space-y-1.5">
                  {result.warnings.map((warning) => (
                    <li key={warning} className="flex items-start gap-1.5 text-sm text-amber-800">
                      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      {warning}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Score breakdown</h3>
            <Badge>{result.components.filter((component) => component.applied).length} criteria applied</Badge>
          </div>
          <ScoreBreakdown components={result.components} />
        </div>
      </CardContent>
    </Card>
  );
}
