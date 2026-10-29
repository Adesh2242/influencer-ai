import { TriangleAlert, ArrowRight, Check, ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { Link } from "react-router";
import { CreatorIdentity, PlatformBadge, ScoreBreakdown, TierBadge } from "@/components/creators/shared";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ScoreRing } from "@/components/ui/Score";
import { PLATFORMS } from "@/data/taxonomy";
import { formatCount, formatINRCompact, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MatchResult } from "@/types";
import { estimateStats } from "./results";
import { Metric, NicheBadges, ShortlistToggle } from "./shared";

export function MatchCard({ result, rank }: { result: MatchResult; rank: number }) {
  const { creator } = result;
  const [open, setOpen] = useState(false);
  const breakdownId = useId();
  const stats = estimateStats(result);
  const platformLabel = PLATFORMS[result.platform].label;

  return (
    <Card className="flex flex-col">
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tabular-nums text-slate-400">#{rank}</span>
              <CreatorIdentity creator={creator} />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <TierBadge tier={creator.tier} />
              {creator.platforms.map((p) => (
                <PlatformBadge key={p.platform} stats={p} />
              ))}
            </div>
            <NicheBadges niches={creator.niches} />
          </div>
          <ScoreRing score={result.score} />
        </div>

        {result.reasons.length > 0 ? (
          <ul className="space-y-1.5" aria-label="Why they fit">
            {result.reasons.map((reason) => (
              <li key={reason} className="flex gap-2 text-sm text-slate-700">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {result.warnings.length > 0 ? (
          <ul className="space-y-1.5 rounded-lg bg-amber-50 px-3 py-2" aria-label="Worth checking">
            {result.warnings.map((warning) => (
              <li key={warning} className="flex gap-2 text-sm text-amber-900">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <dl className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
          <Metric label="Est. cost" value={formatINRCompact(result.estimatedCostINR)} hint={platformLabel} />
          <Metric label="Est. reach" value={formatCount(result.estimatedReach)} hint="views" />
          <Metric label="Engagement" value={formatPercent(stats.engagementRate)} hint={platformLabel} />
        </dl>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">
        <ShortlistToggle creator={creator} />
        <button
          type="button"
          aria-expanded={open}
          aria-controls={breakdownId}
          onClick={() => setOpen((v) => !v)}
          className={buttonClasses("ghost", "sm")}
        >
          Why this score?
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
        <Link to={`/creators/${creator.id}`} className={buttonClasses("ghost", "sm", "ml-auto text-brand-700")}>
          Profile
          <ArrowRight className="size-4" aria-hidden="true" />
          <span className="sr-only">: {creator.name}</span>
        </Link>
      </div>

      {open ? (
        <div id={breakdownId} className="border-t border-slate-100 px-4 py-4 sm:px-5">
          <ScoreBreakdown components={result.components} />
        </div>
      ) : (
        <div id={breakdownId} hidden />
      )}
    </Card>
  );
}
