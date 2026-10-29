import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Full-width page band with consistent vertical rhythm; children sit in the centred page column. */
export function Section({ className, children, ...props }: ComponentProps<"section">) {
  return (
    <section className={cn("scroll-mt-20 py-16 sm:py-20", className)} {...props}>
      <div className="container-page">{children}</div>
    </section>
  );
}

export interface SectionHeadingProps {
  /** id of the <h2>, for the section's aria-labelledby. */
  id?: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeading({ id, eyebrow, title, description, align = "left", className }: SectionHeadingProps) {
  return (
    <div className={cn("max-w-2xl space-y-3", align === "center" && "mx-auto text-center", className)}>
      {eyebrow ? <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">{eyebrow}</p> : null}
      <h2 id={id} className="text-2xl font-extrabold tracking-tight text-balance text-slate-900 sm:text-3xl">
        {title}
      </h2>
      {description ? <p className="text-base leading-relaxed text-slate-600">{description}</p> : null}
    </div>
  );
}
