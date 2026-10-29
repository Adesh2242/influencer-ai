// Scores creators against a campaign brief with an explainable 0-100 match score.
//
// Every component scores 0-100. A component only counts when the brief expresses a preference for it
// (engagement and authenticity always count), and the match score is the weighted mean of the applied
// components with their weights re-normalised to sum to 1. Hard filters never change the score; they set
// excludedReason so the UI can show why a creator was left out.
//
// Estimates are for the platform the brand would actually book:
// - platform: among the creator's platforms in brief.platforms (any platform when none is set) that
//   support the deliverable, the one with the largest expected reach.
// - cost: the rate card fee for the deliverable. Rate cards are quoted for the primary platform, so on
//   another platform the fee is scaled by its followers / primary followers. Rounded to ₹500.
// - reach: average views for reels and videos; 8-15% of followers for stories and 20-40% for posts, at
//   the upper end for accounts that engage above their tier benchmark.
// - engagements: reach × engagement rate on that platform.
import { RELATED_NICHES } from "../../data/generator/content";
import { CITY_BY_ID, CREATOR_TIERS, LANGUAGES, NICHE_LABELS, PLATFORM_LIST, PLATFORMS, REGIONS, tierForFollowers } from "../../data/taxonomy";
import { formatINRCompact, formatPercent, formatShare } from "../format";
import type {
  AgeBand,
  CampaignBrief,
  CityTier,
  Creator,
  CreatorTier,
  Deliverable,
  Gender,
  LanguageCode,
  MatchOptions,
  MatchResponse,
  MatchResult,
  Niche,
  Platform,
  PlatformStats,
  Region,
  ScoreComponent,
  ScoreKey,
  ScoreWeights,
} from "../../types";
import { briefTextProfile, creatorTextProfile, sharedKeywords, textSimilarity, type TextProfile } from "./text";

export const DEFAULT_WEIGHTS: ScoreWeights = {
  niche: 0.24,
  audience: 0.16,
  language: 0.12,
  geo: 0.1,
  engagement: 0.12,
  authenticity: 0.1,
  budget: 0.1,
  platform: 0.06,
};

export const SCORE_LABELS: Record<ScoreKey, string> = {
  niche: "Niche & content fit",
  audience: "Audience fit",
  language: "Language",
  geo: "Geography",
  engagement: "Engagement quality",
  authenticity: "Audience authenticity",
  budget: "Budget fit",
  platform: "Platform",
};

const SCORE_KEYS: ScoreKey[] = ["niche", "audience", "language", "geo", "engagement", "authenticity", "budget", "platform"];

/** Typical shares across Indian social audiences, used to judge whether a creator over-indexes. */
const AGE_REFERENCE: Record<AgeBand, number> = { "13-17": 0.08, "18-24": 0.38, "25-34": 0.34, "35-44": 0.13, "45+": 0.07 };
const CITY_TIER_REFERENCE: Record<CityTier, number> = { 1: 0.35, 2: 0.38, 3: 0.27 };
/** Typical average views as a share of followers, by platform. */
const VIEW_BENCHMARK: Record<Platform, number> = { instagram: 0.35, youtube: 0.15, moj: 0.7, sharechat: 0.5, linkedin: 0.12 };

const AGE_ORDER: AgeBand[] = ["13-17", "18-24", "25-34", "35-44", "45+"];
const AGE_BOUNDS: Record<AgeBand, [number, number | null]> = {
  "13-17": [13, 17],
  "18-24": [18, 24],
  "25-34": [25, 34],
  "35-44": [35, 44],
  "45+": [45, null],
};

const TIER_NAME: Record<CreatorTier, string> = { nano: "nano", micro: "micro", mid: "mid-tier", macro: "macro", mega: "mega" };

const DELIVERABLE_NOUN: Record<Deliverable, { one: string; many: string }> = {
  reel: { one: "reel", many: "Reels" },
  story: { one: "story", many: "Stories" },
  post: { one: "post", many: "Posts" },
  video: { one: "video", many: "Long-form videos" },
};

// ---------------------------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function joinWith(items: string[], conjunction: "and" | "or"): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} ${conjunction} ${items[items.length - 1]}`;
}

function percent(share: number): string {
  return formatShare(clamp(share, 0, 1));
}

function plainPercent(value: number): string {
  return Number.isInteger(value) ? `${value}%` : formatPercent(value);
}

function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

function roundFee(value: number): number {
  return Math.max(500, Math.round(value / 500) * 500);
}

/** "18-34" for contiguous bands, otherwise "18-24 or 35-44". */
function describeAges(ages: AgeBand[]): string {
  const sorted = AGE_ORDER.filter((band) => ages.includes(band));
  const runs: AgeBand[][] = [];
  for (const band of sorted) {
    const run = runs[runs.length - 1];
    if (run && AGE_ORDER.indexOf(run[run.length - 1]) === AGE_ORDER.indexOf(band) - 1) run.push(band);
    else runs.push([band]);
  }
  return joinWith(
    runs.map((run) => {
      const [low] = AGE_BOUNDS[run[0]];
      const [, high] = AGE_BOUNDS[run[run.length - 1]];
      return high === null ? `${low}+` : `${low}-${high}`;
    }),
    "or",
  );
}

function describeCityTiers(tiers: CityTier[]): string {
  const sorted = [...tiers].sort();
  if (sorted.length === 3) return "every city tier";
  if (sorted.length === 1) return sorted[0] === 1 ? "tier 1 metros" : `tier ${sorted[0]} cities`;
  if (sorted[1] - sorted[0] === 1) return `tier ${sorted[0]}-${sorted[1]} cities`;
  return `tier ${sorted[0]} and ${sorted[1]} cities`;
}

function describeRegions(regions: Region[]): string {
  return `${joinWith(regions.map((region) => REGIONS[region].label), "or")} India`;
}

function describeLanguages(codes: LanguageCode[]): string {
  return codes.length > 3 ? "your languages" : joinWith(codes.map((code) => LANGUAGES[code].label), "or");
}

function platformLabel(platform: Platform): string {
  return PLATFORMS[platform].label;
}

/** Lowercase words, camelCase split, so "ChaiKart" and "chai kart" compare equal. */
function brandWords(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function brandsMatch(brand: string, term: string): boolean {
  if (!term) return false;
  const a = brandWords(brand);
  if (!a) return false;
  if (a === term || a.replace(/ /g, "") === term.replace(/ /g, "")) return true;
  return ` ${a} `.includes(` ${term} `) || ` ${term} `.includes(` ${a} `);
}

// ---------------------------------------------------------------------------------------------
// Brief context: everything that depends only on the brief, computed once per brief object
// ---------------------------------------------------------------------------------------------

interface BriefContext {
  brief: CampaignBrief;
  text: TextProfile | null;
  platforms: Platform[];
  /** Platforms (within the brief's) that can deliver the requested format. */
  deliverablePlatforms: Platform[];
  perCreatorBudget: number;
  excludeTerms: { label: string; words: string }[];
  targetGender: Gender | null;
  targetAges: AgeBand[];
  languages: LanguageCode[];
  cityIds: string[];
  regions: Region[];
  tiers: CityTier[];
  creatorTiers: CreatorTier[];
}

const contextCache = new WeakMap<CampaignBrief, BriefContext>();

function contextFor(brief: CampaignBrief): BriefContext {
  const cached = contextCache.get(brief);
  if (cached) return cached;

  const platforms = unique(brief.platforms ?? []).filter((p) => PLATFORM_LIST.includes(p));
  const deliverable = brief.deliverable;
  const candidates = platforms.length > 0 ? platforms : PLATFORM_LIST;
  const text = [brief.productCategory, brief.description, brief.brandName].filter(Boolean).join(". ");
  const budget = Number.isFinite(brief.budgetINR) && brief.budgetINR > 0 ? brief.budgetINR : 0;
  const wanted = Number.isFinite(brief.creatorsWanted) && brief.creatorsWanted >= 1 ? Math.floor(brief.creatorsWanted) : 1;

  const context: BriefContext = {
    brief,
    text: text.trim() ? briefTextProfile(text) : null,
    platforms,
    deliverablePlatforms: candidates.filter((p) => PLATFORMS[p].deliverables.includes(deliverable)),
    perCreatorBudget: budget > 0 ? budget / wanted : 0,
    excludeTerms: unique((brief.excludeBrands ?? []).map((name) => name.trim()).filter(Boolean)).map((label) => ({
      label,
      words: brandWords(label),
    })),
    targetGender: brief.targetGender === "female" || brief.targetGender === "male" ? brief.targetGender : null,
    targetAges: AGE_ORDER.filter((band) => brief.targetAges?.includes(band)),
    languages: unique(brief.languages ?? []).filter((code) => code in LANGUAGES),
    cityIds: unique(brief.targetCityIds ?? []).filter((id) => id in CITY_BY_ID),
    regions: unique(brief.targetRegions ?? []).filter((region) => region in REGIONS),
    tiers: unique(brief.targetTiers ?? []).filter((tier) => tier === 1 || tier === 2 || tier === 3),
    creatorTiers: unique(brief.creatorTiers ?? []).filter((tier) => tier in CREATOR_TIERS),
  };
  contextCache.set(brief, context);
  return context;
}

// ---------------------------------------------------------------------------------------------
// Platform choice and estimates
// ---------------------------------------------------------------------------------------------

interface Estimate {
  stats: PlatformStats;
  cost: number;
  reach: number;
  engagements: number;
}

function benchmarkFor(stats: PlatformStats): number {
  return CREATOR_TIERS[tierForFollowers(stats.followers)].engagementBenchmark;
}

function estimateOn(creator: Creator, stats: PlatformStats, deliverable: Deliverable): Estimate {
  const primary = creator.platforms[0];
  const baseFee = deliverable === "video" ? (creator.rates.video ?? roundFee(creator.rates.reel * 1.6)) : creator.rates[deliverable];
  const scale = stats === primary || !primary ? 1 : stats.followers / Math.max(1, primary.followers);
  const quality = clamp((stats.engagementRate / benchmarkFor(stats) - 0.5) / 1.5, 0, 1);
  const reach =
    deliverable === "story"
      ? stats.followers * (0.08 + 0.07 * quality)
      : deliverable === "post"
        ? stats.followers * (0.2 + 0.2 * quality)
        : stats.avgViews;
  const roundedReach = Math.round(reach);
  return {
    stats,
    cost: roundFee(baseFee * scale),
    reach: roundedReach,
    engagements: Math.round((roundedReach * stats.engagementRate) / 100),
  };
}

function chooseEstimate(creator: Creator, context: BriefContext): { estimate: Estimate | null; eligible: PlatformStats[]; supported: boolean } {
  const { platforms, brief } = context;
  const eligible = platforms.length > 0 ? creator.platforms.filter((p) => platforms.includes(p.platform)) : creator.platforms;
  const supporting = eligible.filter((p) => PLATFORMS[p.platform].deliverables.includes(brief.deliverable));
  const pool = supporting.length > 0 ? supporting : eligible.length > 0 ? eligible : creator.platforms;
  let best: Estimate | null = null;
  for (const stats of pool) {
    const estimate = estimateOn(creator, stats, brief.deliverable);
    if (!best || estimate.reach > best.reach) best = estimate;
  }
  return { estimate: best, eligible, supported: supporting.length > 0 };
}

// ---------------------------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------------------------

interface ComponentResult {
  score: number;
  applied: boolean;
  detail: string;
  /** Short positive bullet for MatchResult.reasons, when the component is a real strength. */
  reason?: string;
}

const NOT_APPLIED = (detail: string): ComponentResult => ({ score: 0, applied: false, detail });

function nicheComponent(creator: Creator, context: BriefContext): ComponentResult {
  const briefNiches = unique(context.brief.niches ?? []).filter((niche) => niche in NICHE_LABELS);
  const text = context.text;
  if (briefNiches.length === 0 && !text) return NOT_APPLIED("No niche or product description in the brief, so this doesn't count.");

  const [primary] = creator.niches;
  const creatorText = creatorTextProfile(creator);
  const shared = text ? sharedKeywords(text, creatorText) : [];
  const similarity = text ? clamp(textSimilarity(text, creatorText) / 0.75, 0, 1) : 0;

  let overlap = 0;
  let matched: Niche | null = null;
  if (briefNiches.length > 0) {
    let bestNiche = briefNiches[0];
    for (const niche of briefNiches) {
      const index = creator.niches.indexOf(niche);
      const value =
        index === 0 ? 1 : index === 1 ? 0.72 : index >= 2 ? 0.6 : RELATED_NICHES[niche]?.includes(primary) ? 0.25 : 0;
      if (value > overlap) {
        overlap = value;
        bestNiche = niche;
      }
    }
    const covered = briefNiches.filter((niche) => creator.niches.includes(niche)).length;
    if (covered >= 2) overlap = Math.min(1, overlap + 0.1 * (covered - 1));
    matched = creator.niches.includes(bestNiche) ? bestNiche : null;
  }

  const score = briefNiches.length === 0 ? similarity : text ? 0.65 * overlap + 0.35 * similarity : overlap;
  const topics = shared.length > 0 ? `; ${shared.length} of their topics match your brief (${shared.join(", ")})` : "";

  let detail: string;
  let reason: string | undefined;
  if (briefNiches.length === 0) {
    detail = shared.length > 0 ? `Content overlaps your brief on ${joinWith(shared, "and")}.` : "Little overlap between this creator's topics and your brief.";
    if (shared.length > 0) reason = `Creates content on ${joinWith(shared.slice(0, 2), "and")}`;
  } else if (matched && matched === primary) {
    detail = `Primary niche is ${NICHE_LABELS[primary]}${topics}.`;
    reason = `Primary niche: ${NICHE_LABELS[primary]}`;
  } else if (matched) {
    detail = `Covers ${NICHE_LABELS[matched]} as a secondary niche (primary: ${NICHE_LABELS[primary]})${topics}.`;
    reason = `Also creates ${NICHE_LABELS[matched]} content`;
  } else if (overlap > 0) {
    detail = `${NICHE_LABELS[primary]} creator, a niche close to ${joinWith(briefNiches.map((n) => NICHE_LABELS[n]), "or")}${topics}.`;
  } else {
    detail = `Creates ${NICHE_LABELS[primary]} content rather than ${joinWith(briefNiches.map((n) => NICHE_LABELS[n]), "or")}${topics}.`;
  }
  return { score: Math.round(100 * score), applied: true, detail, reason };
}

function audienceComponent(creator: Creator, context: BriefContext): ComponentResult {
  const { targetGender, targetAges } = context;
  if (!targetGender && targetAges.length === 0) return NOT_APPLIED("No gender or age preference, so this doesn't count.");

  const parts: string[] = [];
  const scores: number[] = [];
  const genderWord = targetGender === "female" ? "women" : "men";
  let genderShare = 1;
  let ageShare = 1;
  if (targetGender) {
    genderShare = creator.audience.gender[targetGender] ?? 0;
    scores.push(clamp((genderShare - 0.1) / 0.7, 0, 1));
    parts.push(`${percent(genderShare)} of the audience is ${genderWord}`);
  }
  const ageLabel = describeAges(targetAges);
  if (targetAges.length > 0) {
    ageShare = targetAges.reduce((sum, band) => sum + (creator.audience.age[band] ?? 0), 0);
    const reference = targetAges.reduce((sum, band) => sum + AGE_REFERENCE[band], 0);
    scores.push(clamp(ageShare / Math.min(0.92, reference * 1.6), 0, 1));
    parts.push(targetGender ? `${percent(ageShare)} is aged ${ageLabel}` : `${percent(ageShare)} of the audience is aged ${ageLabel}`);
  }
  const score = Math.round((100 * scores.reduce((sum, s) => sum + s, 0)) / scores.length);
  // Joint share assumes gender and age are independent, which is the best the summary data allows.
  const reason =
    targetGender && targetAges.length > 0
      ? `${percent(genderShare * ageShare)} ${genderWord} aged ${ageLabel}`
      : targetGender
        ? `${percent(genderShare)} ${genderWord} in the audience`
        : `${percent(ageShare)} of the audience aged ${ageLabel}`;
  return { score, applied: true, detail: `${parts.join("; ")}.`, reason };
}

function languageComponent(creator: Creator, context: BriefContext): ComponentResult {
  const targets = context.languages;
  if (targets.length === 0) return NOT_APPLIED("No language preference, so this doesn't count.");

  const matches = creator.audience.languages.filter((entry) => targets.includes(entry.code));
  const share = matches.reduce((sum, entry) => sum + entry.share, 0);
  const contentMatches = creator.languages.filter((code) => targets.includes(code));
  const score = Math.round(Math.min(1, share / 0.6) * 85 + (contentMatches.length > 0 ? 15 : 0));
  const contentLabel = joinWith((contentMatches.length > 0 ? contentMatches : creator.languages).map((c) => LANGUAGES[c].label), "and");
  const detail = `${percent(share)} of the audience speaks ${describeLanguages(targets)}; creates content in ${contentLabel}.`;

  const top = [...matches].sort((a, b) => b.share - a.share)[0];
  const reason =
    top && top.share >= 0.8 * share
      ? `${percent(top.share)} ${LANGUAGES[top.code].label}-speaking audience`
      : `${percent(share)} of the audience speaks ${describeLanguages(matches.map((m) => m.code))}`;
  return { score, applied: true, detail, reason };
}

function geoComponent(creator: Creator, context: BriefContext): ComponentResult {
  const { cityIds, regions, tiers } = context;
  if (cityIds.length === 0 && regions.length === 0 && tiers.length === 0) return NOT_APPLIED("No location preference, so this doesn't count.");

  const { audience } = creator;
  const parts: { text: string; share: number }[] = [];
  let weighted = 0;
  let totalWeight = 0;

  if (regions.length > 0) {
    const share = regions.reduce((sum, region) => sum + (audience.regions[region] ?? 0), 0);
    weighted += clamp(share / 0.7, 0, 1);
    totalWeight += 1;
    parts.push({ text: `in ${describeRegions(regions)}`, share });
  }
  if (cityIds.length > 0) {
    const listed = audience.topCities.filter((entry) => cityIds.includes(entry.cityId));
    const share = listed.reduce((sum, entry) => sum + entry.share, 0);
    // Cities outside the creator's top five still hold some audience: a small share of their region.
    const unlisted = cityIds.filter((id) => !listed.some((entry) => entry.cityId === id));
    const proxy = unlisted.reduce((sum, id) => sum + 0.04 * (audience.regions[CITY_BY_ID[id].region] ?? 0), 0);
    weighted += clamp((share + proxy) / 0.2, 0, 1);
    totalWeight += 1;
    const names = cityIds.map((id) => CITY_BY_ID[id].name);
    parts.push({ text: `in ${names.length > 3 ? `your ${names.length} target cities` : joinWith(names, "or")}`, share });
  }
  if (tiers.length > 0) {
    const share = tiers.reduce((sum, tier) => sum + (audience.tiers[tier] ?? 0), 0);
    const reference = tiers.reduce((sum, tier) => sum + CITY_TIER_REFERENCE[tier], 0);
    weighted += 0.7 * clamp(share / Math.min(0.92, reference * 1.6), 0, 1);
    totalWeight += 0.7;
    parts.push({ text: `in ${describeCityTiers(tiers)}`, share });
  }

  const score = Math.round((100 * weighted) / totalWeight);
  const [first, ...rest] = parts;
  const detail = `${percent(first.share)} of the audience is ${first.text}${rest.map((p) => `; ${percent(p.share)} ${p.text}`).join("")}.`;
  const strongest = [...parts].sort((a, b) => b.share - a.share)[0];
  return { score, applied: true, detail, reason: `${percent(strongest.share)} of the audience ${strongest.text}` };
}

function engagementComponent(creator: Creator, context: BriefContext, estimate: Estimate): ComponentResult {
  const { stats } = estimate;
  const benchmark = benchmarkFor(stats);
  const ratio = stats.engagementRate / benchmark;
  const curve = (r: number) =>
    r <= 0 ? 0 : r < 1 ? 70 * r : r < 1.5 ? 70 + 40 * (r - 1) : r < 2 ? 90 + 20 * (r - 1.5) : 100;

  let score = curve(ratio);
  const tierName = TIER_NAME[tierForFollowers(stats.followers)];
  let detail = `${plainPercent(stats.engagementRate)} engagement on ${platformLabel(stats.platform)}, ${ratio.toFixed(1)}x the ${tierName} norm of ${plainPercent(benchmark)}`;

  if (context.brief.goal === "awareness" && stats.followers > 0) {
    const viewRatio = stats.avgViews / stats.followers;
    score = 0.6 * score + 0.4 * curve(viewRatio / VIEW_BENCHMARK[stats.platform]);
    detail += `; views average ${percent(viewRatio)} of followers`;
  }
  const suspicious = ratio > 2.5 && creator.authenticity.score < 70;
  if (suspicious) {
    score = Math.min(score, 60);
    detail += ". That is unusually high for the account's size; see the authenticity flags";
  }
  return {
    score: Math.round(score),
    applied: true,
    detail: `${detail}.`,
    reason: suspicious ? undefined : `${plainPercent(stats.engagementRate)} engagement, ${ratio.toFixed(1)}x the ${tierName} norm`,
  };
}

function authenticityComponent(creator: Creator): ComponentResult {
  const { score, suspiciousFollowerPct, flags } = creator.authenticity;
  const flagText = flags.length > 0 ? ` with ${flags.length} red flag${flags.length === 1 ? "" : "s"}` : "";
  return {
    score: Math.round(clamp(score, 0, 100)),
    applied: true,
    detail: `Authenticity ${Math.round(score)}/100${flagText}; about ${plainPercent(Math.round(suspiciousFollowerPct))} of followers look suspicious.`,
    reason: score >= 85 && flags.length === 0 ? `Authenticity ${Math.round(score)}/100` : undefined,
  };
}

function budgetComponent(context: BriefContext, estimate: Estimate): ComponentResult {
  const perCreator = context.perCreatorBudget;
  if (perCreator <= 0) return NOT_APPLIED("No budget set, so this doesn't count.");
  const noun = DELIVERABLE_NOUN[context.brief.deliverable].one;
  const ratio = estimate.cost / perCreator;
  if (ratio <= 1) {
    const text = `${formatINRCompact(estimate.cost)} per ${noun}, within your ${formatINRCompact(perCreator)} per-creator budget`;
    return { score: 100, applied: true, detail: `${text}.`, reason: text };
  }
  // 100 at the per-creator budget, about 40 at twice it, tending to 0 beyond.
  const score = Math.round(100 * ratio ** -Math.log2(2.5));
  return {
    score,
    applied: true,
    detail: `${formatINRCompact(estimate.cost)} per ${noun}, ${ratio.toFixed(1)}x your ${formatINRCompact(perCreator)} per-creator budget.`,
  };
}

function platformComponent(creator: Creator, context: BriefContext): ComponentResult {
  const { platforms } = context;
  if (platforms.length === 0) return NOT_APPLIED("No platform preference, so this doesn't count.");
  const primary = creator.platforms[0]?.platform;
  if (primary && platforms.includes(primary)) {
    return { score: 100, applied: true, detail: `Primary platform is ${platformLabel(primary)}, one you selected.`, reason: `Primary platform: ${platformLabel(primary)}` };
  }
  const secondary = creator.platforms.filter((p) => platforms.includes(p.platform)).map((p) => platformLabel(p.platform));
  if (secondary.length > 0) {
    return {
      score: 70,
      applied: true,
      detail: `On ${joinWith(secondary, "and")} as a secondary platform (primary: ${primary ? platformLabel(primary) : "unknown"}).`,
    };
  }
  return { score: 0, applied: true, detail: `Not on ${joinWith(platforms.map(platformLabel), "or")}.` };
}

// ---------------------------------------------------------------------------------------------
// Hard filters and warnings
// ---------------------------------------------------------------------------------------------

function exclusionReason(creator: Creator, context: BriefContext, choice: ReturnType<typeof chooseEstimate>): string | null {
  const { brief, platforms } = context;
  if (choice.estimate === null) return "No platform data for this creator";
  if (platforms.length > 0 && choice.eligible.length === 0) return `Not on ${joinWith(platforms.map(platformLabel), "or")}`;
  if (!choice.supported) {
    const noun = DELIVERABLE_NOUN[brief.deliverable].many;
    if (context.deliverablePlatforms.length === 0) return `None of your selected platforms supports ${noun.toLowerCase()}`;
    return `${noun} need ${joinWith(context.deliverablePlatforms.map(platformLabel), "or")}, which this creator isn't on`;
  }
  if (context.creatorTiers.length > 0 && !context.creatorTiers.includes(creator.tier)) {
    const followers = creator.platforms[0]?.followers ?? 0;
    const tierLabel = TIER_NAME[creator.tier];
    return `${tierLabel[0].toUpperCase()}${tierLabel.slice(1)} creator (${formatCountShort(followers)} followers); you asked for ${joinWith(
      context.creatorTiers.map((tier) => TIER_NAME[tier]),
      "or",
    )} creators`;
  }
  if (creator.authenticity.score < brief.minAuthenticity) {
    return `Authenticity score ${Math.round(creator.authenticity.score)} is below your minimum of ${brief.minAuthenticity}`;
  }
  const { stats } = choice.estimate;
  if (brief.minEngagementRate > 0 && stats.engagementRate < brief.minEngagementRate) {
    return `${plainPercent(stats.engagementRate)} engagement on ${platformLabel(stats.platform)} is below your ${plainPercent(brief.minEngagementRate)} minimum`;
  }
  const competitor = competitorWork(creator, context, 6);
  if (competitor) return `Worked with ${competitor.brand} ${monthsAgo(competitor.monthsAgo)} (competitor)`;
  return null;
}

function formatCountShort(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(value >= 1e7 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(value >= 1e5 ? 0 : 1).replace(/\.0$/, "")}K`;
  return String(Math.round(value));
}

function monthsAgo(months: number): string {
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

/** Most recent collaboration with an excluded brand within `withinMonths`, if any. */
function competitorWork(creator: Creator, context: BriefContext, withinMonths: number, afterMonths = 0) {
  if (context.excludeTerms.length === 0) return null;
  let found: Creator["collaborations"][number] | null = null;
  for (const collaboration of creator.collaborations) {
    if (collaboration.monthsAgo > withinMonths || collaboration.monthsAgo <= afterMonths) continue;
    if (!context.excludeTerms.some((term) => brandsMatch(collaboration.brand, term.words))) continue;
    if (!found || collaboration.monthsAgo < found.monthsAgo) found = collaboration;
  }
  return found;
}

function warningsFor(creator: Creator, context: BriefContext, estimate: Estimate): string[] {
  const warnings: string[] = [];
  const pastCompetitor = competitorWork(creator, context, 12, 6);
  if (pastCompetitor) warnings.push(`Worked with ${pastCompetitor.brand} ${monthsAgo(pastCompetitor.monthsAgo)} (competitor)`);
  for (const flag of creator.authenticity.flags) warnings.push(`Authenticity: ${flag}`);
  for (const flag of creator.brandSafety.flags) warnings.push(`Brand safety: ${flag}`);
  if (context.perCreatorBudget > 0 && estimate.cost > context.perCreatorBudget) {
    warnings.push(
      `${formatINRCompact(estimate.cost)} per ${DELIVERABLE_NOUN[context.brief.deliverable].one} is ${(estimate.cost / context.perCreatorBudget).toFixed(1)}x your ${formatINRCompact(context.perCreatorBudget)} per-creator budget`,
    );
  }
  if (creator.responseRate < 0.5) warnings.push(`Replies to about ${percent(creator.responseRate)} of brand enquiries`);
  if (creator.avgTurnaroundDays > 10) warnings.push(`Usually needs about ${creator.avgTurnaroundDays} days to deliver`);
  if (creator.platforms[0] && estimate.stats !== creator.platforms[0]) {
    warnings.push(`Estimates use their ${platformLabel(estimate.stats.platform)} account, not their main ${platformLabel(creator.platforms[0].platform)} one`);
  }
  return warnings;
}

// ---------------------------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------------------------

function normaliseWeights(weights: ScoreWeights): ScoreWeights {
  const clean = { ...DEFAULT_WEIGHTS };
  for (const key of SCORE_KEYS) {
    const value = weights[key];
    clean[key] = Number.isFinite(value) && value > 0 ? value : 0;
  }
  return clean;
}

function score(creator: Creator, context: BriefContext, weights: ScoreWeights): MatchResult {
  const choice = chooseEstimate(creator, context);
  const estimate: Estimate =
    choice.estimate ?? {
      stats: { platform: "instagram", handle: creator.handle, followers: 0, avgViews: 0, engagementRate: 0, postsPerMonth: 0 },
      cost: 0,
      reach: 0,
      engagements: 0,
    };

  const results: Record<ScoreKey, ComponentResult> = {
    niche: nicheComponent(creator, context),
    audience: audienceComponent(creator, context),
    language: languageComponent(creator, context),
    geo: geoComponent(creator, context),
    engagement: engagementComponent(creator, context, estimate),
    authenticity: authenticityComponent(creator),
    budget: budgetComponent(context, estimate),
    platform: platformComponent(creator, context),
  };

  const appliedKeys = SCORE_KEYS.filter((key) => results[key].applied);
  const appliedWeight = appliedKeys.reduce((sum, key) => sum + weights[key], 0);
  // With every applied weight at zero, fall back to an unweighted mean rather than dividing by zero.
  const weightOf = (key: ScoreKey) =>
    !results[key].applied ? 0 : appliedWeight > 0 ? weights[key] / appliedWeight : 1 / appliedKeys.length;

  const components: ScoreComponent[] = SCORE_KEYS.map((key) => ({
    key,
    label: SCORE_LABELS[key],
    score: results[key].score,
    weight: weightOf(key),
    applied: results[key].applied,
    detail: results[key].detail,
  }));
  const total = components.reduce((sum, component) => sum + component.weight * component.score, 0);

  const reasons = appliedKeys
    .filter((key) => results[key].reason && results[key].score >= 60)
    .sort((a, b) => weightOf(b) * results[b].score - weightOf(a) * results[a].score || SCORE_KEYS.indexOf(a) - SCORE_KEYS.indexOf(b))
    .slice(0, 4)
    .map((key) => results[key].reason as string);

  return {
    creator,
    score: Math.round(clamp(total, 0, 100)),
    components,
    reasons,
    warnings: warningsFor(creator, context, estimate),
    platform: estimate.stats.platform,
    estimatedCostINR: estimate.cost,
    estimatedReach: estimate.reach,
    estimatedEngagements: estimate.engagements,
    excludedReason: exclusionReason(creator, context, choice),
  };
}

/** Scores one creator against a brief. Always returns a result; excludedReason is set when a hard filter fails. */
export function scoreCreator(brief: CampaignBrief, creator: Creator, weights: ScoreWeights = DEFAULT_WEIGHTS): MatchResult {
  return score(creator, contextFor(brief), normaliseWeights(weights));
}

function compareResults(a: MatchResult, b: MatchResult): number {
  return b.score - a.score || a.estimatedCostINR - b.estimatedCostINR || a.creator.id.localeCompare(b.creator.id);
}

/** Scores every creator, splits eligible from excluded, sorts eligible by score (desc). */
export function matchCreators(brief: CampaignBrief, creators: Creator[], options: MatchOptions = {}): MatchResponse {
  const weights = normaliseWeights({ ...DEFAULT_WEIGHTS, ...options.weights });
  const context = contextFor(brief);
  const all = creators.map((creator) => score(creator, context, weights));
  const results = all.filter((r) => r.excludedReason === null).sort(compareResults);
  const limit = options.limit === undefined ? undefined : Math.max(0, Math.floor(options.limit));
  return {
    results: limit === undefined ? results : results.slice(0, limit),
    excluded: all.filter((r) => r.excludedReason !== null).sort(compareResults),
  };
}
