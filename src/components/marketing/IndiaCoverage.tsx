import { Info } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { creators } from "@/data/creators";
import { LANGUAGE_CODES, LANGUAGES, NICHES } from "@/data/taxonomy";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { computeCoverage } from "./coverage";

function CoverageStat({ label, value, hint }: { label: string; value: ReactNode; hint: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{value}</dd>
      <dd className="mt-1 text-sm text-slate-500">{hint}</dd>
    </div>
  );
}

/** Live counts from the demo dataset plus the supported languages in their own scripts. */
export function IndiaCoverage({ className }: { className?: string }) {
  const coverage = useMemo(() => computeCoverage(creators), []);
  const hasData = coverage.creators > 0;

  return (
    <div className={cn("space-y-10", className)}>
      <div>
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Info className="size-4 text-slate-500" aria-hidden="true" />
          In this demo dataset
        </h3>
        {hasData ? (
          <dl className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <CoverageStat label="Creators" value={formatNumber(coverage.creators)} hint="fictional profiles" />
            <CoverageStat
              label="Languages"
              value={formatNumber(coverage.languages)}
              hint={`of ${LANGUAGE_CODES.length} supported`}
            />
            <CoverageStat
              label="Cities"
              value={formatNumber(coverage.cities)}
              hint={`${formatNumber(coverage.nonMetroCities)} in tier 2 and 3`}
            />
            <CoverageStat label="Niches" value={formatNumber(coverage.niches)} hint={`of ${NICHES.length} categories`} />
          </dl>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-6 text-sm text-slate-500">
            Live counts appear here once the demo dataset is available in this build.
          </p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700">{LANGUAGE_CODES.length} content languages, in their own scripts</h3>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {LANGUAGE_CODES.map((code) => {
            const { label, native } = LANGUAGES[code];
            const count = coverage.creatorsByLanguage[code];
            return (
              <li key={code} className="flex flex-col rounded-xl border border-slate-200 bg-white px-4 py-3">
                <span lang={code} className="text-xl font-semibold leading-snug text-slate-900">
                  {native}
                </span>
                {native !== label ? <span className="text-sm text-slate-600">{label}</span> : null}
                {hasData ? (
                  <span className="mt-1 text-xs text-slate-500">
                    {count > 0 ? `${formatNumber(count)} ${count === 1 ? "creator" : "creators"}` : "No creators yet"}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
