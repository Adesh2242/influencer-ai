import { ChevronDown } from "lucide-react";
import { useState, type ComponentProps, type ReactNode } from "react";
import { Input } from "@/components/ui/form";

/** Collapsible group of controls. Native <details> keeps it keyboard and screen-reader friendly. */
export function EditorSection({ title, summary, defaultOpen = false, children }: { title: string; summary?: string; defaultOpen?: boolean; children: ReactNode }) {
  return (
    <details open={defaultOpen} className="group border-t border-slate-100 first:border-t-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg px-1 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 [&::-webkit-details-marker]:hidden">
        <span className="text-sm font-semibold text-slate-900">{title}</span>
        {summary ? <span className="min-w-0 flex-1 truncate text-xs text-slate-500">{summary}</span> : <span className="flex-1" />}
        <ChevronDown className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="flex flex-col gap-4 px-1 pb-5 pt-1">{children}</div>
    </details>
  );
}

/** Heading for a ChipGroup, which is a role="group" rather than a labellable control. */
export function GroupLabel({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-sm font-medium text-slate-700">{children}</span>
      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </div>
  );
}

export interface NumberInputProps extends Omit<ComponentProps<"input">, "value" | "onChange" | "type" | "min" | "max"> {
  value: number;
  onValueChange: (value: number) => void;
  min: number;
  max: number;
  /** Shown (as an empty field) for this value, e.g. 0 meaning "not set". */
  emptyValue?: number;
}

/**
 * A number field that lets people clear and retype freely: the draft text is kept locally and only
 * in-range values are committed. On blur the field snaps back to the committed value.
 */
export function NumberInput({ value, onValueChange, min, max, emptyValue, onBlur, ...props }: NumberInputProps) {
  const display = (v: number) => (emptyValue !== undefined && v === emptyValue ? "" : String(v));
  const [draft, setDraft] = useState(() => display(value));
  const [synced, setSynced] = useState(value);

  // An outside change (a parsed brief, a reset) replaces whatever was being typed.
  if (synced !== value) {
    setSynced(value);
    if (Number(draft) !== value || draft === "") setDraft(display(value));
  }

  return (
    <Input
      {...props}
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      value={draft}
      onChange={(event) => {
        const text = event.target.value;
        setDraft(text);
        if (text === "" && emptyValue !== undefined) {
          setSynced(emptyValue);
          onValueChange(emptyValue);
          return;
        }
        const next = Number(text);
        if (text !== "" && Number.isFinite(next) && next >= min && next <= max) {
          setSynced(next);
          onValueChange(next);
        }
      }}
      onBlur={(event) => {
        setDraft(display(value));
        onBlur?.(event);
      }}
    />
  );
}
