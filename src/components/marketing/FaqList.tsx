import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface FaqItem {
  question: string;
  answer: ReactNode;
}

/** Native <details> disclosures: keyboard and screen-reader support come from the browser. */
export function FaqList({ items, className }: { items: readonly FaqItem[]; className?: string }) {
  return (
    <div className={cn("divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-card", className)}>
      {items.map((item) => (
        <details key={item.question} className="group px-5 sm:px-6">
          <summary
            className={cn(
              "-mx-2 my-2 flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-2 py-3 font-semibold text-slate-900",
              "hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
              "[&::-webkit-details-marker]:hidden",
            )}
          >
            {item.question}
            <ChevronDown className="size-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="space-y-3 pb-5 text-sm leading-relaxed text-slate-600">{item.answer}</div>
        </details>
      ))}
    </div>
  );
}
