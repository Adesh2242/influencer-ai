import { Bookmark, BookmarkCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button, type ButtonSize } from "@/components/ui/Button";
import { NICHE_LABELS } from "@/data/taxonomy";
import { cn } from "@/lib/utils";
import { useShortlist } from "@/state/ShortlistContext";
import type { Creator, Niche } from "@/types";

/** Bookmark toggle wired to the shortlist. The name keeps the button label unique in long lists. */
export function ShortlistToggle({ creator, size = "sm", className }: { creator: Creator; size?: ButtonSize; className?: string }) {
  const { has, toggle } = useShortlist();
  const saved = has(creator.id);
  const Icon = saved ? BookmarkCheck : Bookmark;
  return (
    <Button
      variant={saved ? "secondary" : "outline"}
      size={size}
      aria-pressed={saved}
      onClick={() => toggle(creator.id)}
      className={className}
    >
      <Icon className="size-4" aria-hidden="true" />
      {saved ? "Shortlisted" : "Add to shortlist"}
      <span className="sr-only">: {creator.name}</span>
    </Button>
  );
}

export function NicheBadges({ niches, className }: { niches: readonly Niche[]; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)} aria-label="Niches">
      {niches.map((niche, index) => (
        <li key={niche}>
          <Badge tone={index === 0 ? "accent" : "neutral"}>{NICHE_LABELS[niche]}</Badge>
        </li>
      ))}
    </ul>
  );
}

/** Compact label/value pair used in the card metric rows. */
export function Metric({ label, value, hint, className }: { label: ReactNode; value: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="truncate text-xs text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums text-slate-900">{value}</dd>
      {hint ? <dd className="truncate text-xs text-slate-500">{hint}</dd> : null}
    </div>
  );
}
