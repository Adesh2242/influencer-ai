import { Check, MapPin, Sparkles } from "lucide-react";
import { PlatformIcon } from "@/components/creators/shared";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/misc";
import { ScoreRing } from "@/components/ui/Score";
import { CITY_TIER_LABELS, CREATOR_TIERS, DELIVERABLES, getCity, LANGUAGES, NICHE_LABELS, PLATFORMS } from "@/data/taxonomy";
import { formatCount, formatINRCompact, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LanguageCode, Platform } from "@/types";

// A static illustration of the matching UI. The people are invented and deliberately shown with
// initials only; nothing here is read from the demo dataset, so it renders even when that is empty.

interface ExampleMatch {
  name: string;
  avatarHue: number;
  cityId: string;
  language: LanguageCode;
  platform: Platform;
  followers: number;
  score: number;
  reasons: string[];
  costINR: number;
  views: number;
}

const EXAMPLE_BRIEF =
  "Launching a millet snack in Tamil Nadu and Andhra. Need 8 food creators for Insta reels in Tamil and Telugu, mostly tier 2 cities. Budget ₹6 lakh.";

const EXAMPLE_FILTERS = [
  NICHE_LABELS.food,
  LANGUAGES.ta.label,
  LANGUAGES.te.label,
  CITY_TIER_LABELS[2],
  PLATFORMS.instagram.label,
  DELIVERABLES.reel.label,
  `${formatINRCompact(600_000)} budget`,
];

const EXAMPLE_MATCHES: ExampleMatch[] = [
  {
    name: "Kavya R.",
    avatarHue: 24,
    cityId: "coimbatore",
    language: "ta",
    platform: "instagram",
    followers: 48_200,
    score: 91,
    reasons: [
      "Tamil food reels with a mostly South Indian audience",
      `${formatPercent(4.9)} engagement vs ${formatPercent(CREATOR_TIERS.micro.engagementBenchmark)} for micro creators`,
    ],
    costINR: 28_000,
    views: 61_000,
  },
  {
    name: "Teja K.",
    avatarHue: 265,
    cityId: "vijayawada",
    language: "te",
    platform: "instagram",
    followers: 72_500,
    score: 78,
    reasons: ["Telugu home-cooking creator, audience mostly in tier 2 and 3 cities", "High audience authenticity, no competitor work"],
    costINR: 35_000,
    views: 84_000,
  },
];

function ExampleMatchCard({ match }: { match: ExampleMatch }) {
  const city = getCity(match.cityId);
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <Avatar name={match.name} hue={match.avatarHue} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{match.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-500">
            {city ? (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="size-3" aria-hidden="true" />
                {city.name}
              </span>
            ) : null}
            <span>{LANGUAGES[match.language].label}</span>
            <span className="inline-flex items-center gap-1">
              <PlatformIcon platform={match.platform} className="size-3.5" />
              <span className="sr-only">{PLATFORMS[match.platform].label}</span>
              {formatCount(match.followers)}
            </span>
          </p>
        </div>
        <ScoreRing score={match.score} size={48} strokeWidth={5} label="Example match score" />
      </div>
      <ul className="mt-3 space-y-1.5">
        {match.reasons.map((reason) => (
          <li key={reason} className="flex gap-2 text-xs leading-relaxed text-slate-600">
            <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
            {reason}
          </li>
        ))}
      </ul>
      <dl className="mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-xs">
        <div className="flex gap-1">
          <dt className="text-slate-500">Est. cost per reel</dt>
          <dd className="font-semibold text-slate-900">{formatINRCompact(match.costINR)}</dd>
        </div>
        <div className="flex gap-1">
          <dt className="text-slate-500">Est. views</dt>
          <dd className="font-semibold text-slate-900">{formatCount(match.views)}</dd>
        </div>
      </dl>
    </li>
  );
}

export function ProductPreview({ className }: { className?: string }) {
  return (
    <figure className={cn("relative", className)}>
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lift backdrop-blur sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Campaign brief</p>
          <Badge tone="accent">Example</Badge>
        </div>
        <blockquote className="mt-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-700">
          “{EXAMPLE_BRIEF}”
        </blockquote>
        <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <Sparkles className="size-3.5 text-brand-500" aria-hidden="true" />
          Filters read from the brief
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {EXAMPLE_FILTERS.map((filter) => (
            <li key={filter}>
              <Badge tone="brand">{filter}</Badge>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Top matches</p>
        <ol className="mt-2 space-y-3">
          {EXAMPLE_MATCHES.map((match) => (
            <ExampleMatchCard key={match.name} match={match} />
          ))}
        </ol>
      </div>
      <figcaption className="mt-3 text-center text-xs text-slate-500">
        Illustrative example. The creators shown are fictional.
      </figcaption>
    </figure>
  );
}
