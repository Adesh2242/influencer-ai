import { LoaderCircle, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface StatProps {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}

export function Stat({ label, value, hint, icon: Icon, className }: StatProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
        {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
        {label}
      </div>
      <div className="text-xl font-bold tabular-nums text-slate-900">{value}</div>
      {hint ? <div className="text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600">
          <Icon className="size-6" aria-hidden="true" />
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description ? <p className="max-w-md text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export interface TabsProps<T extends string> {
  tabs: readonly { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the control. */
  label: string;
  className?: string;
}

/** Segmented control for switching between a few views. */
export function Tabs<T extends string>({ tabs, value, onChange, label, className }: TabsProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-lg bg-slate-100 p-1", className)}>
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              "cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
              active ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

const avatarSizes = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-20 text-2xl",
} as const;

export interface AvatarProps {
  name: string;
  /** 0-359. */
  hue: number;
  size?: keyof typeof avatarSizes;
  className?: string;
}

/** Initials on a gradient: demo creators have no photos. */
export function Avatar({ name, hue, size = "md", className }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <div
      aria-hidden="true"
      className={cn("grid shrink-0 select-none place-items-center rounded-full font-bold text-white", avatarSizes[size], className)}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 72% 56%), hsl(${(hue + 40) % 360} 74% 40%))` }}
    >
      {initials}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn("size-5 animate-spin text-brand-600", className)} aria-hidden="true" />;
}

export function PageLoader() {
  return (
    <div className="grid min-h-[50vh] place-items-center" role="status" aria-live="polite">
      <div className="flex items-center gap-3 text-sm text-slate-500">
        <Spinner />
        Loading…
      </div>
    </div>
  );
}
