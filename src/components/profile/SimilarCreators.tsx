import { Link } from "react-router";
import { TierBadge } from "@/components/creators/shared";
import { Avatar } from "@/components/ui/misc";
import { getCity, LANGUAGES, NICHE_LABELS } from "@/data/taxonomy";
import { formatCount } from "@/lib/format";
import type { Creator } from "@/types";

export function SimilarCreators({ creator, similar }: { creator: Creator; similar: Creator[] }) {
  if (similar.length === 0) return null;
  const niche = creator.niches[0];

  return (
    <section aria-labelledby="similar-heading" className="space-y-3">
      <h2 id="similar-heading" className="text-lg font-bold text-slate-900">
        Similar {niche ? NICHE_LABELS[niche].toLowerCase() : null} creators
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {similar.map((other) => {
          const primary = other.platforms[0];
          const city = getCity(other.homeCityId);
          return (
            <li key={other.id}>
              <Link
                to={`/creators/${other.id}`}
                className="flex h-full flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:border-brand-300 hover:shadow-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={other.name} hue={other.avatarHue} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{other.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      @{other.handle}
                      {city ? ` · ${city.name}` : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <TierBadge tier={other.tier} />
                  <span>{other.languages.map((code) => LANGUAGES[code].label).join(", ")}</span>
                  {primary ? <span className="tabular-nums">{formatCount(primary.followers)} followers</span> : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
