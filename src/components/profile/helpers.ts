import {
  CITY_TIER_LABELS,
  CREATOR_TIER_LIST,
  CREATOR_TIERS,
  DELIVERABLES,
  getCity,
  LANGUAGES,
  NICHE_LABELS,
  PLATFORMS,
  REGIONS,
  tierForFollowers,
} from "@/data/taxonomy";
import { DEFAULT_BRIEF } from "@/lib/brief/defaults";
import type { CampaignBrief, Creator, CreatorTier, Deliverable, MatchResult, PlatformStats } from "@/types";

/**
 * Brief fields that change which creators fit. Budget and team size are left out on purpose: the
 * shortlist page edits them, and that alone doesn't amount to describing a campaign.
 */
const TARGETING_FIELDS = [
  "productCategory",
  "niches",
  "languages",
  "platforms",
  "deliverable",
  "targetGender",
  "targetAges",
  "targetTiers",
  "targetRegions",
  "targetCityIds",
  "creatorTiers",
  "minAuthenticity",
  "minEngagementRate",
  "excludeBrands",
] as const satisfies readonly (keyof CampaignBrief)[];

function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    const left = new Set<unknown>(a);
    const right = new Set<unknown>(b);
    return left.size === right.size && [...left].every((value) => right.has(value));
  }
  if (typeof a === "string" && typeof b === "string") return a.trim() === b.trim();
  return Object.is(a, b);
}

/** True when the brief differs from a fresh one in anything that affects matching. */
export function hasTargeting(brief: CampaignBrief): boolean {
  return TARGETING_FIELDS.some((field) => !sameValue(brief[field], DEFAULT_BRIEF[field]));
}

/** Short labels for what the brief targets, for a one-line summary ("Food", "Tamil", "South"...). */
export function briefSummary(brief: CampaignBrief, max = 6): string[] {
  const parts = [
    ...brief.niches.map((niche) => NICHE_LABELS[niche]),
    ...brief.languages.map((code) => LANGUAGES[code].label),
    ...brief.targetRegions.map((region) => REGIONS[region].label),
    ...brief.targetCityIds.map((id) => getCity(id)?.name ?? "").filter(Boolean),
    ...[...brief.targetTiers].sort((a, b) => a - b).map((tier) => CITY_TIER_LABELS[tier]),
  ];
  return parts.length > max ? [...parts.slice(0, max - 1), `+${parts.length - max + 1} more`] : parts;
}

/** "Reel / Short on Instagram or YouTube". */
export function deliverableSummary(brief: CampaignBrief): string {
  const platforms = brief.platforms.map((platform) => PLATFORMS[platform].label);
  const where = platforms.length > 0 ? ` on ${joinWithOr(platforms)}` : "";
  return `${DELIVERABLES[brief.deliverable].label}${where}`;
}

function joinWithOr(items: string[]): string {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`;
}

/** The creator's stats on the platform used for an estimate, falling back to their primary platform. */
export function statsForResult(result: Pick<MatchResult, "creator" | "platform">): PlatformStats | undefined {
  return result.creator.platforms.find((stats) => stats.platform === result.platform) ?? result.creator.platforms[0];
}

export interface EngagementComparison {
  /** Size tier for this platform's follower count. */
  tier: CreatorTier;
  /** Typical engagement rate (%) for that tier. */
  benchmark: number;
  /** Creator's rate divided by the benchmark; 0 when there is no benchmark. */
  ratio: number;
}

/** Compares a platform's engagement rate with the norm for accounts of the same size. */
export function compareEngagement(stats: PlatformStats): EngagementComparison {
  const tier = tierForFollowers(stats.followers);
  const benchmark = CREATOR_TIERS[tier].engagementBenchmark;
  return { tier, benchmark, ratio: benchmark > 0 ? stats.engagementRate / benchmark : 0 };
}

/** "1.4×". */
export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(1)}×`;
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

const relativeTime = new Intl.RelativeTimeFormat("en-IN", { numeric: "always" });

/** "This month", "3 months ago", "2 years ago". */
export function formatMonthsAgo(months: number): string {
  const whole = Math.max(0, Math.round(months));
  if (whole === 0) return "This month";
  if (whole < 24) return relativeTime.format(-whole, "month");
  return relativeTime.format(-Math.floor(whole / 12), "year");
}

/** "Member for 14 months", "Member for 2 years". */
export function formatMembership(months: number): string {
  const whole = Math.max(0, Math.floor(months));
  if (whole < 1) return "Joined this month";
  if (whole < 24) return `Member for ${plural(whole, "month")}`;
  return `Member for ${plural(Math.floor(whole / 12), "year")}`;
}

/** Whether any of the creator's platforms supports a deliverable at all. */
export function offersDeliverable(creator: Creator, deliverable: Deliverable): boolean {
  return creator.platforms.some((stats) => PLATFORMS[stats.platform].deliverables.includes(deliverable));
}

function normaliseBrand(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** True when a collaboration's brand matches a name on the brief's exclusion list. */
export function isExcludedBrand(brand: string, excludeBrands: readonly string[]): boolean {
  const target = normaliseBrand(brand);
  if (!target) return false;
  return excludeBrands.some((name) => {
    const excluded = normaliseBrand(name);
    return excluded.length >= 3 && (target === excluded || target.includes(excluded) || excluded.includes(target));
  });
}

/**
 * Up to `limit` other creators whose niches include this creator's primary niche, preferring the same
 * primary language, then any shared language, the same primary niche and a similar size.
 */
export function similarCreators(creator: Creator, pool: readonly Creator[], limit = 4): Creator[] {
  const niche = creator.niches[0];
  if (!niche) return [];
  const language = creator.languages[0];
  const tierIndex = CREATOR_TIER_LIST.indexOf(creator.tier);

  return pool
    .filter((other) => other.id !== creator.id && other.niches.includes(niche))
    .map((other) => ({
      other,
      language: other.languages[0] === language ? 2 : other.languages.some((code) => creator.languages.includes(code)) ? 1 : 0,
      primaryNiche: other.niches[0] === niche ? 1 : 0,
      tierGap: Math.abs(CREATOR_TIER_LIST.indexOf(other.tier) - tierIndex),
    }))
    .sort(
      (a, b) =>
        b.language - a.language ||
        b.primaryNiche - a.primaryNiche ||
        a.tierGap - b.tierGap ||
        b.other.authenticity.score - a.other.authenticity.score ||
        a.other.id.localeCompare(b.other.id),
    )
    .slice(0, limit)
    .map((entry) => entry.other);
}
