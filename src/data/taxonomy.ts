// Shared vocabulary for the Indian market: niches, languages, platforms, regions, cities and tiers.
// Used by the UI, the demo-data generator, the matching engine and the brief parsers (including the
// Netlify function), so it must only use relative imports and no browser APIs.
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

export const LANGUAGE_CODES: LanguageCode[] = ["hi", "en", "ta", "te", "mr", "bn", "kn", "ml", "gu", "pa", "or", "as"];

export const LANGUAGES: Record<LanguageCode, { label: string; native: string; aliases: string[] }> = {
  hi: { label: "Hindi", native: "हिन्दी", aliases: ["hindi", "हिंदी", "हिन्दी", "hinglish"] },
  en: { label: "English", native: "English", aliases: ["english", "hinglish"] },
  ta: { label: "Tamil", native: "தமிழ்", aliases: ["tamil", "தமிழ்"] },
  te: { label: "Telugu", native: "తెలుగు", aliases: ["telugu", "తెలుగు"] },
  mr: { label: "Marathi", native: "मराठी", aliases: ["marathi", "मराठी"] },
  bn: { label: "Bengali", native: "বাংলা", aliases: ["bengali", "bangla", "বাংলা"] },
  kn: { label: "Kannada", native: "ಕನ್ನಡ", aliases: ["kannada", "ಕನ್ನಡ"] },
  ml: { label: "Malayalam", native: "മലയാളം", aliases: ["malayalam", "മലയാളം"] },
  gu: { label: "Gujarati", native: "ગુજરાતી", aliases: ["gujarati", "ગુજરાતી"] },
  pa: { label: "Punjabi", native: "ਪੰਜਾਬੀ", aliases: ["punjabi", "ਪੰਜਾਬੀ"] },
  or: { label: "Odia", native: "ଓଡ଼ିଆ", aliases: ["odia", "oriya", "ଓଡ଼ିଆ"] },
  as: { label: "Assamese", native: "অসমীয়া", aliases: ["assamese", "asomiya", "অসমীয়া"] },
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

export const REGION_LIST: Region[] = ["north", "south", "east", "west", "central", "northeast"];

export const REGIONS: Record<Region, { label: string; aliases: string[] }> = {
  north: { label: "North", aliases: ["north india", "northern india", "north indian"] },
  south: { label: "South", aliases: ["south india", "southern india", "south indian"] },
  east: { label: "East", aliases: ["east india", "eastern india"] },
  west: { label: "West", aliases: ["west india", "western india"] },
  central: { label: "Central", aliases: ["central india"] },
  northeast: { label: "Northeast", aliases: ["northeast", "north east", "north-east", "seven sisters"] },
};

/** Phrases that mean the Hindi-speaking north and central states. */
export const HINDI_BELT_ALIASES = ["hindi belt", "hindi heartland", "hindi-speaking states", "hindi speaking states"];

/** Phrases that mean "no geographic preference". */
export const PAN_INDIA_ALIASES = ["pan india", "pan-india", "all india", "all-india", "nationwide", "across india", "pan indian"];

export const CITY_TIER_LIST: CityTier[] = [1, 2, 3];

export const CITY_TIER_LABELS: Record<CityTier, string> = { 1: "Tier 1 (metros)", 2: "Tier 2", 3: "Tier 3 & smaller" };

export const CITY_TIER_ALIASES: Record<CityTier, string[]> = {
  1: ["tier 1", "tier-1", "tier i", "tier one", "metro", "metros", "metro cities", "metropolitan"],
  2: ["tier 2", "tier-2", "tier ii", "tier two"],
  3: ["tier 3", "tier-3", "tier iii", "tier three", "small towns", "small-town", "smaller towns", "rural"],
};

export const STATES: State[] = [
  { name: "Maharashtra", region: "west", lang: "mr", aliases: ["maharashtra"], abbr: ["MH"] },
  { name: "Gujarat", region: "west", lang: "gu", aliases: ["gujarat"], abbr: ["GJ"] },
  { name: "Goa", region: "west", lang: "en", aliases: ["goa"], abbr: [] },
  { name: "Rajasthan", region: "north", lang: "hi", aliases: ["rajasthan"], abbr: ["RJ"] },
  { name: "Punjab", region: "north", lang: "pa", aliases: ["punjab"], abbr: [] },
  { name: "Haryana", region: "north", lang: "hi", aliases: ["haryana"], abbr: [] },
  { name: "Delhi", region: "north", lang: "hi", aliases: ["delhi ncr", "ncr"], abbr: ["NCR"] },
  { name: "Uttar Pradesh", region: "north", lang: "hi", aliases: ["uttar pradesh"], abbr: ["UP"] },
  { name: "Uttarakhand", region: "north", lang: "hi", aliases: ["uttarakhand", "uttaranchal"], abbr: ["UK"] },
  { name: "Himachal Pradesh", region: "north", lang: "hi", aliases: ["himachal pradesh", "himachal"], abbr: ["HP"] },
  { name: "Jammu & Kashmir", region: "north", lang: "hi", aliases: ["jammu and kashmir", "jammu & kashmir", "kashmir"], abbr: ["J&K", "JK"] },
  { name: "Chandigarh", region: "north", lang: "pa", aliases: [], abbr: [] },
  { name: "Madhya Pradesh", region: "central", lang: "hi", aliases: ["madhya pradesh"], abbr: ["MP"] },
  { name: "Chhattisgarh", region: "central", lang: "hi", aliases: ["chhattisgarh", "chattisgarh"], abbr: ["CG"] },
  { name: "Bihar", region: "east", lang: "hi", aliases: ["bihar"], abbr: [] },
  { name: "Jharkhand", region: "east", lang: "hi", aliases: ["jharkhand"], abbr: [] },
  { name: "West Bengal", region: "east", lang: "bn", aliases: ["west bengal", "bengal"], abbr: ["WB"] },
  { name: "Odisha", region: "east", lang: "or", aliases: ["odisha", "orissa"], abbr: [] },
  { name: "Assam", region: "northeast", lang: "as", aliases: ["assam"], abbr: [] },
  { name: "Meghalaya", region: "northeast", lang: "en", aliases: ["meghalaya"], abbr: [] },
  { name: "Manipur", region: "northeast", lang: "en", aliases: ["manipur"], abbr: [] },
  { name: "Tamil Nadu", region: "south", lang: "ta", aliases: ["tamil nadu", "tamilnadu"], abbr: ["TN"] },
  { name: "Puducherry", region: "south", lang: "ta", aliases: ["puducherry", "pondicherry"], abbr: [] },
  { name: "Kerala", region: "south", lang: "ml", aliases: ["kerala"], abbr: ["KL"] },
  { name: "Karnataka", region: "south", lang: "kn", aliases: ["karnataka"], abbr: ["KA"] },
  { name: "Andhra Pradesh", region: "south", lang: "te", aliases: ["andhra pradesh", "andhra"], abbr: ["AP"] },
  { name: "Telangana", region: "south", lang: "te", aliases: ["telangana"], abbr: ["TS"] },
];

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
  // Tier 1
  city("mumbai", "Mumbai", "Maharashtra", 1, "west", "mr", ["bombay"]),
  city("delhi", "Delhi", "Delhi", 1, "north", "hi", ["new delhi", "dilli"]),
  city("bengaluru", "Bengaluru", "Karnataka", 1, "south", "kn", ["bangalore", "blr"]),
  city("hyderabad", "Hyderabad", "Telangana", 1, "south", "te", ["hyd"]),
  city("chennai", "Chennai", "Tamil Nadu", 1, "south", "ta", ["madras"]),
  city("kolkata", "Kolkata", "West Bengal", 1, "east", "bn", ["calcutta"]),
  city("pune", "Pune", "Maharashtra", 1, "west", "mr", ["poona"]),
  city("ahmedabad", "Ahmedabad", "Gujarat", 1, "west", "gu", ["amdavad"]),
  // Tier 2
  city("jaipur", "Jaipur", "Rajasthan", 2, "north", "hi"),
  city("lucknow", "Lucknow", "Uttar Pradesh", 2, "north", "hi"),
  city("kanpur", "Kanpur", "Uttar Pradesh", 2, "north", "hi"),
  city("nagpur", "Nagpur", "Maharashtra", 2, "west", "mr"),
  city("indore", "Indore", "Madhya Pradesh", 2, "central", "hi"),
  city("bhopal", "Bhopal", "Madhya Pradesh", 2, "central", "hi"),
  city("jabalpur", "Jabalpur", "Madhya Pradesh", 2, "central", "hi"),
  city("patna", "Patna", "Bihar", 2, "east", "hi"),
  city("vadodara", "Vadodara", "Gujarat", 2, "west", "gu", ["baroda"]),
  city("surat", "Surat", "Gujarat", 2, "west", "gu"),
  city("rajkot", "Rajkot", "Gujarat", 2, "west", "gu"),
  city("coimbatore", "Coimbatore", "Tamil Nadu", 2, "south", "ta", ["kovai"]),
  city("madurai", "Madurai", "Tamil Nadu", 2, "south", "ta"),
  city("kochi", "Kochi", "Kerala", 2, "south", "ml", ["cochin", "ernakulam"]),
  city("thiruvananthapuram", "Thiruvananthapuram", "Kerala", 2, "south", "ml", ["trivandrum"]),
  city("kozhikode", "Kozhikode", "Kerala", 2, "south", "ml", ["calicut"]),
  city("visakhapatnam", "Visakhapatnam", "Andhra Pradesh", 2, "south", "te", ["vizag"]),
  city("vijayawada", "Vijayawada", "Andhra Pradesh", 2, "south", "te"),
  city("mysuru", "Mysuru", "Karnataka", 2, "south", "kn", ["mysore"]),
  city("mangaluru", "Mangaluru", "Karnataka", 2, "south", "kn", ["mangalore"]),
  city("chandigarh", "Chandigarh", "Chandigarh", 2, "north", "pa"),
  city("ludhiana", "Ludhiana", "Punjab", 2, "north", "pa"),
  city("amritsar", "Amritsar", "Punjab", 2, "north", "pa"),
  city("nashik", "Nashik", "Maharashtra", 2, "west", "mr", ["nasik"]),
  city("sambhajinagar", "Chhatrapati Sambhajinagar", "Maharashtra", 2, "west", "mr", ["aurangabad", "sambhajinagar"]),
  city("bhubaneswar", "Bhubaneswar", "Odisha", 2, "east", "or"),
  city("guwahati", "Guwahati", "Assam", 2, "northeast", "as"),
  city("dehradun", "Dehradun", "Uttarakhand", 2, "north", "hi"),
  city("ranchi", "Ranchi", "Jharkhand", 2, "east", "hi"),
  city("raipur", "Raipur", "Chhattisgarh", 2, "central", "hi"),
  city("varanasi", "Varanasi", "Uttar Pradesh", 2, "north", "hi", ["banaras", "benares", "kashi"]),
  city("agra", "Agra", "Uttar Pradesh", 2, "north", "hi"),
  city("prayagraj", "Prayagraj", "Uttar Pradesh", 2, "north", "hi", ["allahabad"]),
  city("meerut", "Meerut", "Uttar Pradesh", 2, "north", "hi"),
  city("noida", "Noida", "Uttar Pradesh", 2, "north", "hi"),
  city("gurugram", "Gurugram", "Haryana", 2, "north", "hi", ["gurgaon"]),
  city("jodhpur", "Jodhpur", "Rajasthan", 2, "north", "hi"),
  // Tier 3 and smaller
  city("udaipur", "Udaipur", "Rajasthan", 3, "north", "hi"),
  city("bikaner", "Bikaner", "Rajasthan", 3, "north", "hi"),
  city("bareilly", "Bareilly", "Uttar Pradesh", 3, "north", "hi"),
  city("gorakhpur", "Gorakhpur", "Uttar Pradesh", 3, "north", "hi"),
  city("jalandhar", "Jalandhar", "Punjab", 3, "north", "pa"),
  city("hisar", "Hisar", "Haryana", 3, "north", "hi"),
  city("karnal", "Karnal", "Haryana", 3, "north", "hi"),
  city("jammu", "Jammu", "Jammu & Kashmir", 3, "north", "hi"),
  city("bilaspur", "Bilaspur", "Chhattisgarh", 3, "central", "hi"),
  city("gaya", "Gaya", "Bihar", 3, "east", "hi"),
  city("muzaffarpur", "Muzaffarpur", "Bihar", 3, "east", "hi"),
  city("cuttack", "Cuttack", "Odisha", 3, "east", "or"),
  city("siliguri", "Siliguri", "West Bengal", 3, "east", "bn"),
  city("durgapur", "Durgapur", "West Bengal", 3, "east", "bn"),
  city("dibrugarh", "Dibrugarh", "Assam", 3, "northeast", "as"),
  city("shillong", "Shillong", "Meghalaya", 3, "northeast", "en"),
  city("imphal", "Imphal", "Manipur", 3, "northeast", "en"),
  city("kolhapur", "Kolhapur", "Maharashtra", 3, "west", "mr"),
  city("nanded", "Nanded", "Maharashtra", 3, "west", "mr"),
  city("bhavnagar", "Bhavnagar", "Gujarat", 3, "west", "gu"),
  city("anand", "Anand", "Gujarat", 3, "west", "gu"),
  city("panaji", "Panaji", "Goa", 3, "west", "en", ["panjim"]),
  city("hubballi", "Hubballi", "Karnataka", 3, "south", "kn", ["hubli", "hubli-dharwad"]),
  city("belagavi", "Belagavi", "Karnataka", 3, "south", "kn", ["belgaum"]),
  city("tiruchirappalli", "Tiruchirappalli", "Tamil Nadu", 3, "south", "ta", ["trichy", "tiruchi"]),
  city("salem", "Salem", "Tamil Nadu", 3, "south", "ta"),
  city("tirunelveli", "Tirunelveli", "Tamil Nadu", 3, "south", "ta"),
  city("puducherry", "Puducherry", "Puducherry", 3, "south", "ta", ["pondicherry", "pondy"]),
  city("thrissur", "Thrissur", "Kerala", 3, "south", "ml", ["trichur"]),
  city("warangal", "Warangal", "Telangana", 3, "south", "te"),
  city("guntur", "Guntur", "Andhra Pradesh", 3, "south", "te"),
  city("kurnool", "Kurnool", "Andhra Pradesh", 3, "south", "te"),
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
    label: "Nano (1K-10K)",
    minFollowers: 1_000,
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
