import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface StepProps {
  step: number;
  icon: LucideIcon;
  title: ReactNode;
  children: ReactNode;
  /** Small illustration pinned to the bottom of the card. */
  visual?: ReactNode;
  className?: string;
}

/** One numbered step of a process. Render inside an <ol>. */
export function Step({ step, icon: Icon, title, children, visual, className }: StepProps) {
  return (
    <li className={cn("flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card", className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
          <span className="sr-only">Step </span>
          {step}
        </span>
        <Icon className="size-6 text-brand-500" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <div className="text-sm leading-relaxed text-slate-600">{children}</div>
      {visual ? <div className="mt-auto pt-2">{visual}</div> : null}
    </li>
  );
}
