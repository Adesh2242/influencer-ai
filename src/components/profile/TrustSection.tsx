import { CircleAlert, CircleCheck, Clock, Reply } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/Card";
import { ScoreRing } from "@/components/ui/Score";
import { formatPercent, formatShare } from "@/lib/format";
import type { Creator } from "@/types";
import { plural } from "./helpers";

function Flags({ flags, clean }: { flags: string[]; clean: string }) {
  if (flags.length === 0) {
    return (
      <p className="flex items-start gap-1.5 text-sm text-emerald-700">
        <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {clean}
      </p>
    );
  }
  return (
    <ul className="space-y-1.5">
      {flags.map((flag) => (
        <li key={flag} className="flex items-start gap-1.5 text-sm text-amber-800">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {flag}
        </li>
      ))}
    </ul>
  );
}

export function TrustSection({ creator }: { creator: Creator }) {
  const { authenticity, brandSafety } = creator;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-semibold text-slate-900">Trust and reliability</h2>
        <CardDescription>Modelled signals: worth a human check before you sign.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start gap-4">
          <ScoreRing score={authenticity.score} size={64} label="Authenticity" />
          <div className="min-w-0 space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">Audience authenticity</h3>
            <p className="text-sm text-slate-600">
              About <span className="font-semibold text-slate-900">{formatPercent(authenticity.suspiciousFollowerPct, 0)}</span> of
              followers look suspicious (bots, inactive or bought).
            </p>
            <Flags flags={authenticity.flags} clean="No unusual follower patterns." />
          </div>
        </div>

        <div className="flex items-start gap-4">
          <ScoreRing score={brandSafety.score} size={64} label="Brand safety" />
          <div className="min-w-0 space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">Brand safety</h3>
            <Flags flags={brandSafety.flags} clean="No brand-safety concerns in recent content." />
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
              <Reply className="size-3.5" aria-hidden="true" />
              Response rate
            </dt>
            <dd className="mt-1 text-lg font-bold tabular-nums text-slate-900">{formatShare(creator.responseRate)}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
              <Clock className="size-3.5" aria-hidden="true" />
              Turnaround
            </dt>
            <dd className="mt-1 text-lg font-bold tabular-nums text-slate-900">{plural(creator.avgTurnaroundDays, "day")}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
