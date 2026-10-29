import { Handshake } from "lucide-react";
import { PlatformIcon } from "@/components/creators/shared";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { PLATFORMS } from "@/data/taxonomy";
import { formatCount, formatINR, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Creator, Deliverable, PlatformStats } from "@/types";
import { compareEngagement, formatMonthsAgo, formatRatio } from "./helpers";

function StatRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-lg font-bold tabular-nums text-slate-900">{value}</dd>
      {hint ? <dd className="text-xs text-slate-500">{hint}</dd> : null}
    </div>
  );
}

function PlatformCard({ stats, primary }: { stats: PlatformStats; primary: boolean }) {
  const { tier, ratio } = compareEngagement(stats);
  const label = PLATFORMS[stats.platform].label;
  const above = ratio >= 1;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
            <PlatformIcon platform={stats.platform} />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-sm">{label}</CardTitle>
            <p className="truncate text-xs text-slate-500">@{stats.handle}</p>
          </div>
        </div>
        {primary ? <Badge tone="brand">Primary</Badge> : null}
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-4">
          <StatRow label="Followers" value={formatCount(stats.followers)} />
          <StatRow label="Avg. views" value={formatCount(stats.avgViews)} />
          <div className="col-span-2 flex flex-col gap-0.5 sm:col-span-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Engagement</dt>
            <dd className="text-lg font-bold tabular-nums text-slate-900">{formatPercent(stats.engagementRate)}</dd>
            {ratio > 0 ? (
              <dd className={cn("text-xs font-medium", above ? "text-emerald-700" : "text-amber-800")}>
                {formatRatio(ratio)} the {tier}-tier norm
              </dd>
            ) : null}
          </div>
          <StatRow label="Posts / month" value={String(stats.postsPerMonth)} />
        </dl>
      </CardContent>
    </Card>
  );
}

export function PlatformStatsSection({ creator }: { creator: Creator }) {
  return (
    <section aria-labelledby="platforms-heading" className="space-y-3">
      <h2 id="platforms-heading" className="text-lg font-bold text-slate-900">
        Platforms
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {creator.platforms.map((stats, index) => (
          <PlatformCard key={stats.platform} stats={stats} primary={index === 0} />
        ))}
      </div>
    </section>
  );
}

const RATE_ROWS: { key: Deliverable; label: string }[] = [
  { key: "reel", label: "Reel / Short" },
  { key: "story", label: "Story" },
  { key: "post", label: "Static or carousel post" },
  { key: "video", label: "YouTube integration" },
];

export function RateCardSection({ creator }: { creator: Creator }) {
  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-slate-900">Indicative rate card</h2>
        <CardDescription>Estimated fees per deliverable before GST. Final rates are agreed with the creator.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-slate-100">
          {RATE_ROWS.map(({ key, label }) => {
            const fee = creator.rates[key];
            return (
              <div key={key} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                <dt className="text-sm text-slate-600">{label}</dt>
                <dd className={cn("text-sm tabular-nums", fee === null ? "text-slate-400" : "font-semibold text-slate-900")}>
                  {fee === null ? "No YouTube channel" : `~${formatINR(fee)}`}
                </dd>
              </div>
            );
          })}
        </dl>
      </CardContent>
    </Card>
  );
}

export function CollaborationsSection({ creator }: { creator: Creator }) {
  const collaborations = [...creator.collaborations].sort((a, b) => a.monthsAgo - b.monthsAgo);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-slate-900">Past collaborations</h2>
        <CardDescription>Fictional demo brands.</CardDescription>
      </CardHeader>
      <CardContent>
        {collaborations.length === 0 ? (
          <p className="text-sm text-slate-500">No brand collaborations on record yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {collaborations.map((collab) => (
              <li key={`${collab.brand}-${collab.monthsAgo}`} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-saffron-50 text-saffron-700">
                  <Handshake className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{collab.brand}</p>
                  <p className="truncate text-xs text-slate-500">{collab.category}</p>
                </div>
                <span className="shrink-0 text-xs text-slate-500">{formatMonthsAgo(collab.monthsAgo)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
