// Option lists for the sign-up forms. Values are human-readable on purpose: they arrive as-is in
// Netlify's form dashboard and notification emails, where people (not code) read them.
import {
  CITIES,
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
} from "@/data/taxonomy";
import { formatCount, formatINRCompact } from "@/lib/format";
import type { City, CreatorTier } from "@/types";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectOptionGroup {
  label: string;
  options: SelectOption[];
}

function same(label: string): SelectOption {
  return { value: label, label };
}

const LAKH = 100_000;

/** Monthly influencer budget bands for the brand form, in lakh/crore. */
export const MONTHLY_BUDGET_OPTIONS: SelectOption[] = [
  `Under ${formatINRCompact(1 * LAKH)}`,
  `${formatINRCompact(1 * LAKH)} – ${formatINRCompact(5 * LAKH)}`,
  `${formatINRCompact(5 * LAKH)} – ${formatINRCompact(25 * LAKH)}`,
  `${formatINRCompact(25 * LAKH)} – ${formatINRCompact(100 * LAKH)}`,
  `Over ${formatINRCompact(100 * LAKH)}`,
  "Not sure yet",
].map(same);

export const PLATFORM_OPTIONS: SelectOption[] = PLATFORM_LIST.map((platform) => same(PLATFORMS[platform].label));

/** "1K–10K", or "1M+" for the open-ended top tier. */
export function followerRangeLabel(tier: CreatorTier): string {
  const { minFollowers, maxFollowers } = CREATOR_TIERS[tier];
  const isTopTier = tier === CREATOR_TIER_LIST[CREATOR_TIER_LIST.length - 1];
  return isTopTier ? `${formatCount(minFollowers)}+` : `${formatCount(minFollowers)}–${formatCount(maxFollowers)}`;
}

/** "Mid-tier" from "Mid-tier (100K-500K)". */
export function tierName(tier: CreatorTier): string {
  return CREATOR_TIERS[tier].label.replace(/\s*\(.*\)\s*$/, "");
}

/** One option per creator size tier, e.g. "10K–100K (Micro)". */
export const FOLLOWER_OPTIONS: SelectOption[] = CREATOR_TIER_LIST.map((tier) =>
  same(`${followerRangeLabel(tier)} (${tierName(tier)})`),
);

function cityLabel(city: City): string {
  return city.name === city.state ? city.name : `${city.name}, ${city.state}`;
}

/** Cities grouped by tier for <optgroup>, alphabetical within each tier. */
export const CITY_OPTION_GROUPS: SelectOptionGroup[] = CITY_TIER_LIST.map((tier) => ({
  label: CITY_TIER_LABELS[tier],
  options: CITIES.filter((city) => city.tier === tier)
    .sort((a, b) => a.name.localeCompare(b.name, "en-IN"))
    .map((city) => same(cityLabel(city))),
}));

export const OTHER_CITY_OPTION: SelectOption = { value: "Other", label: "Other / not listed" };

/** "Tamil (தமிழ்)"; English has no separate native name. */
export const LANGUAGE_OPTIONS: SelectOption[] = LANGUAGE_CODES.map((code) => {
  const { label, native } = LANGUAGES[code];
  return { value: label, label: native === label ? label : `${label} (${native})` };
});

export const NICHE_OPTIONS: SelectOption[] = NICHES.map((niche) => same(NICHE_LABELS[niche]));
