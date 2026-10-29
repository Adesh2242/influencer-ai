import { useId } from "react";
import { Field, Select } from "@/components/ui/form";
import { NumberInput } from "@/components/match/fields";
import {
  CITY_TIER_LABELS,
  CITY_TIER_LIST,
  CREATOR_TIER_LIST,
  CREATOR_TIERS,
  LANGUAGE_CODES,
  LANGUAGES,
  NICHE_LABELS,
  NICHES,
  PLATFORM_LIST,
  PLATFORMS,
  REGION_LIST,
  REGIONS,
} from "@/data/taxonomy";
import type { CityTier } from "@/types";
import type { DiscoverQuery } from "./query";

interface Option {
  value: string;
  label: string;
}

const NICHE_OPTIONS: Option[] = NICHES.map((n) => ({ value: n, label: NICHE_LABELS[n] }));
const LANGUAGE_OPTIONS: Option[] = LANGUAGE_CODES.map((c) => ({
  value: c,
  label: LANGUAGES[c].native === LANGUAGES[c].label ? LANGUAGES[c].label : `${LANGUAGES[c].label} (${LANGUAGES[c].native})`,
}));
const PLATFORM_OPTIONS: Option[] = PLATFORM_LIST.map((p) => ({ value: p, label: PLATFORMS[p].label }));
const TIER_OPTIONS: Option[] = CREATOR_TIER_LIST.map((t) => ({ value: t, label: CREATOR_TIERS[t].label }));
const CITY_TIER_OPTIONS: Option[] = CITY_TIER_LIST.map((t) => ({ value: String(t), label: CITY_TIER_LABELS[t] }));
const REGION_OPTIONS: Option[] = REGION_LIST.map((r) => ({ value: r, label: REGIONS[r].label }));

function FilterSelect({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: Option[]; onChange: (value: string) => void }) {
  return (
    <Field label={label} htmlFor={id}>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Any</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export function DiscoverFilters({ query, onChange }: { query: DiscoverQuery; onChange: (patch: Partial<DiscoverQuery>) => void }) {
  const id = useId();
  const f = (name: string) => `${id}-${name}`;

  return (
    <div className="flex flex-col gap-4">
      <FilterSelect id={f("niche")} label="Niche" value={query.niche ?? ""} options={NICHE_OPTIONS} onChange={(v) => onChange({ niche: (v || null) as DiscoverQuery["niche"] })} />
      <FilterSelect id={f("lang")} label="Language" value={query.lang ?? ""} options={LANGUAGE_OPTIONS} onChange={(v) => onChange({ lang: (v || null) as DiscoverQuery["lang"] })} />
      <FilterSelect
        id={f("platform")}
        label="Platform"
        value={query.platform ?? ""}
        options={PLATFORM_OPTIONS}
        onChange={(v) => onChange({ platform: (v || null) as DiscoverQuery["platform"] })}
      />
      <FilterSelect id={f("tier")} label="Creator size" value={query.tier ?? ""} options={TIER_OPTIONS} onChange={(v) => onChange({ tier: (v || null) as DiscoverQuery["tier"] })} />
      <FilterSelect
        id={f("cityTier")}
        label="Home city tier"
        value={query.cityTier ? String(query.cityTier) : ""}
        options={CITY_TIER_OPTIONS}
        onChange={(v) => onChange({ cityTier: v ? (Number(v) as CityTier) : null })}
      />
      <FilterSelect id={f("region")} label="Region" value={query.region ?? ""} options={REGION_OPTIONS} onChange={(v) => onChange({ region: (v || null) as DiscoverQuery["region"] })} />
      <Field label="Min. engagement rate (%)" htmlFor={f("er")}>
        <NumberInput id={f("er")} value={query.minEr} emptyValue={0} min={0} max={20} step={0.5} placeholder="Any" onValueChange={(minEr) => onChange({ minEr })} />
      </Field>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor={f("auth")} className="text-sm font-medium text-slate-700">
            Min. authenticity
          </label>
          <output htmlFor={f("auth")} className="text-sm font-semibold tabular-nums text-slate-900">
            {query.minAuth > 0 ? query.minAuth : "Any"}
          </output>
        </div>
        <input
          id={f("auth")}
          type="range"
          min={0}
          max={100}
          step={5}
          value={query.minAuth}
          onChange={(e) => onChange({ minAuth: Number(e.target.value) })}
          className="h-6 w-full cursor-pointer accent-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        />
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={query.verified}
          onChange={(e) => onChange({ verified: e.target.checked })}
          className="size-4 cursor-pointer rounded accent-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
        />
        Verified creators only
      </label>
    </div>
  );
}
