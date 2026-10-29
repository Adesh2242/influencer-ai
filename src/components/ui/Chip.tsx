import { Check } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export interface ToggleChipProps extends ComponentProps<"button"> {
  pressed: boolean;
}

export function ToggleChip({ pressed, className, children, ...props }: ToggleChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
        pressed
          ? "border-brand-600 bg-brand-600 text-white hover:bg-brand-700"
          : "border-slate-300 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50",
        className,
      )}
      {...props}
    >
      {pressed ? <Check className="size-3.5" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export interface ChipOption<T extends string | number> {
  value: T;
  label: string;
  /** Shown as a native tooltip. */
  hint?: string;
}

export interface ChipGroupProps<T extends string | number> {
  options: readonly ChipOption<T>[];
  value: readonly T[];
  onChange: (next: T[]) => void;
  /** Accessible name for the group. */
  label: string;
  /** Maximum number of selected chips. */
  max?: number;
  className?: string;
}

/** Multi-select as a row of toggle chips. Selection order follows the options order. */
export function ChipGroup<T extends string | number>({ options, value, onChange, label, max, className }: ChipGroupProps<T>) {
  function toggle(option: T) {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else if (max === undefined || value.length < max) {
      const next = new Set<T>([...value, option]);
      onChange(options.map((o) => o.value).filter((v) => next.has(v)));
    }
  }

  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => (
        <ToggleChip
          key={String(option.value)}
          pressed={value.includes(option.value)}
          onClick={() => toggle(option.value)}
          title={option.hint}
        >
          {option.label}
        </ToggleChip>
      ))}
    </div>
  );
}
