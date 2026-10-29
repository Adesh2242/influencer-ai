import { statsForResult } from "@/components/profile/helpers";
import { getCity, LANGUAGES, PLATFORMS } from "@/data/taxonomy";
import { downloadCSV, toCSV, type CSVColumn } from "@/lib/csv";
import type { MatchResult } from "@/types";

function shortlistColumns(origin: string): CSVColumn<MatchResult>[] {
  return [
    { header: "Name", value: (r) => r.creator.name },
    { header: "Handle", value: (r) => `@${statsForResult(r)?.handle ?? r.creator.handle}` },
    { header: "Platform", value: (r) => PLATFORMS[r.platform].label },
    { header: "Followers", value: (r) => statsForResult(r)?.followers ?? null },
    { header: "Engagement %", value: (r) => statsForResult(r)?.engagementRate ?? null },
    { header: "Authenticity", value: (r) => r.creator.authenticity.score },
    { header: "Estimated cost INR", value: (r) => Math.round(r.estimatedCostINR) },
    { header: "Estimated reach", value: (r) => Math.round(r.estimatedReach) },
    { header: "Match score", value: (r) => Math.round(r.score) },
    { header: "City", value: (r) => getCity(r.creator.homeCityId)?.name ?? "" },
    { header: "Languages", value: (r) => r.creator.languages.map((code) => LANGUAGES[code].label).join("; ") },
    { header: "Profile URL", value: (r) => `${origin}/creators/${encodeURIComponent(r.creator.id)}` },
    { header: "Filtered out because", value: (r) => r.excludedReason ?? "" },
  ];
}

export function shortlistToCSV(results: readonly MatchResult[], origin: string): string {
  return toCSV(results, shortlistColumns(origin));
}

/** Downloads the shortlist as "influencerai-shortlist-YYYY-MM-DD.csv". Browser only. */
export function downloadShortlistCSV(results: readonly MatchResult[]): void {
  const date = new Date();
  const stamp = [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((n) => String(n).padStart(2, "0")).join("-");
  downloadCSV(`influencerai-shortlist-${stamp}.csv`, shortlistToCSV(results, window.location.origin));
}
