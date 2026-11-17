// What a page shows while the creator data is loading, missing or unreachable.
//
// The old demo dataset was always there, so no page had to handle its absence. Real data can be
// mid-ingestion or a failed request, and saying so plainly beats an empty table that looks like a
// genuine "no results".
import { CircleAlert, Database, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { CreatorsStatus } from "@/data/creatorStore";

export interface DatasetStateProps {
  status: CreatorsStatus;
  error?: string;
  onRetry?: () => void;
  /** What the page would be showing, e.g. "creators" or "this profile". */
  subject?: string;
}

/**
 * Returns null when the data is ready, so a caller can render it unconditionally above its content.
 */
export function DatasetState({ status, error, onRetry, subject = "creators" }: DatasetStateProps) {
  if (status === "ready") return null;

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-16 text-slate-600">
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        <span>Loading {subject}…</span>
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-slate-100 text-slate-500">
          <Database className="size-6" aria-hidden="true" />
        </span>
        <h2 className="text-lg font-semibold text-slate-900">No creators yet</h2>
        <p className="max-w-sm text-sm leading-relaxed text-slate-600">
          The database is empty. Creator data arrives when the ingestion job runs; it collects real
          Maharashtra creators from YouTube.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-rose-100 text-rose-600">
        <CircleAlert className="size-6" aria-hidden="true" />
      </span>
      <h2 className="text-lg font-semibold text-slate-900">Couldn&rsquo;t load {subject}</h2>
      <p className="max-w-sm text-sm leading-relaxed text-slate-600">{error ?? "The request failed."}</p>
      {onRetry ? (
        <Button onClick={onRetry} className="mt-1">
          Try again
        </Button>
      ) : null}
    </div>
  );
}
