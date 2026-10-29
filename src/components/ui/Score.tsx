import type { ReactNode } from "react";
import { clamp, cn } from "@/lib/utils";

export type ScoreTone = "success" | "brand" | "warning" | "danger";

/** Shared thresholds so every score in the app is colored the same way. */
export function scoreTone(score: number): ScoreTone {
  if (score >= 80) return "success";
  if (score >= 65) return "brand";
  if (score >= 50) return "warning";
  return "danger";
}

const ringColors: Record<ScoreTone, string> = {
  success: "text-emerald-500",
  brand: "text-brand-500",
  warning: "text-amber-500",
  danger: "text-rose-500",
};

const barColors: Record<ScoreTone | "neutral", string> = {
  success: "bg-emerald-500",
  brand: "bg-brand-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  neutral: "bg-slate-400",
};

export interface ScoreRingProps {
  /** 0-100. */
  score: number;
  size?: number;
  strokeWidth?: number;
  /** Accessible label prefix, e.g. "Match score". */
  label?: string;
  className?: string;
}

export function ScoreRing({ score, size = 56, strokeWidth = 6, label = "Match score", className }: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = clamp(score, 0, 100) / 100;
  const rounded = Math.round(score);

  return (
    <div
      role="img"
      aria-label={`${label}: ${rounded} out of 100`}
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={strokeWidth} className="stroke-slate-200" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          className={cn("transition-[stroke-dashoffset] duration-500", ringColors[scoreTone(score)])}
        />
      </svg>
      <span className="absolute font-bold tabular-nums text-slate-900" style={{ fontSize: Math.max(11, size * 0.28) }}>
        {rounded}
      </span>
    </div>
  );
}

export interface MeterProps {
  value: number;
  max?: number;
  label?: ReactNode;
  valueLabel?: ReactNode;
  /** Defaults to the score tone of value/max as a percentage. */
  tone?: ScoreTone | "neutral";
  className?: string;
}

/** Horizontal bar with an optional label row above it. */
export function Meter({ value, max = 100, label, valueLabel, tone, className }: MeterProps) {
  const percent = max > 0 ? clamp((value / max) * 100, 0, 100) : 0;
  const resolvedTone = tone ?? scoreTone(percent);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label !== undefined || valueLabel !== undefined ? (
        <div className="flex items-baseline justify-between gap-3 text-xs">
          <span className="min-w-0 truncate text-slate-600">{label}</span>
          <span className="shrink-0 font-semibold tabular-nums text-slate-900">{valueLabel}</span>
        </div>
      ) : null}
      <div
        role="meter"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={typeof label === "string" ? label : undefined}
        className="h-2 overflow-hidden rounded-full bg-slate-100"
      >
        <div className={cn("h-full rounded-full transition-[width] duration-500", barColors[resolvedTone])} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
