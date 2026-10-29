// Discover filters <-> URL search params, plus the filtering and sorting they drive.
import {
  CITY_TIER_LIST,
  CREATOR_TIER_LIST,
  getCity,
  LANGUAGE_CODES,
  NICHE_LABELS,
  NICHES,
  PLATFORM_LIST,
  REGION_LIST,
} from "@/data/taxonomy";
import type { CityTier, Creator, CreatorTier, LanguageCode, Niche, Platform, Region } from "@/types";

export type DiscoverSort = "followers" | "engagement" | "authenticity" | "rate";

export const DISCOVER_SORTS: readonly { value: DiscoverSort; label: string }[] = [
  { value: "followers", label: "Most followers" },
  { value: "engagement", label: "Highest engagement" },
  { value: "authenticity", label: "Most authentic" },
  { value: "rate", label: "Lowest reel fee" },
];

export interface DiscoverQuery {
  q: string;
  niche: Niche | null;
  lang: LanguageCode | null;
  platform: Platform | null;
  tier: CreatorTier | null;
  cityTier: CityTier | null;
  region: Region | null;
  /** Percent; 0 = no minimum. */
  minEr: number;
  /** 0-100; 0 = no minimum. */
  minAuth: number;
  verified: boolean;
  sort: DiscoverSort;
}

export const EMPTY_QUERY: DiscoverQuery = {
  q: "",
  niche: null,
  lang: null,
  platform: null,
  tier: null,
  cityTier: null,
  region: null,
  minEr: 0,
  minAuth: 0,
  verified: false,
  sort: "followers",
};

function oneOf<T extends string | number>(raw: string | null, allowed: readonly T[]): T | null {
  if (raw === null) return null;
  return allowed.find((value) => String(value) === raw) ?? null;
}

function bounded(raw: string | null, min: number, max: number): number {
  const value = raw === null ? Number.NaN : Number(raw);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : 0;
}

/** Unknown or malformed params fall back to "no filter" so a stale shared link still opens. */
export function parseDiscoverQuery(params: URLSearchParams): DiscoverQuery {
  return {
    q: params.get("q") ?? "",
    niche: oneOf(params.get("niche"), NICHES),
    lang: oneOf(params.get("lang"), LANGUAGE_CODES),
    platform: oneOf(params.get("platform"), PLATFORM_LIST),
    tier: oneOf(params.get("tier"), CREATOR_TIER_LIST),
    cityTier: oneOf(params.get("cityTier"), CITY_TIER_LIST),
    region: oneOf(params.get("region"), REGION_LIST),
    minEr: bounded(params.get("minEr"), 0, 20),
    minAuth: bounded(params.get("minAuth"), 0, 100),
    verified: params.get("verified") === "1",
    sort: oneOf(params.get("sort"), DISCOVER_SORTS.map((s) => s.value)) ?? EMPTY_QUERY.sort,
  };
}

/** Only non-default values are written, which keeps shared URLs short. */
export function toSearchParams(query: DiscoverQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q.trim()) params.set("q", query.q);
  if (query.niche) params.set("niche", query.niche);
  if (query.lang) params.set("lang", query.lang);
  if (query.platform) params.set("platform", query.platform);
  if (query.tier) params.set("tier", query.tier);
  if (query.cityTier) params.set("cityTier", String(query.cityTier));
  if (query.region) params.set("region", query.region);
  if (query.minEr > 0) params.set("minEr", String(query.minEr));
  if (query.minAuth > 0) params.set("minAuth", String(query.minAuth));
  if (query.verified) params.set("verified", "1");
  if (query.sort !== EMPTY_QUERY.sort) params.set("sort", query.sort);
  return params;
}

/** Number of active filters, not counting search and sort. */
export function activeFilterCount(query: DiscoverQuery): number {
  return [query.niche, query.lang, query.platform, query.tier, query.cityTier, query.region].filter((v) => v !== null).length +
    (query.minEr > 0 ? 1 : 0) +
    (query.minAuth > 0 ? 1 : 0) +
    (query.verified ? 1 : 0);
}

function searchText(creator: Creator): string {
  const city = getCity(creator.homeCityId);
  return [
    creator.name,
    creator.handle,
    ...creator.platforms.map((p) => p.handle),
    ...creator.topics,
    ...creator.niches.map((n) => NICHE_LABELS[n]),
    city?.name ?? "",
    ...(city?.aliases ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

const searchIndex = new WeakMap<Creator, string>();

function matchesSearch(creator: Creator, terms: string[]): boolean {
  let text = searchIndex.get(creator);
  if (text === undefined) {
    text = searchText(creator);
    searchIndex.set(creator, text);
  }
  return terms.every((term) => text.includes(term));
}

export function primaryStats(creator: Creator) {
  return creator.platforms[0];
}

export function filterCreators(list: readonly Creator[], query: DiscoverQuery): Creator[] {
  const terms = query.q.toLowerCase().replace(/^@/, "").split(/\s+/).filter(Boolean);
  return list.filter((creator) => {
    const city = getCity(creator.homeCityId);
    const primary = primaryStats(creator);
    return (
      (terms.length === 0 || matchesSearch(creator, terms)) &&
      (!query.niche || creator.niches.includes(query.niche)) &&
      (!query.lang || creator.languages.includes(query.lang)) &&
      (!query.platform || creator.platforms.some((p) => p.platform === query.platform)) &&
      (!query.tier || creator.tier === query.tier) &&
      (!query.cityTier || city?.tier === query.cityTier) &&
      (!query.region || city?.region === query.region) &&
      (query.minEr <= 0 || (primary?.engagementRate ?? 0) >= query.minEr) &&
      (query.minAuth <= 0 || creator.authenticity.score >= query.minAuth) &&
      (!query.verified || creator.verified)
    );
  });
}

export function sortCreators(list: readonly Creator[], sort: DiscoverSort): Creator[] {
  const key: Record<DiscoverSort, (c: Creator) => number> = {
    followers: (c) => -(primaryStats(c)?.followers ?? 0),
    engagement: (c) => -(primaryStats(c)?.engagementRate ?? 0),
    authenticity: (c) => -c.authenticity.score,
    rate: (c) => c.rates.reel,
  };
  const fn = key[sort];
  return [...list].sort((a, b) => fn(a) - fn(b) || a.id.localeCompare(b.id));
}
