import { Bot, Cog, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Label, Textarea } from "@/components/ui/form";
import { Spinner } from "@/components/ui/misc";
import { SAMPLE_BRIEFS, type SampleBrief } from "@/data/sampleBriefs";
import { DEFAULT_BRIEF, mergeBrief } from "@/lib/brief/defaults";
import { useBrief } from "@/state/BriefContext";
import { BriefEditor } from "./BriefEditor";

const PLACEHOLDER =
  "e.g. We're launching an Ayurvedic face serum for women aged 18-34 in Tamil Nadu and Telangana. Looking for 8 beauty creators who post Instagram reels in Tamil or Telugu. Budget ₹3 lakh. Skip anyone who worked with Glowleaf Naturals recently.";

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException ? error.name === "AbortError" : (error as { name?: unknown } | null)?.name === "AbortError";
}

export function BriefPanel() {
  const { brief, setBrief, updateBrief, briefText, setBriefText, lastParse, setLastParse, resetBrief } = useBrief();
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const textId = useId();
  const statusId = useId();

  useEffect(() => () => controllerRef.current?.abort(), []);

  function cancelPending() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setParsing(false);
  }

  async function analyse() {
    const text = briefText.trim();
    if (!text) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setParsing(true);
    setError(null);
    try {
      // Loaded on demand: the client pulls in zod, which the rest of the page doesn't need.
      const { parseBrief } = await import("@/lib/brief/client");
      const parsed = await parseBrief(text, { signal: controller.signal });
      if (controller.signal.aborted) return;
      // The text is the source of truth: start from a clean brief so nothing from an earlier brief or
      // sample (brand, regions, cities...) leaks into this one.
      setBrief(mergeBrief(DEFAULT_BRIEF, { ...parsed.brief, description: text }));
      setLastParse({ source: parsed.source, notes: parsed.notes });
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) return;
      setError("We couldn't read that brief. Try rephrasing it, or fill in the fields below.");
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setParsing(false);
      }
    }
  }

  function applySample(sample: SampleBrief) {
    cancelPending();
    setError(null);
    setBriefText(sample.text);
    setBrief(sample.brief);
    setLastParse(null);
  }

  function reset() {
    cancelPending();
    setError(null);
    resetBrief();
  }

  return (
    <Card className="flex flex-col">
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        <Label htmlFor={textId} className="text-base font-semibold text-slate-900">
          Describe your campaign
        </Label>
        <Textarea
          id={textId}
          value={briefText}
          onChange={(e) => setBriefText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={5}
          aria-describedby={statusId}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void analyse();
            }
          }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void analyse()} disabled={!briefText.trim() || parsing}>
            {parsing ? <Spinner className="size-4 text-white" /> : <Sparkles className="size-4" aria-hidden="true" />}
            Analyse brief
          </Button>
          <div id={statusId} role="status" aria-live="polite" className="text-sm text-slate-500">
            {parsing ? "Reading your brief…" : null}
          </div>
        </div>
        {error ? (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
        {lastParse && !parsing ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {lastParse.source === "ai" ? (
                <Badge tone="brand">
                  <Bot className="size-3.5" aria-hidden="true" />
                  Read by Claude
                </Badge>
              ) : (
                <Badge tone="neutral">
                  <Cog className="size-3.5" aria-hidden="true" />
                  Built-in parser
                </Badge>
              )}
              <span className="text-xs text-slate-500">Fields below were updated. Check them before you shortlist.</span>
            </div>
            {lastParse.notes.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
                {lastParse.notes.slice(0, 6).map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {SAMPLE_BRIEFS.length > 0 ? (
          <div className="flex flex-col gap-2 pt-1">
            <p id={`${textId}-samples`} className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Or try a sample brief
            </p>
            <ul className="flex flex-wrap gap-2" aria-labelledby={`${textId}-samples`}>
              {SAMPLE_BRIEFS.map((sample) => (
                <li key={sample.id}>
                  <button
                    type="button"
                    onClick={() => applySample(sample)}
                    className="cursor-pointer rounded-full border border-saffron-200 bg-saffron-50 px-3 py-1 text-left text-xs font-medium text-saffron-800 transition-colors hover:border-saffron-300 hover:bg-saffron-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                  >
                    {sample.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="border-t border-slate-100 px-4 pb-2 pt-3 sm:px-5">
        <div className="flex items-center justify-between gap-2 pb-1">
          <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">Brief details</h2>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset brief
          </Button>
        </div>
        <BriefEditor brief={brief} onChange={updateBrief} />
      </div>
    </Card>
  );
}
