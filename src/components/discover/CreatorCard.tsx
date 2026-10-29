import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { CreatorIdentity, PlatformBadge, TierBadge } from "@/components/creators/shared";
import { Metric, NicheBadges, ShortlistToggle } from "@/components/match/shared";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CREATOR_TIERS, LANGUAGES } from "@/data/taxonomy";
import { formatCount, formatINRCompact, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Creator } from "@/types";

/** Engagement relative to the creator's size tier: 1.0 means exactly the typical rate. */
export function engagementVsBenchmark(creator: Creator): number {
  const er = creator.platforms[0]?.engagementRate ?? 0;
  return er / CREATOR_TIERS[creator.tier].engagementBenchmark;
}

export function CreatorCard({ creator }: { creator: Creator }) {
  const primary = creator.platforms[0];
  const ratio = engagementVsBenchmark(creator);
  const auth = creator.authenticity.score;

  return (
    <Card className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <CreatorIdentity creator={creator} />
          <TierBadge tier={creator.tier} className="shrink-0" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {creator.platforms.map((p) => (
            <PlatformBadge key={p.platform} stats={p} />
          ))}
        </div>
        <NicheBadges niches={creator.niches} />
        <p className="text-xs text-slate-500">
          <span className="sr-only">Languages: </span>
          {creator.languages.map((code) => LANGUAGES[code].label).join(" · ")}
        </p>
        <dl className="mt-auto grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl bg-slate-50 px-3 py-2.5">
          <Metric label="Followers" value={formatCount(primary?.followers ?? 0)} />
          <Metric
            label="Engagement"
            value={formatPercent(primary?.engagementRate ?? 0)}
            hint={
              <span className={cn(ratio >= 1 ? "text-emerald-700" : "text-slate-500")}>
                {ratio.toFixed(1)}x tier norm
              </span>
            }
          />
          <Metric
            label="Authenticity"
            value={<span className={cn(auth >= 80 ? "text-emerald-700" : auth < 60 ? "text-rose-700" : "text-slate-900")}>{auth}/100</span>}
          />
          <Metric label="Reel fee" value={formatINRCompact(creator.rates.reel)} hint="estimate" />
        </dl>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3">
        <ShortlistToggle creator={creator} />
        <Link to={`/creators/${creator.id}`} className={buttonClasses("ghost", "sm", "ml-auto text-brand-700")}>
          Profile
          <ArrowRight className="size-4" aria-hidden="true" />
          <span className="sr-only">: {creator.name}</span>
        </Link>
      </div>
    </Card>
  );
}
