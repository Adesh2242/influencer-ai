import { useId, useState } from "react";
import { ChipGroup } from "@/components/ui/Chip";
import { Field, Input, Select } from "@/components/ui/form";
import { Tabs } from "@/components/ui/misc";
import {
  AGE_BAND_LABELS,
  AGE_BANDS,
  CITY_TIER_LABELS,
  CITY_TIER_LIST,
  CREATOR_TIER_LIST,
  CREATOR_TIERS,
  DELIVERABLE_LIST,
  DELIVERABLES,
  GENDER_LABELS,
  GOAL_LIST,
  GOALS,
  LANGUAGE_CODES,
  LANGUAGES,
  NICHE_LABELS,
  NICHES,
  PLATFORM_LIST,
  PLATFORMS,
  REGION_LIST,
  REGIONS,
} from "@/data/taxonomy";
import { formatINR, formatINRCompact } from "@/lib/format";
import type { CampaignBrief, CampaignGoal, Deliverable, Gender } from "@/types";
import { CityPicker } from "./CityPicker";
import { EditorSection, GroupLabel, NumberInput } from "./fields";

const NICHE_OPTIONS = NICHES.map((n) => ({ value: n, label: NICHE_LABELS[n] }));
const PLATFORM_OPTIONS = PLATFORM_LIST.map((p) => ({ value: p, label: PLATFORMS[p].label }));
const AGE_OPTIONS = AGE_BANDS.map((a) => ({ value: a, label: AGE_BAND_LABELS[a] }));
const LANGUAGE_OPTIONS = LANGUAGE_CODES.map((code) => {
  const { label, native } = LANGUAGES[code];
  return { value: code, label: native === label ? label : `${label} · ${native}` };
});
const REGION_OPTIONS = REGION_LIST.map((r) => ({ value: r, label: REGIONS[r].label }));
const CITY_TIER_OPTIONS = CITY_TIER_LIST.map((t) => ({ value: t, label: CITY_TIER_LABELS[t] }));
const CREATOR_TIER_OPTIONS = CREATOR_TIER_LIST.map((t) => ({ value: t, label: CREATOR_TIERS[t].label }));
const GENDER_TABS = (["any", "female", "male"] as const).map((g) => ({ value: g, label: GENDER_LABELS[g] }));

function parseBrands(text: string): string[] {
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** Comma-separated text that keeps half-typed input ("Brand A, ") while committing a clean array. */
function BrandsInput({ id, value, onChange }: { id: string; value: string[]; onChange: (brands: string[]) => void }) {
  const [draft, setDraft] = useState(() => value.join(", "));
  if (!sameList(parseBrands(draft), value)) setDraft(value.join(", "));
  return (
    <Input
      id={id}
      value={draft}
      placeholder="e.g. Glowleaf Naturals, TressTonic"
      onChange={(event) => {
        setDraft(event.target.value);
        onChange(parseBrands(event.target.value));
      }}
    />
  );
}

function listSummary(labels: string[], empty = "Any"): string {
  if (labels.length === 0) return empty;
  return labels.length > 2 ? `${labels.slice(0, 2).join(", ")} +${labels.length - 2}` : labels.join(", ");
}

export interface BriefEditorProps {
  brief: CampaignBrief;
  onChange: (patch: Partial<CampaignBrief>) => void;
}

/** Every brief field as a labelled control, grouped into collapsible sections. */
export function BriefEditor({ brief, onChange }: BriefEditorProps) {
  const id = useId();
  const f = (name: string) => `${id}-${name}`;

  return (
    <div className="flex flex-col">
      <EditorSection title="Brand & goal" summary={[brief.brandName, GOALS[brief.goal].label].filter(Boolean).join(" · ")}>
        <Field label="Brand name" htmlFor={f("brand")}>
          <Input id={f("brand")} value={brief.brandName} placeholder="e.g. Kesarbloom Ayurveda" onChange={(e) => onChange({ brandName: e.target.value })} />
        </Field>
        <Field label="Product category" htmlFor={f("category")}>
          <Input
            id={f("category")}
            value={brief.productCategory}
            placeholder="e.g. Ayurvedic skincare"
            onChange={(e) => onChange({ productCategory: e.target.value })}
          />
        </Field>
        <Field label="Campaign goal" htmlFor={f("goal")} hint={GOALS[brief.goal].description}>
          <Select id={f("goal")} value={brief.goal} onChange={(e) => onChange({ goal: e.target.value as CampaignGoal })}>
            {GOAL_LIST.map((g) => (
              <option key={g} value={g}>
                {GOALS[g].label}
              </option>
            ))}
          </Select>
        </Field>
      </EditorSection>

      <EditorSection title="Content" summary={listSummary(brief.niches.map((n) => NICHE_LABELS[n]), "Any niche")} defaultOpen>
        <div className="flex flex-col gap-2">
          <GroupLabel hint="Up to 3">Niches</GroupLabel>
          <ChipGroup label="Niches" options={NICHE_OPTIONS} value={brief.niches} onChange={(niches) => onChange({ niches })} max={3} />
        </div>
        <div className="flex flex-col gap-2">
          <GroupLabel hint="None selected means any">Platforms</GroupLabel>
          <ChipGroup label="Platforms" options={PLATFORM_OPTIONS} value={brief.platforms} onChange={(platforms) => onChange({ platforms })} />
        </div>
        <Field label="Deliverable" htmlFor={f("deliverable")} hint={DELIVERABLES[brief.deliverable].description}>
          <Select id={f("deliverable")} value={brief.deliverable} onChange={(e) => onChange({ deliverable: e.target.value as Deliverable })}>
            {DELIVERABLE_LIST.map((d) => (
              <option key={d} value={d}>
                {DELIVERABLES[d].label}
              </option>
            ))}
          </Select>
        </Field>
      </EditorSection>

      <EditorSection
        title="Audience"
        summary={[GENDER_LABELS[brief.targetGender], ...brief.targetAges, ...brief.languages.map((l) => LANGUAGES[l].label)].join(", ")}
      >
        <div className="flex flex-col gap-2">
          <GroupLabel>Audience gender</GroupLabel>
          <Tabs<Gender | "any"> label="Audience gender" tabs={GENDER_TABS} value={brief.targetGender} onChange={(targetGender) => onChange({ targetGender })} />
        </div>
        <div className="flex flex-col gap-2">
          <GroupLabel>Age groups</GroupLabel>
          <ChipGroup label="Age groups" options={AGE_OPTIONS} value={brief.targetAges} onChange={(targetAges) => onChange({ targetAges })} />
        </div>
        <div className="flex flex-col gap-2">
          <GroupLabel>Content languages</GroupLabel>
          <ChipGroup label="Content languages" options={LANGUAGE_OPTIONS} value={brief.languages} onChange={(languages) => onChange({ languages })} />
        </div>
      </EditorSection>

      <EditorSection
        title="Geography"
        summary={listSummary(
          [...brief.targetRegions.map((r) => REGIONS[r].label), ...brief.targetTiers.map((t) => `Tier ${t}`)],
          brief.targetCityIds.length > 0 ? `${brief.targetCityIds.length} cities` : "Pan-India",
        )}
      >
        <div className="flex flex-col gap-2">
          <GroupLabel>Regions</GroupLabel>
          <ChipGroup label="Regions" options={REGION_OPTIONS} value={brief.targetRegions} onChange={(targetRegions) => onChange({ targetRegions })} />
        </div>
        <div className="flex flex-col gap-2">
          <GroupLabel>City tiers</GroupLabel>
          <ChipGroup label="City tiers" options={CITY_TIER_OPTIONS} value={brief.targetTiers} onChange={(targetTiers) => onChange({ targetTiers })} />
        </div>
        <CityPicker value={brief.targetCityIds} onChange={(targetCityIds) => onChange({ targetCityIds })} />
      </EditorSection>

      <EditorSection
        title="Budget"
        summary={`${brief.budgetINR > 0 ? formatINRCompact(brief.budgetINR) : "No budget"} · ${brief.creatorsWanted} creators`}
        defaultOpen
      >
        <Field
          label="Total budget (₹)"
          htmlFor={f("budget")}
          hint={
            brief.budgetINR > 0
              ? `${formatINR(brief.budgetINR)} (${formatINRCompact(brief.budgetINR)}), about ${formatINRCompact(brief.budgetINR / Math.max(1, brief.creatorsWanted))} per creator`
              : "Leave empty if you have no fixed budget yet"
          }
        >
          <NumberInput
            id={f("budget")}
            value={brief.budgetINR}
            emptyValue={0}
            min={0}
            max={1_000_000_000}
            step={10_000}
            placeholder="e.g. 500000"
            onValueChange={(budgetINR) => onChange({ budgetINR })}
          />
        </Field>
        <Field label="Creators wanted" htmlFor={f("count")} hint="Between 1 and 100">
          <NumberInput id={f("count")} value={brief.creatorsWanted} min={1} max={100} step={1} onValueChange={(creatorsWanted) => onChange({ creatorsWanted })} />
        </Field>
        <div className="flex flex-col gap-2">
          <GroupLabel hint="None selected means any">Creator size</GroupLabel>
          <ChipGroup label="Creator size" options={CREATOR_TIER_OPTIONS} value={brief.creatorTiers} onChange={(creatorTiers) => onChange({ creatorTiers })} />
        </div>
      </EditorSection>

      <EditorSection
        title="Filters"
        summary={`Authenticity ${brief.minAuthenticity}+${brief.minEngagementRate > 0 ? ` · ER ${brief.minEngagementRate}%+` : ""}${
          brief.excludeBrands.length > 0 ? ` · ${brief.excludeBrands.length} excluded` : ""
        }`}
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor={f("auth")} className="text-sm font-medium text-slate-700">
              Minimum authenticity
            </label>
            <output htmlFor={f("auth")} className="text-sm font-semibold tabular-nums text-slate-900">
              {brief.minAuthenticity}
            </output>
          </div>
          <input
            id={f("auth")}
            type="range"
            min={0}
            max={100}
            step={5}
            value={brief.minAuthenticity}
            onChange={(e) => onChange({ minAuthenticity: Number(e.target.value) })}
            className="h-6 w-full cursor-pointer accent-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          />
          <p className="text-xs text-slate-500">Creators below this audience-authenticity score are excluded.</p>
        </div>
        <Field label="Minimum engagement rate (%)" htmlFor={f("er")} hint="0 means no minimum">
          <NumberInput
            id={f("er")}
            value={brief.minEngagementRate}
            min={0}
            max={20}
            step={0.1}
            onValueChange={(minEngagementRate) => onChange({ minEngagementRate })}
          />
        </Field>
        <Field label="Exclude competitors" htmlFor={f("exclude")} hint="Comma-separated. Creators who worked with them in the last 6 months are left out.">
          <BrandsInput id={f("exclude")} value={brief.excludeBrands} onChange={(excludeBrands) => onChange({ excludeBrands })} />
        </Field>
      </EditorSection>
    </div>
  );
}
