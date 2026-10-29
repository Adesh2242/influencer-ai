import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const iconTones = {
  brand: "bg-brand-50 text-brand-600 ring-brand-100",
  accent: "bg-saffron-50 text-saffron-600 ring-saffron-100",
} as const;

export interface FeatureCardProps {
  icon: LucideIcon;
  title: ReactNode;
  children: ReactNode;
  tone?: keyof typeof iconTones;
  className?: string;
}

/** Icon, title and a short description. Render inside a list item when shown in a grid. */
export function FeatureCard({ icon: Icon, title, children, tone = "brand", className }: FeatureCardProps) {
  return (
    <Card className={cn("flex h-full flex-col gap-3 p-6", className)}>
      <span className={cn("grid size-11 place-items-center rounded-xl ring-1 ring-inset", iconTones[tone])}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <CardTitle className="mt-1">{title}</CardTitle>
      <div className="text-sm leading-relaxed text-slate-600">{children}</div>
    </Card>
  );
}
