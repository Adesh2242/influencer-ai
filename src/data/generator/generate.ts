// Deterministic generator for the fictional demo creators. Global quotas (languages, niches, tiers,
// risk flags) are planned first so coverage holds by construction; each creator is then built from its
// own seeded streams. Identity (name, handle, id) uses only uniform draws and integer maths, so ids stay
// identical in every JavaScript engine and saved shortlists keep working.
import { formatCount } from "../../lib/format";
import { AGE_BANDS, CITIES, CREATOR_TIERS, LANGUAGE_CODES, NICHES, REGION_LIST, tierForFollowers } from "../taxonomy";
import type {
  AgeBand,
  AudienceProfile,
  City,
  CityTier,
  Collaboration,
  Creator,
  CreatorTier,
  Gender,
  LanguageCode,
  Niche,
  Platform,
  PlatformStats,
  RateCard,
  Region,
} from "../../types";
import { FICTIONAL_BRANDS, REAL_MONEY_GAMING_BRAND } from "./brands";
import { HANDLE_PREFIXES, HANDLE_SUFFIXES, RELATED_NICHES, buildBio, pickTopics } from "./content";
import { clampNumber, roundCount, roundDecimals, roundFee, toShares } from "./math";
import { nameGroupFor, nameKey, pickName } from "./names";
import { Rng } from "./random";

export const DATASET_SEED = 20_260_412;
export const DATASET_SIZE = 250;

// ---------------------------------------------------------------------------------------------
// Quotas
// ---------------------------------------------------------------------------------------------

const LANGUAGE_WEIGHTS: Record<LanguageCode, number> = {
  hi: 27,
  en: 16,
  ta: 7.2,
  te: 7.2,
  mr: 6.4,
  bn: 6.4,
  kn: 5.6,
  ml: 5.6,
  gu: 4.8,
  pa: 4.8,
  or: 4.4,
  as: 4.4,
};

const NICHE_WEIGHTS: Record<Niche, number> = {
  food: 9,
  beauty: 8.5,
  fashion: 7.5,
  lifestyle: 8,
  comedy: 7,
  tech: 6.5,
  entertainment: 6.5,
  finance: 6,
  fitness: 6,
  education: 5.5,
  travel: 5,
  gaming: 4.5,
  parenting: 4,
  health: 4,
  automotive: 3.5,
  sports: 3.5,
  devotional: 3,
  agriculture: 2.5,
};

const TIER_SHARES: Record<CreatorTier, number> = { nano: 30, micro: 40, mid: 18, macro: 8, mega: 4 };

/** Niches with the strongest language preferences are placed first; universal niches fill what is left. */
const NICHE_PLACEMENT_ORDER: Niche[] = [
  "agriculture",
  "devotional",
  "gaming",
  "finance",
  "tech",
  "education",
  "parenting",
  "automotive",
  "sports",
  "beauty",
  "fashion",
  "health",
  "fitness",
  "travel",
  "entertainment",
  "comedy",
  "lifestyle",
  "food",
];

const ENGLISH_NICHE_AFFINITY: Partial<Record<Niche, number>> = {
  finance: 2.2,
  tech: 2.2,
  fashion: 1.6,
  beauty: 1.5,
  lifestyle: 1.8,
  travel: 1.6,
  fitness: 1.6,
  parenting: 1.6,
  health: 1.3,
  education: 1.1,
  automotive: 1.2,
  devotional: 0.25,
  agriculture: 0.08,
  entertainment: 0.8,
};

const HINDI_NICHE_AFFINITY: Partial<Record<Niche, number>> = {
  comedy: 1.5,
  education: 1.6,
  agriculture: 1.6,
  devotional: 1.6,
  gaming: 1.5,
  finance: 1.2,
  entertainment: 1.3,
  sports: 1.2,
  food: 1.1,
  fashion: 0.9,
  beauty: 0.9,
  travel: 0.8,
  parenting: 0.9,
  lifestyle: 0.8,
};

const REGIONAL_NICHE_AFFINITY: Partial<Record<Niche, number>> = {
  food: 1.6,
  entertainment: 1.4,
  comedy: 1.3,
  devotional: 1.3,
  agriculture: 1.2,
  tech: 0.8,
  finance: 0.7,
  gaming: 0.6,
  parenting: 0.8,
  fitness: 0.8,
  sports: 0.9,
  lifestyle: 0.9,
  automotive: 0.8,
  education: 0.9,
};

const LANGUAGE_NICHE_BOOST: Partial<Record<LanguageCode, Partial<Record<Niche, number>>>> = {
  pa: { agriculture: 1.8, sports: 1.5, entertainment: 1.2, fitness: 1.3 },
  mr: { agriculture: 1.4 },
  te: { agriculture: 1.3, tech: 1.3, entertainment: 1.2 },
  ta: { tech: 1.3, entertainment: 1.2 },
  ml: { tech: 1.3, travel: 1.3 },
  kn: { agriculture: 1.2, tech: 1.2 },
  gu: { food: 1.2, finance: 1.4, fashion: 1.2, devotional: 1.2 },
  bn: { food: 1.2, entertainment: 1.2, education: 1.2 },
  or: { devotional: 1.3 },
  as: { travel: 1.3, food: 1.2 },
};

function nicheAffinity(lang: LanguageCode, niche: Niche): number {
  const base =
    lang === "en" ? ENGLISH_NICHE_AFFINITY[niche] : lang === "hi" ? HINDI_NICHE_AFFINITY[niche] : REGIONAL_NICHE_AFFINITY[niche];
  return (base ?? 1) * (LANGUAGE_NICHE_BOOST[lang]?.[niche] ?? 1);
}

/** How likely a language market and niche are to have the biggest creators. */
const UPPER_TIER_LANGUAGE: Record<LanguageCode, number> = {
  hi: 1,
  en: 1,
  ta: 0.8,
  te: 0.8,
  mr: 0.55,
  bn: 0.55,
  kn: 0.5,
  ml: 0.55,
  gu: 0.4,
  pa: 0.6,
  or: 0.15,
  as: 0.15,
};

const UPPER_TIER_NICHE: Record<Niche, number> = {
  entertainment: 1.6,
  comedy: 1.6,
  food: 1.2,
  fashion: 1.2,
  beauty: 1.2,
  tech: 1.3,
  gaming: 1.3,
  lifestyle: 1.2,
  travel: 1,
  finance: 1,
  fitness: 1,
  education: 1,
  sports: 0.9,
  automotive: 0.9,
  parenting: 0.7,
  health: 0.7,
  devotional: 0.8,
  agriculture: 0.5,
};

/** Largest-remainder apportionment of `total` over `weights`, with a floor of `minimum` per key. */
function apportion<K extends string>(keys: readonly K[], weights: Record<K, number>, total: number, minimum: number): Record<K, number> {
  const floor = Math.min(minimum, Math.floor(total / keys.length));
  const weightSum = keys.reduce((sum, key) => sum + weights[key], 0);
  const exact = keys.map((key) => (weights[key] / weightSum) * total);
  const counts = exact.map((value) => Math.floor(value));
  let leftover = total - counts.reduce((sum, value) => sum + value, 0);
  const order = exact.map((value, i) => ({ i, rest: value - Math.floor(value) })).sort((a, b) => b.rest - a.rest || a.i - b.i);
  for (let k = 0; leftover > 0; k++, leftover--) counts[order[k % order.length].i] += 1;
  for (let i = 0; i < counts.length; i++) {
    while (counts[i] < floor) {
      let donor = -1;
      for (let j = 0; j < counts.length; j++) {
        if (counts[j] > floor && (donor === -1 || counts[j] > counts[donor])) donor = j;
      }
      if (donor === -1) break;
      counts[donor] -= 1;
      counts[i] += 1;
    }
  }
  return Object.fromEntries(keys.map((key, i) => [key, counts[i]])) as Record<K, number>;
}

interface Slot {
  index: number;
  lang: LanguageCode;
  niche: Niche;
  tier: CreatorTier;
  lowAuthenticity: boolean;
  riskyContent: boolean;
}

function planSlots(seed: number, size: number): Slot[] {
  const rng = Rng.derive(seed, "plan");

  const languageCounts = apportion(LANGUAGE_CODES, LANGUAGE_WEIGHTS, size, 7);
  const languages = rng.shuffle(LANGUAGE_CODES.flatMap((code) => Array.from({ length: languageCounts[code] }, () => code)));

  // Niches: weighted draws without replacement, so each language gets niches that suit it.
  const nicheCounts = apportion(NICHES, NICHE_WEIGHTS, size, 9);
  const niches: (Niche | null)[] = languages.map(() => null);
  for (const niche of NICHE_PLACEMENT_ORDER) {
    const open = niches.flatMap((value, i) => (value === null ? [i] : []));
    for (const i of rng.weightedSample(open, nicheCounts[niche], (slot) => nicheAffinity(languages[slot], niche))) {
      niches[i] = niche;
    }
  }

  // Tiers: the biggest creators come mostly from the biggest language markets and broad niches.
  const tierCounts = apportion(["nano", "micro", "mid", "macro", "mega"] as const, TIER_SHARES, size, 1);
  const tiers: (CreatorTier | null)[] = languages.map(() => null);
  const upperWeight = (i: number) => UPPER_TIER_LANGUAGE[languages[i]] * UPPER_TIER_NICHE[niches[i] ?? "lifestyle"];
  const placeTier = (tier: CreatorTier, weightOf: (i: number) => number) => {
    const open = tiers.flatMap((value, i) => (value === null ? [i] : []));
    for (const i of rng.weightedSample(open, tierCounts[tier], weightOf)) tiers[i] = tier;
  };
  // Products and square roots only: these weights shape identities, which must match in every engine.
  placeTier("mega", (i) => upperWeight(i) * upperWeight(i));
  placeTier("macro", (i) => upperWeight(i) * Math.sqrt(upperWeight(i)));
  placeTier("mid", upperWeight);
  placeTier("micro", (i) => (languages[i] === "en" ? 1.2 : languages[i] === "hi" ? 1 : 0.9));
  for (let i = 0; i < tiers.length; i++) if (tiers[i] === null) tiers[i] = "nano";

  // About 10% of accounts show signs of inauthentic growth; about 6% post content some brands avoid.
  const indices = languages.map((_, i) => i);
  const lowAuthenticity = new Set(rng.sample(indices, Math.round(size * 0.1)));
  const riskyWeight: Partial<Record<Niche, number>> = { comedy: 3, gaming: 2.5, entertainment: 1.5, finance: 1.2 };
  const risky = new Set(rng.weightedSample(indices, Math.round(size * 0.06), (i) => riskyWeight[niches[i] ?? "lifestyle"] ?? 0.6));

  return languages.map((lang, index) => ({
    index,
    lang,
    niche: niches[index] ?? "lifestyle",
    tier: tiers[index] ?? "nano",
    lowAuthenticity: lowAuthenticity.has(index),
    riskyContent: risky.has(index),
  }));
}

// ---------------------------------------------------------------------------------------------
// Profile: home city, niches, content languages
// ---------------------------------------------------------------------------------------------

const ENGLISH_CITY_WEIGHT: Record<string, number> = {
  mumbai: 4.5,
  bengaluru: 4,
  delhi: 4,
  hyderabad: 2.4,
  chennai: 2.2,
  pune: 2.4,
  kolkata: 2,
  ahmedabad: 1.3,
  gurugram: 1.2,
  noida: 1,
  chandigarh: 0.9,
  kochi: 0.8,
  jaipur: 0.6,
  lucknow: 0.5,
  indore: 0.5,
  panaji: 0.7,
  shillong: 0.7,
  imphal: 0.5,
};

/** Hindi creators also live outside the Hindi belt, especially in Mumbai. */
const HINDI_CROSSOVER_CITY_WEIGHT: Record<string, number> = {
  mumbai: 1.6,
  nagpur: 0.4,
  pune: 0.3,
  bengaluru: 0.25,
  hyderabad: 0.3,
  kolkata: 0.2,
  ahmedabad: 0.2,
  surat: 0.2,
};

const HINDI_CITY_BOOST: Record<string, number> = { jaipur: 1.3, lucknow: 1.3, indore: 1.2, patna: 1.1 };

const homeCityWeightCache = new Map<string, Float64Array>();

function pickHomeCity(rng: Rng, lang: LanguageCode, tier: CreatorTier, niche: Niche): City {
  const key = `${lang}|${tier}|${niche}`;
  let weights = homeCityWeightCache.get(key);
  if (!weights) {
    weights = homeCityWeights(lang, tier, niche);
    homeCityWeightCache.set(key, weights);
  }
  return CITIES[rng.weightedIndices(weights, 1)[0]];
}

function homeCityWeights(lang: LanguageCode, tier: CreatorTier, niche: Niche): Float64Array {
  const tierFactor = (cityTier: CityTier): number => {
    let factor = 1;
    if (tier === "macro" || tier === "mega") factor *= cityTier === 1 ? 2.5 : cityTier === 3 ? 0.35 : 1;
    else if (tier === "mid") factor *= cityTier === 1 ? 1.4 : cityTier === 3 ? 0.7 : 1;
    else if (tier === "nano") factor *= cityTier === 1 ? 0.8 : cityTier === 3 ? 1.4 : 1;
    if (niche === "agriculture") factor *= cityTier === 1 ? 0.15 : cityTier === 3 ? 2.2 : 1;
    if (niche === "devotional" && cityTier === 3) factor *= 1.4;
    if ((niche === "tech" || niche === "finance") && cityTier === 1) factor *= 1.4;
    return factor;
  };

  const weightOf = (city: City): number => {
    let base = 0;
    if (lang === "en") {
      base = ENGLISH_CITY_WEIGHT[city.id] ?? (city.tier === 1 ? 2 : city.tier === 2 ? 0.25 : 0.04);
    } else if (lang === "hi") {
      if (city.lang === "hi") base = city.tier === 1 ? 3.2 : city.tier === 2 ? (HINDI_CITY_BOOST[city.id] ?? 1) : 0.55;
      else base = HINDI_CROSSOVER_CITY_WEIGHT[city.id] ?? 0;
    } else if (city.lang === lang) {
      base = city.tier === 1 ? 2.2 : city.tier === 2 ? 1 : 0.7;
    }
    return base * tierFactor(city.tier);
  };

  return Float64Array.from(CITIES, weightOf);
}

function pickNiches(rng: Rng, primary: Niche): Niche[] {
  const count = rng.weighted([1, 2, 3], (n) => (n === 1 ? 0.3 : n === 2 ? 0.5 : 0.2));
  const others = rng.sample(RELATED_NICHES[primary], count - 1);
  return [primary, ...others];
}

const FEMALE_CREATOR_SHARE: Partial<Record<Niche, number>> = {
  beauty: 0.8,
  fashion: 0.65,
  parenting: 0.7,
  automotive: 0.12,
  gaming: 0.2,
  tech: 0.25,
  finance: 0.35,
  agriculture: 0.2,
  sports: 0.25,
  comedy: 0.4,
};

function pickContentLanguages(rng: Rng, lang: LanguageCode, home: City): LanguageCode[] {
  const languages: LanguageCode[] = [lang];
  if (lang === "en") {
    const hindiLeaning = home.lang === "hi" || home.region === "north" || home.region === "central";
    if (rng.chance(hindiLeaning ? 0.45 : 0.25)) languages.push("hi");
    else if (home.lang !== "en" && home.lang !== "hi" && rng.chance(0.3)) languages.push(home.lang);
  } else if (lang === "hi") {
    if (rng.chance(0.5)) languages.push("en");
    if (home.lang !== "hi" && home.lang !== "en" && rng.chance(0.25)) languages.push(home.lang);
  } else {
    if (rng.chance(0.35)) languages.push("en");
    if (rng.chance(lang === "mr" || lang === "gu" || lang === "pa" || lang === "bn" ? 0.22 : 0.08)) languages.push("hi");
  }
  return languages.slice(0, 3);
}

// ---------------------------------------------------------------------------------------------
// Identity: name and handle
// ---------------------------------------------------------------------------------------------

const HANDLE_PATTERN = /^[a-z0-9._]{3,30}$/;

function handlePart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function handleToId(handle: string): string {
  return handle.replace(/[._]+/g, "-").replace(/^-+|-+$/g, "");
}

function shortCityName(city: City): string {
  const options = [city.id, ...city.aliases].map(handlePart).filter((value) => value.length >= 3);
  return options.reduce((best, value) => (value.length < best.length ? value : best), options[0] ?? city.id);
}

function makeHandle(
  rng: Rng,
  context: { first: string; last: string; niche: Niche; gender: Gender; city: City; index: number },
  takenHandles: Set<string>,
  takenIds: Set<string>,
): string {
  const first = handlePart(context.first);
  const last = handlePart(context.last);
  const suffixes =
    context.niche === "parenting"
      ? [...HANDLE_SUFFIXES.parenting, ...(context.gender === "female" ? ["mom", "momlife", "mamadiaries"] : ["dad", "dadlife", "papadiaries"])]
      : HANDLE_SUFFIXES[context.niche];
  const patterns: { weight: number; build: () => string }[] = [
    { weight: 3, build: () => `${first}.${last}` },
    { weight: 2, build: () => `${first}_${last}` },
    { weight: 2, build: () => `${first}${last}` },
    { weight: 3, build: () => `${first}.${rng.pick(suffixes)}` },
    { weight: 2, build: () => `${first}_${rng.pick(suffixes)}` },
    { weight: 2, build: () => `${first}${rng.pick(suffixes)}` },
    { weight: 2, build: () => `${rng.pick(HANDLE_PREFIXES[context.niche])}${first}` },
    { weight: 1, build: () => `${first}.${shortCityName(context.city)}` },
    { weight: 1, build: () => `${first}${last.slice(0, 1)}.${rng.pick(suffixes)}` },
  ];

  for (let attempt = 0; attempt < 40; attempt++) {
    let handle = rng.weighted(patterns, (p) => p.weight).build().slice(0, 30);
    if (attempt >= 4) handle = `${handle.slice(0, 27).replace(/[._]+$/, "")}${rng.int(10, 999)}`;
    handle = handle.replace(/[._]+$/, "");
    if (HANDLE_PATTERN.test(handle) && !takenHandles.has(handle) && !takenIds.has(handleToId(handle))) return handle;
  }
  return `creator.${context.index}`;
}

// ---------------------------------------------------------------------------------------------
// Platforms
// ---------------------------------------------------------------------------------------------

const VIDEO_FIRST_NICHES: Niche[] = ["tech", "education", "gaming", "finance"];
const PROFESSIONAL_NICHES: Niche[] = ["finance", "education", "tech"];

function pickPlatforms(rng: Rng, options: { lang: LanguageCode; home: City; tier: CreatorTier; niches: Niche[]; languages: LanguageCode[] }): Platform[] {
  const { lang, home, tier, niches, languages } = options;
  const [primaryNiche] = niches;
  const weights: Record<Exclude<Platform, "linkedin">, number> = { instagram: 0.64, youtube: 0.18, moj: 0.09, sharechat: 0.09 };
  if (VIDEO_FIRST_NICHES.includes(primaryNiche)) {
    weights.youtube *= 2.8;
    weights.instagram *= 0.7;
  }
  if (primaryNiche === "agriculture" || primaryNiche === "devotional") {
    weights.youtube *= 1.6;
    weights.sharechat *= 2;
    weights.moj *= 1.3;
  }
  if (lang === "en") {
    weights.moj *= 0.05;
    weights.sharechat *= 0.03;
  } else if (home.tier >= 2) {
    // Hindi and regional-language creators outside the metros lean on short-video apps.
    weights.moj *= 2.4;
    weights.sharechat *= 2.6;
  }
  if (tier === "macro" || tier === "mega") {
    weights.moj *= 0.5;
    weights.sharechat *= 0.4;
  }
  const primary = rng.weighted(["instagram", "youtube", "moj", "sharechat"] as const, (p) => weights[p]);

  const secondaryOdds: Partial<Record<Platform, number>> = {};
  const regional = lang !== "en";
  if (primary === "instagram") {
    secondaryOdds.youtube = VIDEO_FIRST_NICHES.includes(primaryNiche) ? 0.7 : 0.45;
    if (regional) secondaryOdds.moj = 0.12;
    if (regional && home.tier >= 2) secondaryOdds.sharechat = 0.08;
  } else if (primary === "youtube") {
    secondaryOdds.instagram = 0.65;
    if (regional) secondaryOdds.moj = 0.06;
  } else if (primary === "moj") {
    secondaryOdds.instagram = 0.4;
    secondaryOdds.sharechat = 0.25;
    secondaryOdds.youtube = 0.15;
  } else {
    secondaryOdds.instagram = 0.3;
    secondaryOdds.moj = 0.3;
    secondaryOdds.youtube = 0.15;
  }
  const professional = niches.some((niche) => PROFESSIONAL_NICHES.includes(niche));
  if (professional && languages.includes("en")) secondaryOdds.linkedin = 0.35;

  const platforms: Platform[] = [primary];
  for (const platform of ["youtube", "instagram", "moj", "sharechat", "linkedin"] as const) {
    if (platforms.length >= 3) break;
    const odds = secondaryOdds[platform];
    if (odds !== undefined && platform !== primary && rng.chance(odds)) platforms.push(platform);
  }
  return platforms;
}

const SECONDARY_FOLLOWER_RATIO: Record<Platform, [number, number]> = {
  instagram: [0.15, 0.8],
  youtube: [0.08, 0.6],
  moj: [0.1, 0.6],
  sharechat: [0.1, 0.55],
  linkedin: [0.02, 0.15],
};

const VIEW_RATIO: Record<Platform, [number, number]> = {
  instagram: [0.18, 0.75],
  youtube: [0.06, 0.32],
  moj: [0.4, 1.4],
  sharechat: [0.25, 1],
  linkedin: [0.05, 0.22],
};

const INSTAGRAM_VIEW_BOOST: Record<CreatorTier, number> = { nano: 1.4, micro: 1.15, mid: 1, macro: 0.85, mega: 0.7 };

const ER_PLATFORM_FACTOR: Record<Platform, number> = { instagram: 1, youtube: 0.9, moj: 1.15, sharechat: 1.05, linkedin: 0.7 };

const POSTS_PER_MONTH: Record<Platform, [number, number]> = {
  instagram: [6, 26],
  youtube: [2, 10],
  moj: [15, 60],
  sharechat: [10, 45],
  linkedin: [2, 8],
};

function primaryFollowers(rng: Rng, tier: CreatorTier): number {
  const { minFollowers, maxFollowers } = CREATOR_TIERS[tier];
  const upper = tier === "mega" ? 6_500_000 : maxFollowers * 0.97;
  const followers = roundCount(rng.logUniform(minFollowers * 1.03, upper, 1.25));
  return clampNumber(followers, minFollowers, maxFollowers - 1);
}

function platformHandle(rng: Rng, platform: Platform, handle: string, first: string, last: string, isPrimary: boolean): string {
  if (isPrimary) return handle;
  if (platform === "linkedin") return `${handlePart(first)}-${handlePart(last)}`.slice(0, 30);
  if (!rng.chance(0.3)) return handle;
  const variant = platform === "youtube" ? `${handle}${rng.pick(["tv", "vlogs", "official"])}` : `${handle}_official`;
  return variant.length <= 30 ? variant : handle;
}

function buildPlatformStats(
  rng: Rng,
  options: {
    platform: Platform;
    followers: number;
    handle: string;
    isPrimary: boolean;
    engagementPods: boolean;
    inactiveFollowers: boolean;
  },
): PlatformStats {
  const { platform, followers, isPrimary } = options;
  const followerTier = tierForFollowers(followers);
  const benchmark = CREATOR_TIERS[followerTier].engagementBenchmark;
  let engagementRate = rng.jitter(benchmark, 0.3) * ER_PLATFORM_FACTOR[platform];
  if (options.engagementPods && isPrimary) engagementRate *= rng.range(2.3, 3.4);
  engagementRate = roundDecimals(clampNumber(engagementRate, 0.3, 14), 1);

  const [low, high] = VIEW_RATIO[platform];
  let viewRatio = rng.range(low, high) * (platform === "instagram" ? INSTAGRAM_VIEW_BOOST[followerTier] : 1);
  if (options.inactiveFollowers) viewRatio *= rng.range(0.45, 0.7);
  const avgViews = Math.max(50, roundCount(followers * viewRatio));

  const [minPosts, maxPosts] = POSTS_PER_MONTH[platform];
  return {
    platform,
    handle: options.handle,
    followers,
    avgViews,
    engagementRate,
    postsPerMonth: rng.int(minPosts, maxPosts),
  };
}

// ---------------------------------------------------------------------------------------------
// Audience
// ---------------------------------------------------------------------------------------------

const AGE_BASE: Partial<Record<Niche, number[]>> = {
  beauty: [0.05, 0.42, 0.38, 0.11, 0.04],
  fashion: [0.06, 0.42, 0.36, 0.12, 0.04],
  food: [0.04, 0.3, 0.36, 0.19, 0.11],
  travel: [0.03, 0.34, 0.4, 0.16, 0.07],
  tech: [0.1, 0.42, 0.33, 0.11, 0.04],
  finance: [0.02, 0.3, 0.44, 0.17, 0.07],
  fitness: [0.05, 0.38, 0.38, 0.14, 0.05],
  health: [0.03, 0.26, 0.36, 0.22, 0.13],
  gaming: [0.2, 0.52, 0.22, 0.05, 0.01],
  education: [0.18, 0.52, 0.22, 0.06, 0.02],
  parenting: [0.01, 0.12, 0.53, 0.27, 0.07],
  comedy: [0.1, 0.45, 0.31, 0.1, 0.04],
  automotive: [0.06, 0.37, 0.38, 0.14, 0.05],
  devotional: [0.03, 0.18, 0.31, 0.27, 0.21],
  agriculture: [0.03, 0.22, 0.34, 0.26, 0.15],
  entertainment: [0.12, 0.44, 0.3, 0.1, 0.04],
  sports: [0.1, 0.42, 0.32, 0.12, 0.04],
};
const DEFAULT_AGE_BASE = [0.06, 0.38, 0.36, 0.14, 0.06];

const FEMALE_AUDIENCE: Record<Niche, number> = {
  beauty: 0.84,
  fashion: 0.74,
  parenting: 0.8,
  food: 0.58,
  health: 0.58,
  lifestyle: 0.64,
  travel: 0.47,
  fitness: 0.45,
  education: 0.47,
  comedy: 0.43,
  entertainment: 0.52,
  devotional: 0.53,
  tech: 0.24,
  finance: 0.28,
  gaming: 0.18,
  automotive: 0.13,
  sports: 0.22,
  agriculture: 0.15,
};

const AUDIENCE_TIERS_BY_HOME: Record<CityTier, number[]> = {
  1: [0.52, 0.31, 0.17],
  2: [0.3, 0.43, 0.27],
  3: [0.18, 0.4, 0.42],
};

const LANGUAGE_REGIONS: Record<LanguageCode, Partial<Record<Region, number>>> = {
  hi: { north: 0.45, central: 0.2, east: 0.18, west: 0.1, south: 0.04, northeast: 0.03 },
  en: { north: 0.24, south: 0.26, west: 0.26, east: 0.12, central: 0.07, northeast: 0.05 },
  ta: { south: 0.86, west: 0.05, north: 0.04, east: 0.02, central: 0.02, northeast: 0.01 },
  te: { south: 0.86, west: 0.05, north: 0.04, east: 0.02, central: 0.02, northeast: 0.01 },
  kn: { south: 0.86, west: 0.07, north: 0.03, east: 0.02, central: 0.01, northeast: 0.01 },
  ml: { south: 0.85, west: 0.06, north: 0.05, east: 0.02, central: 0.01, northeast: 0.01 },
  mr: { west: 0.82, central: 0.07, north: 0.05, south: 0.04, east: 0.01, northeast: 0.01 },
  gu: { west: 0.8, north: 0.08, central: 0.05, south: 0.04, east: 0.02, northeast: 0.01 },
  bn: { east: 0.8, northeast: 0.07, north: 0.06, west: 0.04, south: 0.02, central: 0.01 },
  or: { east: 0.82, south: 0.06, north: 0.04, west: 0.04, central: 0.03, northeast: 0.01 },
  as: { northeast: 0.76, east: 0.12, north: 0.06, west: 0.03, south: 0.02, central: 0.01 },
  pa: { north: 0.84, west: 0.06, central: 0.04, east: 0.03, south: 0.02, northeast: 0.01 },
};

const CITY_TIER_PULL: Record<CityTier, number> = { 1: 6, 2: 1.6, 3: 0.5 };

function blend(primary: number[], others: number[][], primaryWeight = 0.7): number[] {
  if (others.length === 0) return primary;
  return primary.map((value, i) => primaryWeight * value + ((1 - primaryWeight) * others.reduce((sum, o) => sum + o[i], 0)) / others.length);
}

function buildAudience(
  rng: Rng,
  options: { niches: Niche[]; languages: LanguageCode[]; home: City; gender: Gender; primaryPlatform: Platform },
): AudienceProfile {
  const { niches, languages, home } = options;
  const [primaryNiche, ...otherNiches] = niches;
  const [primaryLang, ...otherLangs] = languages;

  // Gender: integer per-mille so female + male lands in [0.975, 1].
  const femaleBase =
    0.7 * FEMALE_AUDIENCE[primaryNiche] +
    0.3 * (otherNiches.length ? otherNiches.reduce((sum, n) => sum + FEMALE_AUDIENCE[n], 0) / otherNiches.length : FEMALE_AUDIENCE[primaryNiche]);
  const female = Math.round(clampNumber(femaleBase + (options.gender === "female" ? 0.04 : -0.04) + rng.normal(0, 0.04), 0.05, 0.95) * 1000);
  const other = rng.int(0, 25);
  const gender = { female: female / 1000, male: (1000 - other - female) / 1000 };

  const ageWeights = blend(
    AGE_BASE[primaryNiche] ?? DEFAULT_AGE_BASE,
    otherNiches.map((n) => AGE_BASE[n] ?? DEFAULT_AGE_BASE),
  ).map((w) => rng.jitter(w, 0.2));
  const ageShares = toShares(ageWeights);
  const age = Object.fromEntries(AGE_BANDS.map((band, i) => [band, ageShares[i]])) as Record<AgeBand, number>;

  const tierWeights = [...AUDIENCE_TIERS_BY_HOME[home.tier]];
  const adjust = (factors: number[]) => factors.forEach((f, i) => (tierWeights[i] *= f));
  if (primaryLang === "en") adjust([1.35, 1, 0.6]);
  else if (primaryLang !== "hi") adjust([0.9, 1.1, 1.15]);
  if (options.primaryPlatform === "moj" || options.primaryPlatform === "sharechat") adjust([0.6, 1.05, 1.3]);
  if (primaryNiche === "agriculture") adjust([0.5, 1, 1.6]);
  const tierShares = toShares(tierWeights.map((w) => rng.jitter(w, 0.15)));
  const tiers: Record<CityTier, number> = { 1: tierShares[0], 2: tierShares[1], 3: tierShares[2] };

  const regionWeights = REGION_LIST.map((region) => {
    let weight = LANGUAGE_REGIONS[primaryLang][region] ?? 0.01;
    for (const lang of otherLangs) weight = 0.85 * weight + 0.15 * (LANGUAGE_REGIONS[lang][region] ?? 0.01);
    if ((primaryLang === "hi" || primaryLang === "en") && region === home.region) weight += 0.12;
    return rng.jitter(weight, 0.25);
  });
  const regionShares = toShares(regionWeights);
  const regions = Object.fromEntries(REGION_LIST.map((region, i) => [region, regionShares[i]])) as Record<Region, number>;

  return { gender, age, tiers, regions, topCities: buildTopCities(rng, home, regions, languages), languages: buildAudienceLanguages(rng, languages, home) };
}

function cityFraction(rng: Rng, city: City, isHome: boolean): number {
  if (isHome) return rng.range(0.25, 0.42);
  if (city.tier === 1) return rng.range(0.12, 0.26);
  if (city.tier === 2) return rng.range(0.05, 0.13);
  return rng.range(0.025, 0.07);
}

/** Five cities from the regions where the audience lives, home city included, shares descending. */
function buildTopCities(rng: Rng, home: City, regions: Record<Region, number>, languages: LanguageCode[]): AudienceProfile["topCities"] {
  const weights = new Float64Array(CITIES.length);
  for (let i = 0; i < CITIES.length; i++) {
    const city = CITIES[i];
    if (city.id === home.id) continue;
    weights[i] =
      regions[city.region] *
      CITY_TIER_PULL[city.tier] *
      // English-first audiences concentrate in the metros.
      (languages[0] === "en" && city.tier === 1 ? 3 : 1) *
      (city.lang === languages[0] ? 2.2 : languages.includes(city.lang) ? 1.3 : 1);
  }
  const others = rng.weightedIndices(weights, 4).map((index) => CITIES[index]);
  const picked = [home, ...others].map((city) => ({ city, fraction: cityFraction(rng, city, city.id === home.id) }));

  // A region's top cities never hold more than 80% of that region's audience.
  const byRegion = new Map<Region, number>();
  for (const { city, fraction } of picked) byRegion.set(city.region, (byRegion.get(city.region) ?? 0) + fraction);
  return picked
    .map(({ city, fraction }) => {
      const regionTotal = byRegion.get(city.region) ?? fraction;
      const scaled = regionTotal > 0.8 ? (fraction * 0.8) / regionTotal : fraction;
      return { cityId: city.id, share: Math.max(0.001, roundDecimals(regions[city.region] * scaled, 3)) };
    })
    .sort((a, b) => b.share - a.share || a.cityId.localeCompare(b.cityId));
}

function buildAudienceLanguages(rng: Rng, languages: LanguageCode[], home: City): AudienceProfile["languages"] {
  const [primary, ...secondary] = languages;
  const [low, high] = primary === "en" ? [0.52, 0.68] : primary === "hi" ? [0.6, 0.86] : [0.64, 0.9];
  const primaryShare = rng.range(low, high);

  const others: LanguageCode[] = [...secondary];
  const extras: LanguageCode[] = primary === "en" ? ["hi", home.lang, "mr"] : primary === "hi" ? ["en", home.lang, "pa"] : ["en", "hi"];
  for (const code of extras) {
    if (others.length >= 3) break;
    if (code !== primary && !others.includes(code)) others.push(code);
  }

  const otherWeights = others.map((code, i) => (secondary.includes(code) ? rng.range(0.5, 0.8) : rng.range(0.1, 0.35) / (i + 1)));
  const otherTotal = otherWeights.reduce((sum, w) => sum + w, 0);
  const shares = toShares([primaryShare, ...otherWeights.map((w) => (w / otherTotal) * (1 - primaryShare))]);
  return [primary, ...others]
    .map((code, i) => ({ code, share: shares[i] }))
    .sort((a, b) => b.share - a.share || (a.code === primary ? -1 : b.code === primary ? 1 : 0));
}

// ---------------------------------------------------------------------------------------------
// Trust signals, rates and history
// ---------------------------------------------------------------------------------------------

function buildAuthenticity(rng: Rng, lowAuthenticity: boolean, followers: number): Creator["authenticity"] & { pods: boolean; inactive: boolean } {
  if (!lowAuthenticity) {
    const score = Math.round(clampNumber(rng.normal(86, 5.5), 70, 96));
    const flags = score < 76 && rng.chance(0.35) ? ["Small follower spike after a viral reel"] : [];
    return { score, suspiciousFollowerPct: suspiciousShare(rng, score), flags, pods: false, inactive: false };
  }
  const score = rng.int(40, 65);
  const kinds = rng.sample(["spike", "inactive", "pods", "generic", "irregular"] as const, rng.int(1, 3));
  const flags = kinds.map((kind) => {
    switch (kind) {
      case "spike":
        return `Follower spike of ${formatCount(roughCount(followers * rng.range(0.08, 0.25)))} in one week`;
      case "inactive":
        return "High share of inactive followers";
      case "pods":
        return "Engagement-pod patterns in comments";
      case "generic":
        return "Comments are mostly generic emojis";
      default:
        return "Irregular follower growth over the last 90 days";
    }
  });
  return { score, suspiciousFollowerPct: suspiciousShare(rng, score), flags, pods: kinds.includes("pods"), inactive: kinds.includes("inactive") };
}

/** Two significant figures, as people quote spikes ("18K", "1.2K"). */
function roughCount(value: number): number {
  const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(Math.max(1, value))) - 1);
  return Math.round(value / magnitude) * magnitude;
}

function suspiciousShare(rng: Rng, score: number): number {
  return roundDecimals(clampNumber((100 - score) * rng.range(0.55, 0.85), 0.5, 60), 1);
}

const RISKY_FLAGS = {
  profanity: "Occasional profanity",
  politics: "Frequent political commentary",
  gambling: "Promoted real-money gaming in the last 90 days",
  darkHumour: "Dark humour that may not suit family brands",
  disclosure: "Missed #ad disclosures on past paid posts (ASCI)",
  crypto: "Promoted crypto trading tips",
} as const;

function buildBrandSafety(rng: Rng, risky: boolean, niche: Niche): Creator["brandSafety"] {
  if (!risky) {
    const score = Math.round(clampNumber(rng.normal(94, 3.5), 85, 100));
    return { score, flags: score < 90 && rng.chance(0.25) ? [RISKY_FLAGS.profanity] : [] };
  }
  const pool: (keyof typeof RISKY_FLAGS)[] =
    niche === "comedy"
      ? ["profanity", "darkHumour", "politics", "disclosure"]
      : niche === "gaming"
        ? ["gambling", "profanity", "disclosure"]
        : niche === "finance"
          ? ["crypto", "disclosure", "politics"]
          : ["politics", "disclosure", "profanity"];
  const kinds = rng.sample(pool, rng.int(1, 2));
  return { score: rng.int(55, 75), flags: kinds.map((kind) => RISKY_FLAGS[kind]) };
}

const NICHE_RATE_PREMIUM: Partial<Record<Niche, number>> = {
  finance: 1.25,
  tech: 1.2,
  beauty: 1.1,
  automotive: 1.1,
  education: 1.05,
  agriculture: 0.85,
  devotional: 0.85,
  comedy: 1.05,
};

function buildRates(
  rng: Rng,
  options: { tier: CreatorTier; followers: number; engagementRate: number; authenticity: number; niche: Niche; lang: LanguageCode; hasYouTube: boolean },
): RateCard {
  const { tier, followers } = options;
  const { minFollowers, maxFollowers, engagementBenchmark, reelRate } = CREATOR_TIERS[tier];
  const [low, high] = reelRate;
  const position = clampNumber(Math.log(followers / minFollowers) / Math.log(maxFollowers / minFollowers), 0, 1);
  const quality =
    clampNumber(options.engagementRate / engagementBenchmark, 0.5, 2) ** 0.35 *
    (options.authenticity / 88) ** 1.2 *
    (NICHE_RATE_PREMIUM[options.niche] ?? 1) *
    (options.lang === "en" ? 1.1 : options.lang === "hi" ? 1 : 0.95) *
    rng.jitter(1, 0.12);
  const reel = clampNumber(roundFee(low * (high / low) ** position * quality), low, high);
  return {
    reel,
    story: roundFee(reel * rng.range(0.3, 0.4)),
    post: roundFee(reel * rng.range(0.6, 0.8)),
    video: options.hasYouTube ? roundFee(reel * rng.range(1.5, 2.5)) : null,
  };
}

const COLLABORATION_COUNT: Record<CreatorTier, [number, number]> = {
  nano: [0, 2],
  micro: [0, 4],
  mid: [1, 5],
  macro: [2, 6],
  mega: [3, 6],
};

const brandWeightCache = new Map<string, Float64Array>();

function brandWeights(niches: Niche[]): Float64Array {
  const key = niches.join(",");
  let weights = brandWeightCache.get(key);
  if (!weights) {
    const [primary] = niches;
    weights = Float64Array.from(FICTIONAL_BRANDS, (brand) =>
      brand.niches.includes(primary) ? 3 : brand.niches.some((n) => niches.includes(n)) ? 1.5 : 0.12,
    );
    brandWeightCache.set(key, weights);
  }
  return weights;
}

function buildCollaborations(rng: Rng, tier: CreatorTier, niches: Niche[], brandSafetyFlags: string[]): Collaboration[] {
  const [min, max] = COLLABORATION_COUNT[tier];
  const brands = rng.weightedIndices(brandWeights(niches), rng.int(min, max)).map((index) => FICTIONAL_BRANDS[index]);
  const collaborations = brands.map((brand) => ({ brand: brand.name, category: brand.category, monthsAgo: rng.int(1, 24) }));

  // Keep the history consistent with the brand-safety flag.
  if (brandSafetyFlags.includes(RISKY_FLAGS.gambling)) {
    const gaming = FICTIONAL_BRANDS.find((brand) => brand.name === REAL_MONEY_GAMING_BRAND);
    const existing = collaborations.find((c) => c.brand === REAL_MONEY_GAMING_BRAND);
    if (existing) existing.monthsAgo = rng.int(1, 3);
    else if (gaming) {
      if (collaborations.length >= 6) collaborations.pop();
      collaborations.push({ brand: gaming.name, category: gaming.category, monthsAgo: rng.int(1, 3) });
    }
  }
  return collaborations.sort((a, b) => a.monthsAgo - b.monthsAgo || a.brand.localeCompare(b.brand));
}

const RESPONSE_RATE: Record<CreatorTier, [number, number]> = {
  nano: [0.6, 0.98],
  micro: [0.5, 0.95],
  mid: [0.45, 0.9],
  macro: [0.38, 0.8],
  mega: [0.35, 0.7],
};
const TURNAROUND_DAYS: Record<CreatorTier, [number, number]> = { nano: [2, 6], micro: [3, 8], mid: [4, 10], macro: [5, 12], mega: [7, 14] };
const VERIFIED_ODDS: Record<CreatorTier, number> = { nano: 0.35, micro: 0.6, mid: 0.8, macro: 0.92, mega: 0.98 };
const GST_ODDS: Record<CreatorTier, number> = { nano: 0.1, micro: 0.3, mid: 0.7, macro: 0.9, mega: 0.97 };

// ---------------------------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------------------------

interface TakenIdentities {
  names: Set<string>;
  handles: Set<string>;
  ids: Set<string>;
}

function buildCreator(seed: number, slot: Slot, taken: TakenIdentities): Creator {
  // Uniform draws only for the profile and identity streams (see the file header).
  const profileRng = Rng.derive(seed, `profile:${slot.index}`);
  const home = pickHomeCity(profileRng, slot.lang, slot.tier, slot.niche);
  const niches = pickNiches(profileRng, slot.niche);
  const gender: Gender = profileRng.chance(FEMALE_CREATOR_SHARE[slot.niche] ?? 0.5) ? "female" : "male";
  const languages = pickContentLanguages(profileRng, slot.lang, home);

  const identityRng = Rng.derive(seed, `identity:${slot.index}`);
  const group = nameGroupFor(identityRng, { lang: slot.lang, cityId: home.id, region: home.region });
  const { first, last } = pickName(identityRng, group, gender, taken.names);
  const handle = makeHandle(identityRng, { first, last, niche: slot.niche, gender, city: home, index: slot.index }, taken.handles, taken.ids);
  const id = handleToId(handle);
  taken.names.add(nameKey(`${first} ${last}`));
  taken.handles.add(handle);
  taken.ids.add(id);

  const rng = Rng.derive(seed, `metrics:${slot.index}`);
  const platformList = pickPlatforms(rng, { lang: slot.lang, home, tier: slot.tier, niches, languages });
  const followers = primaryFollowers(rng, slot.tier);
  const authenticity = buildAuthenticity(rng, slot.lowAuthenticity, followers);
  const platforms = platformList.map((platform, i) => {
    const [low, high] = SECONDARY_FOLLOWER_RATIO[platform];
    const platformFollowers = i === 0 ? followers : Math.max(200, roundCount(followers * rng.range(low, high)));
    return buildPlatformStats(rng, {
      platform,
      followers: platformFollowers,
      handle: platformHandle(rng, platform, handle, first, last, i === 0),
      isPrimary: i === 0,
      engagementPods: authenticity.pods,
      inactiveFollowers: authenticity.inactive,
    });
  });

  const brandSafety = buildBrandSafety(rng, slot.riskyContent, slot.niche);
  const tier = tierForFollowers(followers);

  return {
    id,
    name: `${first} ${last}`,
    handle,
    bio: buildBio(rng, { cityName: home.name, languages, niches }),
    homeCityId: home.id,
    languages,
    niches,
    topics: pickTopics(rng, niches, languages),
    platforms,
    tier,
    audience: buildAudience(rng, { niches, languages, home, gender, primaryPlatform: platformList[0] }),
    authenticity: { score: authenticity.score, suspiciousFollowerPct: authenticity.suspiciousFollowerPct, flags: authenticity.flags },
    brandSafety,
    rates: buildRates(rng, {
      tier,
      followers,
      engagementRate: platforms[0].engagementRate,
      authenticity: authenticity.score,
      niche: slot.niche,
      lang: slot.lang,
      hasYouTube: platformList.includes("youtube"),
    }),
    collaborations: buildCollaborations(rng, tier, niches, brandSafety.flags),
    responseRate: roundDecimals(rng.range(...RESPONSE_RATE[tier]), 2),
    avgTurnaroundDays: rng.int(...TURNAROUND_DAYS[tier]),
    verified: rng.chance(VERIFIED_ODDS[tier]),
    gstRegistered: rng.chance(GST_ODDS[tier]),
    joinedMonthsAgo: rng.int(1, 30),
    avatarHue: rng.int(0, 359),
  };
}

/** Builds the fictional demo dataset. The same seed and size always produce identical creators. */
export function generateCreators(seed: number = DATASET_SEED, size: number = DATASET_SIZE): Creator[] {
  const count = Math.max(1, Math.floor(size));
  const taken: TakenIdentities = { names: new Set(), handles: new Set(), ids: new Set() };
  return planSlots(seed, count).map((slot) => buildCreator(seed, slot, taken));
}
