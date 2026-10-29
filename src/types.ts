// Domain model shared by the UI, the matching engine, the brief parser and the Netlify function.
// Keep this file free of runtime imports: the function bundle imports it through relative paths.

export type Platform = "instagram" | "youtube" | "moj" | "sharechat" | "linkedin";

/** ISO 639-1 codes for the content languages we support. */
export type LanguageCode = "hi" | "en" | "ta" | "te" | "mr" | "bn" | "kn" | "ml" | "gu" | "pa" | "or" | "as";

export type Region = "north" | "south" | "east" | "west" | "central" | "northeast";

/** 1 = metros, 2 = large non-metro cities, 3 = smaller cities and towns. */
export type CityTier = 1 | 2 | 3;

export type Niche =
  | "beauty"
  | "fashion"
  | "food"
  | "travel"
  | "tech"
  | "finance"
  | "fitness"
  | "health"
  | "gaming"
  | "education"
  | "parenting"
  | "comedy"
  | "lifestyle"
  | "automotive"
  | "devotional"
  | "agriculture"
  | "entertainment"
  | "sports";

/** Size bucket by followers on the creator's primary platform (ranges in data/taxonomy.ts). */
export type CreatorTier = "nano" | "micro" | "mid" | "macro" | "mega";

export type AgeBand = "13-17" | "18-24" | "25-34" | "35-44" | "45+";

export type Gender = "female" | "male";

/** reel = short vertical video (IG Reels, YT Shorts, Moj), video = long-form YouTube integration. */
export type Deliverable = "reel" | "story" | "post" | "video";

export type CampaignGoal = "awareness" | "consideration" | "conversions" | "app_installs" | "ugc";

export interface City {
  id: string;
  name: string;
  state: string;
  tier: CityTier;
  region: Region;
  /** Most widely spoken local language. */
  lang: LanguageCode;
  /** Old or alternate names used in briefs ("Bangalore", "Bombay"). Lowercase. */
  aliases: string[];
}

export interface State {
  name: string;
  region: Region;
  lang: LanguageCode;
  /** Lowercase alternate spellings ("orissa", "bengal"). Matched case-insensitively. */
  aliases: string[];
  /** Upper-case abbreviations ("TN", "UP"). Match case-sensitively as whole words only. */
  abbr: string[];
}

export interface PlatformStats {
  platform: Platform;
  handle: string;
  followers: number;
  /** Average views per piece of content: the reach proxy used for estimates. */
  avgViews: number;
  /** Percent, e.g. 3.4 means 3.4%. */
  engagementRate: number;
  postsPerMonth: number;
}

export interface AudienceProfile {
  /** Shares in 0..1. They may sum to slightly under 1 (the rest is other/unknown). */
  gender: Record<Gender, number>;
  /** Shares in 0..1 summing to 1. */
  age: Record<AgeBand, number>;
  /** Share of the audience living in each city tier, summing to 1. */
  tiers: Record<CityTier, number>;
  /** Share of the audience in each region, summing to 1. */
  regions: Record<Region, number>;
  /** Top 5 cities, highest share first. */
  topCities: { cityId: string; share: number }[];
  /** Audience languages, highest share first. */
  languages: { code: LanguageCode; share: number }[];
}

/** Estimated INR fee per deliverable on the creator's primary platform. */
export interface RateCard {
  reel: number;
  story: number;
  post: number;
  /** null when the creator has no YouTube channel. */
  video: number | null;
}

export interface Collaboration {
  /** Fictional brand name: demo data never references real companies. */
  brand: string;
  category: string;
  monthsAgo: number;
}

export interface Creator {
  id: string;
  name: string;
  /** Primary handle without the leading @. */
  handle: string;
  bio: string;
  homeCityId: string;
  /** Content languages, primary first. */
  languages: LanguageCode[];
  /** 1-3 niches, primary first. */
  niches: Niche[];
  /** Fine-grained content keywords used for semantic matching. */
  topics: string[];
  /** Primary platform first. */
  platforms: PlatformStats[];
  tier: CreatorTier;
  audience: AudienceProfile;
  /** score 0-100 (higher = more authentic); suspiciousFollowerPct 0-100. */
  authenticity: { score: number; suspiciousFollowerPct: number; flags: string[] };
  /** score 0-100 (higher = safer). */
  brandSafety: { score: number; flags: string[] };
  rates: RateCard;
  collaborations: Collaboration[];
  /** Probability (0..1) the creator replies to a brand enquiry. */
  responseRate: number;
  avgTurnaroundDays: number;
  verified: boolean;
  gstRegistered: boolean;
  joinedMonthsAgo: number;
  /** 0-359, used for the generated avatar. */
  avatarHue: number;
}

/**
 * A brand's campaign brief. Empty arrays mean "no preference": the matching engine leaves those
 * criteria out of the weighted score instead of penalising every creator.
 */
export interface CampaignBrief {
  brandName: string;
  productCategory: string;
  description: string;
  goal: CampaignGoal;
  niches: Niche[];
  languages: LanguageCode[];
  platforms: Platform[];
  deliverable: Deliverable;
  targetGender: Gender | "any";
  targetAges: AgeBand[];
  targetTiers: CityTier[];
  targetRegions: Region[];
  targetCityIds: string[];
  creatorTiers: CreatorTier[];
  /** Total campaign budget in INR; 0 = not set. */
  budgetINR: number;
  /** How many creators the brand wants to work with (>= 1). */
  creatorsWanted: number;
  /** Hard filter, 0-100. */
  minAuthenticity: number;
  /** Hard filter in percent; 0 = no minimum. */
  minEngagementRate: number;
  /** Competitor brands: creators who worked with any of them in the last 6 months are excluded. */
  excludeBrands: string[];
}

export type ScoreKey = "niche" | "audience" | "language" | "geo" | "engagement" | "authenticity" | "budget" | "platform";

export type ScoreWeights = Record<ScoreKey, number>;

export interface ScoreComponent {
  key: ScoreKey;
  label: string;
  /** 0-100. */
  score: number;
  /** Weight actually applied after re-normalising (0 when the brief has no preference for it). */
  weight: number;
  /** False when the brief expressed no preference, so the component did not count. */
  applied: boolean;
  /** One short human-readable sentence explaining the score. */
  detail: string;
}

export interface MatchResult {
  creator: Creator;
  /** Weighted 0-100 score. */
  score: number;
  components: ScoreComponent[];
  /** Top positive reasons, most important first (max ~4). */
  reasons: string[];
  /** Risks worth a human look (competitor work, low authenticity, over budget...). */
  warnings: string[];
  /** Platform used for the estimates below: the creator's best platform among the brief's targets. */
  platform: Platform;
  estimatedCostINR: number;
  estimatedReach: number;
  estimatedEngagements: number;
  /** Set when a hard filter failed; such results are returned in MatchResponse.excluded. */
  excludedReason: string | null;
}

export interface MatchResponse {
  /** Eligible creators, best score first. */
  results: MatchResult[];
  /** Creators removed by hard filters, with excludedReason set. */
  excluded: MatchResult[];
}

export interface MatchOptions {
  weights?: Partial<ScoreWeights>;
  /** Max eligible results to return (default: all). */
  limit?: number;
}

export interface CampaignPlan {
  selected: MatchResult[];
  totalCostINR: number;
  totalReach: number;
  totalEngagements: number;
  /** Cost per 1,000 estimated views; 0 when reach is 0. */
  cpmINR: number;
  /** Cost per estimated engagement; 0 when engagements are 0. */
  cpeINR: number;
  /** Budget minus total cost (negative when over budget); equals -totalCost when budget is 0. */
  remainingBudgetINR: number;
  notes: string[];
}

export interface ParsedBrief {
  brief: Partial<CampaignBrief>;
  source: "ai" | "rules";
  /** Assumptions and detections worth showing the user ("Read ₹5 lakh as ₹5,00,000"). */
  notes: string[];
  detectedFields: (keyof CampaignBrief)[];
}
