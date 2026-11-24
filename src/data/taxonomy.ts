// Shared vocabulary for the Indian market: niches, languages, platforms, regions, cities and tiers.
// Used by the UI, the demo-data generator, the matching engine and the brief parsers (including the
// Netlify function), so it must only use relative imports and no browser APIs.
import { DISTRICT_REGION, DISTRICTS } from "./maharashtra";
import type {
  AgeBand,
  CampaignGoal,
  City,
  CityTier,
  CreatorTier,
  Deliverable,
  Gender,
  LanguageCode,
  Niche,
  Platform,
  Region,
  State,
} from "../types";

// ---------------------------------------------------------------------------------------------
// Niches
// ---------------------------------------------------------------------------------------------

export const NICHES: Niche[] = [
  "beauty",
  "fashion",
  "food",
  "travel",
  "tech",
  "finance",
  "fitness",
  "health",
  "gaming",
  "education",
  "parenting",
  "comedy",
  "lifestyle",
  "automotive",
  "devotional",
  "agriculture",
  "entertainment",
  "sports",
];

export const NICHE_LABELS: Record<Niche, string> = {
  beauty: "Beauty & skincare",
  fashion: "Fashion",
  food: "Food",
  travel: "Travel",
  tech: "Tech & gadgets",
  finance: "Personal finance",
  fitness: "Fitness",
  health: "Health & wellness",
  gaming: "Gaming",
  education: "Education & careers",
  parenting: "Parenting",
  comedy: "Comedy",
  lifestyle: "Lifestyle",
  automotive: "Auto & EVs",
  devotional: "Devotional & culture",
  agriculture: "Agriculture",
  entertainment: "Film, music & dance",
  sports: "Sports",
};

/**
 * Lowercase keywords (English, Hinglish and common product terms) that signal a niche. A keyword
 * may appear under several niches. Multi-word phrases are allowed.
 */
export const NICHE_KEYWORDS: Record<Niche, string[]> = {
  beauty: [
    "beauty", "skincare", "skin care", "makeup", "make-up", "cosmetics", "serum", "sunscreen", "moisturiser",
    "moisturizer", "lipstick", "kajal", "haircare", "hair care", "hair oil", "shampoo", "grooming", "beard",
    "fragrance", "perfume", "nail", "face wash", "glow", "acne", "ayurvedic skincare",
  ],
  fashion: [
    "fashion", "style", "outfit", "ootd", "saree", "sari", "kurta", "kurti", "lehenga", "ethnic wear",
    "streetwear", "sneakers", "footwear", "jewellery", "jewelry", "handloom", "apparel", "clothing", "wedding wear",
    "accessories", "watches", "bags", "denim",
  ],
  food: [
    "food", "recipe", "recipes", "cooking", "khana", "street food", "snacks", "namkeen", "chai", "tea", "coffee",
    "biryani", "restaurant", "food delivery", "masala", "spices", "baking", "mithai", "sweets", "beverage",
    "drinks", "millets", "ghee", "dairy", "kitchen", "home chef",
  ],
  travel: [
    "travel", "trip", "trips", "tourism", "trek", "trekking", "backpacking", "hotel", "hotels", "homestay",
    "resort", "yatra", "road trip", "flights", "holiday", "vacation", "staycation", "itinerary", "himalaya",
  ],
  tech: [
    "tech", "technology", "gadget", "gadgets", "smartphone", "phone", "mobile phone", "laptop", "unboxing",
    "earbuds", "smartwatch", "wearable", "app", "software", "ai", "saas", "electronics", "camera", "pc", "android",
    "iphone", "consumer electronics", "ev",
  ],
  finance: [
    "finance", "personal finance", "money", "paisa", "investing", "investment", "mutual fund", "mutual funds",
    "sip", "stock", "stocks", "share market", "trading", "upi", "payments", "credit card", "loan", "loans",
    "insurance", "tax", "budgeting", "savings", "fintech", "gold", "neobank", "wealth",
  ],
  fitness: [
    "fitness", "gym", "workout", "yoga", "protein", "whey", "running", "marathon", "weight loss", "fat loss",
    "home workout", "calisthenics", "sportswear", "activewear", "supplements",
  ],
  health: [
    "health", "wellness", "nutrition", "diet", "ayurveda", "ayurvedic", "mental health", "doctor", "healthcare",
    "pharmacy", "medicine", "diabetes", "sleep", "meditation", "immunity", "period care", "menstrual", "hygiene",
    "supplements", "health insurance",
  ],
  gaming: [
    "gaming", "gamer", "esports", "e-sports", "bgmi", "free fire", "valorant", "minecraft", "gta", "pc gaming",
    "mobile gaming", "mobile games", "streamer", "live streaming", "console", "real money gaming",
  ],
  education: [
    "education", "edtech", "study", "students", "student", "exam", "exams", "upsc", "jee", "neet", "cat", "gate",
    "ssc", "boards", "career", "careers", "coding", "programming", "upskilling", "courses", "english speaking",
    "spoken english", "learning", "tuition", "college", "jobs",
  ],
  parenting: [
    "parenting", "parents", "mom", "moms", "mother", "mommy", "dad", "baby", "babies", "kids", "children", "toddler",
    "pregnancy", "maternity", "newborn", "diapers", "baby care", "school",
  ],
  comedy: ["comedy", "comedian", "funny", "humour", "humor", "sketch", "sketches", "memes", "standup", "stand-up", "roast", "skits", "relatable"],
  lifestyle: [
    "lifestyle", "vlog", "vlogs", "daily vlog", "home decor", "decor", "interiors", "minimalism", "productivity",
    "home", "living", "self care", "wedding", "pets", "pet food", "luxury", "real estate", "family", "d2c",
  ],
  automotive: [
    "auto", "automotive", "car", "cars", "bike", "bikes", "motorcycle", "scooter", "electric scooter", "ev", "evs",
    "electric vehicle", "test drive", "two-wheeler", "two wheeler", "tyres", "helmet", "road safety",
  ],
  devotional: [
    "devotional", "spiritual", "spirituality", "bhajan", "bhakti", "temple", "pooja", "puja", "astrology",
    "jyotish", "festival", "festive", "diwali", "navratri", "durga puja", "pongal", "onam", "eid", "culture",
    "tradition", "mythology",
  ],
  agriculture: [
    "agriculture", "farming", "farmer", "farmers", "kisan", "tractor", "seeds", "fertiliser", "fertilizer",
    "organic farming", "dairy farming", "crop", "crops", "agritech", "rural", "village", "irrigation",
  ],
  entertainment: [
    "entertainment", "bollywood", "tollywood", "kollywood", "mollywood", "movie", "movies", "film", "films",
    "cinema", "ott", "web series", "music", "song", "songs", "singer", "dance", "dancer", "celebrity", "reviews",
  ],
  sports: [
    "sports", "sport", "cricket", "ipl", "football", "kabaddi", "badminton", "hockey", "athlete", "fantasy sports",
    "fantasy cricket", "tennis", "chess", "wrestling",
  ],
};

// ---------------------------------------------------------------------------------------------
// Languages
// ---------------------------------------------------------------------------------------------

export const LANGUAGE_CODES: LanguageCode[] = ["mr", "hi", "en"];

export const LANGUAGES: Record<LanguageCode, { label: string; native: string; aliases: string[] }> = {
  mr: { label: "Marathi", native: "मराठी", aliases: ["marathi", "मराठी"] },
  hi: { label: "Hindi", native: "हिन्दी", aliases: ["hindi", "हिंदी", "हिन्दी", "hinglish"] },
  en: { label: "English", native: "English", aliases: ["english", "hinglish"] },
};

// ---------------------------------------------------------------------------------------------
// Platforms and deliverables
// ---------------------------------------------------------------------------------------------

export const PLATFORM_LIST: Platform[] = ["instagram", "youtube", "moj", "sharechat", "linkedin"];

export const PLATFORMS: Record<Platform, { label: string; aliases: string[]; deliverables: Deliverable[] }> = {
  instagram: { label: "Instagram", aliases: ["instagram", "insta", "ig"], deliverables: ["reel", "story", "post"] },
  youtube: { label: "YouTube", aliases: ["youtube", "yt", "youtuber", "youtubers", "shorts"], deliverables: ["video", "reel"] },
  moj: { label: "Moj", aliases: ["moj"], deliverables: ["reel"] },
  sharechat: { label: "ShareChat", aliases: ["sharechat", "share chat"], deliverables: ["reel", "post"] },
  linkedin: { label: "LinkedIn", aliases: ["linkedin"], deliverables: ["post", "video"] },
};

export const DELIVERABLE_LIST: Deliverable[] = ["reel", "story", "post", "video"];

export const DELIVERABLES: Record<Deliverable, { label: string; description: string; aliases: string[] }> = {
  reel: { label: "Reel / Short", description: "15-60 second vertical video", aliases: ["reel", "reels", "short", "shorts", "short video"] },
  story: { label: "Story", description: "24-hour story with a link sticker", aliases: ["story", "stories"] },
  post: { label: "Static or carousel post", description: "Image or carousel in the feed", aliases: ["post", "posts", "carousel", "static post"] },
  video: {
    label: "YouTube integration",
    description: "Dedicated or integrated long-form video",
    aliases: ["youtube video", "long-form", "long form", "integration", "dedicated video"],
  },
};

// ---------------------------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------------------------

export const GOAL_LIST: CampaignGoal[] = ["awareness", "consideration", "conversions", "app_installs", "ugc"];

export const GOALS: Record<CampaignGoal, { label: string; description: string; aliases: string[] }> = {
  awareness: { label: "Brand awareness", description: "Maximise reach and views", aliases: ["awareness", "reach", "visibility", "launch", "buzz"] },
  consideration: {
    label: "Consideration",
    description: "Drive engagement, saves and profile visits",
    aliases: ["consideration", "engagement", "traffic", "followers"],
  },
  conversions: {
    label: "Sales & conversions",
    description: "Drive purchases with links and discount codes",
    aliases: ["sales", "conversions", "conversion", "purchases", "orders", "roi", "performance", "discount code"],
  },
  app_installs: {
    label: "App installs",
    description: "Drive downloads and sign-ups",
    aliases: ["app installs", "installs", "downloads", "app downloads", "sign-ups", "signups", "registrations"],
  },
  ugc: { label: "UGC content", description: "Authentic content to reuse in your own ads", aliases: ["ugc", "user generated", "user-generated", "content creation"] },
};

// ---------------------------------------------------------------------------------------------
// Audience demographics
// ---------------------------------------------------------------------------------------------

export const AGE_BANDS: AgeBand[] = ["13-17", "18-24", "25-34", "35-44", "45+"];

export const AGE_BAND_LABELS: Record<AgeBand, string> = {
  "13-17": "13-17",
  "18-24": "18-24",
  "25-34": "25-34",
  "35-44": "35-44",
  "45+": "45+",
};

export const GENDER_LABELS: Record<Gender | "any", string> = { any: "Any", female: "Women", male: "Men" };

// ---------------------------------------------------------------------------------------------
// Geography
// ---------------------------------------------------------------------------------------------

// Ordered by audience size, which is the order a media buyer thinks in.
export const REGION_LIST: Region[] = ["mumbai_metro", "western", "vidarbha", "marathwada", "north", "konkan"];

/**
 * Aliases here are names of the division itself, never of a city or district inside it. A division
 * alias is blanked from the brief once matched, so listing "pune" under Western Maharashtra made
 * "creators in Pune" target the whole division and lose the city. Districts reach their division
 * through STATES, and cities through CITIES; this list only has to catch the division's own names.
 */
export const REGIONS: Record<Region, { label: string; aliases: string[] }> = {
  mumbai_metro: { label: "Mumbai Metropolitan", aliases: ["mumbai metropolitan region", "mumbai metropolitan", "mumbai metro", "mmr"] },
  western: { label: "Western Maharashtra", aliases: ["western maharashtra", "west maharashtra", "pune belt", "sugar belt"] },
  north: { label: "North Maharashtra", aliases: ["north maharashtra", "northern maharashtra", "khandesh"] },
  marathwada: { label: "Marathwada", aliases: ["marathwada", "मराठवाडा"] },
  vidarbha: { label: "Vidarbha", aliases: ["vidarbha", "विदर्भ"] },
  konkan: { label: "Konkan", aliases: ["konkan", "coastal maharashtra", "कोकण"] },
};

/** Phrases that mean the whole state, i.e. no division filter at all. */
export const STATEWIDE_ALIASES = ["all maharashtra", "across maharashtra", "whole maharashtra", "pan maharashtra", "statewide", "महाराष्ट्रभर"];

/** Phrases that mean "no geographic preference". */
export const PAN_INDIA_ALIASES = ["pan india", "pan-india", "all india", "all-india", "nationwide", "across india", "pan indian"];

export const CITY_TIER_LIST: CityTier[] = [1, 2, 3];

export const CITY_TIER_LABELS: Record<CityTier, string> = { 1: "Tier 1 (metros)", 2: "Tier 2", 3: "Tier 3 & smaller" };

/** Romanised and Devanagari spellings a brief might use for a district. */
function districtAliases(district: string): string[] {
  const lower = district.toLowerCase();
  const extra: Record<string, string[]> = {
    "Chhatrapati Sambhajinagar": ["aurangabad", "sambhajinagar", "छत्रपती संभाजीनगर", "औरंगाबाद"],
    Mumbai: ["bombay", "मुंबई"],
    "Mumbai Suburban": ["mumbai suburban", "western suburbs"],
    Pune: ["poona", "पुणे"],
    Nashik: ["nasik", "नाशिक"],
    Nagpur: ["नागपूर"],
    Kolhapur: ["कोल्हापूर"],
    Ahilyanagar: ["ahmednagar", "ahilyanagar", "अहिल्यानगर"],
    Dharashiv: ["osmanabad", "धाराशिव"],
    Thane: ["ठाणे"],
  };
  return [lower, ...(extra[district] ?? [])];
}

export const CITY_TIER_ALIASES: Record<CityTier, string[]> = {
  1: ["tier 1", "tier-1", "tier i", "tier one", "metro", "metros", "metro cities", "metropolitan"],
  2: ["tier 2", "tier-2", "tier ii", "tier two"],
  3: ["tier 3", "tier-3", "tier iii", "tier three", "small towns", "small-town", "smaller towns", "rural"],
};

/**
 * Maharashtra's districts, standing where a list of Indian states used to. In a Maharashtra-only
 * catalogue "which state?" has one answer, and the question a buyer actually asks is which part of
 * the state: a Kolhapur brief and a Nagpur brief want different creators. The `region` field is the
 * division, so naming a district in a brief targets its division.
 */
export const STATES: State[] = DISTRICTS.map((district) => ({
  name: district,
  region: DISTRICT_REGION[district] as Region,
  lang: "mr" as LanguageCode,
  aliases: districtAliases(district),
  abbr: [],
}));

function city(
  id: string,
  name: string,
  state: string,
  tier: CityTier,
  region: Region,
  lang: LanguageCode,
  aliases: string[] = [],
): City {
  return { id, name, state, tier, region, lang, aliases };
}

export const CITIES: City[] = [
  city("mumbai", "Mumbai", "Maharashtra", 1, "mumbai_metro", "mr", ["bombay", "navi mumbai", "thane"]),
  city("pune", "Pune", "Maharashtra", 1, "western", "mr", ["poona", "pimpri", "chinchwad"]),
  city("nagpur", "Nagpur", "Maharashtra", 2, "vidarbha", "mr"),
  city("nashik", "Nashik", "Maharashtra", 2, "north", "mr", ["nasik"]),
  city("sambhajinagar", "Chhatrapati Sambhajinagar", "Maharashtra", 2, "marathwada", "mr", ["aurangabad", "sambhajinagar"]),
  city("kolhapur", "Kolhapur", "Maharashtra", 3, "western", "mr"),
  city("nanded", "Nanded", "Maharashtra", 3, "marathwada", "mr"),
  city("ratnagiri", "Ratnagiri", "Maharashtra", 3, "konkan", "mr", ["chiplun", "sindhudurg"]),
];

export const CITY_BY_ID: Record<string, City> = Object.fromEntries(CITIES.map((c) => [c.id, c]));

export function getCity(id: string): City | undefined {
  return CITY_BY_ID[id];
}

// ---------------------------------------------------------------------------------------------
// Creator size tiers. Benchmarks and rate bands are illustrative planning heuristics for the demo,
// not market data.
// ---------------------------------------------------------------------------------------------

export const CREATOR_TIER_LIST: CreatorTier[] = ["nano", "micro", "mid", "macro", "mega"];

export const CREATOR_TIERS: Record<
  CreatorTier,
  {
    label: string;
    /** Inclusive lower bound of followers on the primary platform. */
    minFollowers: number;
    /** Exclusive upper bound. */
    maxFollowers: number;
    /** Typical engagement rate (%) for the tier, used as the benchmark when scoring engagement. */
    engagementBenchmark: number;
    /** Typical INR fee range for one reel. */
    reelRate: [number, number];
    aliases: string[];
  }
> = {
  nano: {
    // Extended down from 1K when ingestion started collecting smaller regional creators: a brand
    // targeting one Maharashtra district often wants exactly these, and labelling a 600-subscriber
    // creator "1K-10K" would be wrong.
    label: "Nano (500-10K)",
    minFollowers: 500,
    maxFollowers: 10_000,
    engagementBenchmark: 5,
    reelRate: [2_000, 12_000],
    aliases: ["nano", "nano influencers", "nano-influencers", "nano creators"],
  },
  micro: {
    label: "Micro (10K-100K)",
    minFollowers: 10_000,
    maxFollowers: 100_000,
    engagementBenchmark: 3.2,
    reelRate: [10_000, 60_000],
    aliases: ["micro", "micro influencers", "micro-influencers", "micro creators"],
  },
  mid: {
    label: "Mid-tier (100K-500K)",
    minFollowers: 100_000,
    maxFollowers: 500_000,
    engagementBenchmark: 2.2,
    reelRate: [60_000, 250_000],
    aliases: ["mid-tier", "mid tier", "mid-size", "mid size"],
  },
  macro: {
    label: "Macro (500K-1M)",
    minFollowers: 500_000,
    maxFollowers: 1_000_000,
    engagementBenchmark: 1.6,
    reelRate: [250_000, 600_000],
    aliases: ["macro", "macro influencers", "macro-influencers"],
  },
  mega: {
    label: "Mega (1M+)",
    minFollowers: 1_000_000,
    maxFollowers: 10_000_000,
    engagementBenchmark: 1.2,
    reelRate: [600_000, 2_500_000],
    aliases: ["mega", "mega influencers", "celebrity", "celebrities"],
  },
};

export function tierForFollowers(followers: number): CreatorTier {
  for (const tier of CREATOR_TIER_LIST) {
    if (followers < CREATOR_TIERS[tier].maxFollowers) return tier;
  }
  return "mega";
}
