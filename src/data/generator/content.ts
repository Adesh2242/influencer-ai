// Text building blocks for demo creators: bios, handle words and which niches go together.
import { LANGUAGES, NICHE_KEYWORDS } from "../taxonomy";
import type { LanguageCode, Niche } from "../../types";
import type { Rng } from "./random";

/** Niches a creator often covers alongside their primary one. */
export const RELATED_NICHES: Record<Niche, Niche[]> = {
  beauty: ["fashion", "lifestyle", "health"],
  fashion: ["beauty", "lifestyle", "travel"],
  food: ["travel", "lifestyle", "health"],
  travel: ["food", "lifestyle", "fitness"],
  tech: ["gaming", "education", "finance", "automotive"],
  finance: ["education", "tech", "lifestyle"],
  fitness: ["health", "sports", "lifestyle"],
  health: ["fitness", "food", "parenting"],
  gaming: ["tech", "comedy", "entertainment"],
  education: ["tech", "finance", "lifestyle"],
  parenting: ["lifestyle", "health", "food"],
  comedy: ["entertainment", "lifestyle", "gaming"],
  lifestyle: ["fashion", "food", "travel", "beauty"],
  automotive: ["tech", "travel", "lifestyle"],
  devotional: ["entertainment", "food", "travel"],
  agriculture: ["food", "education", "finance"],
  entertainment: ["comedy", "fashion", "lifestyle"],
  sports: ["fitness", "entertainment", "gaming"],
};

const NICHE_NOUN: Record<Niche, string> = {
  beauty: "beauty",
  fashion: "fashion",
  food: "food",
  travel: "travel",
  tech: "tech",
  finance: "personal-finance",
  fitness: "fitness",
  health: "wellness",
  gaming: "gaming",
  education: "education",
  parenting: "parenting",
  comedy: "comedy",
  lifestyle: "lifestyle",
  automotive: "auto",
  devotional: "devotional",
  agriculture: "farming",
  entertainment: "entertainment",
  sports: "sports",
};

const NICHE_ACTIVITIES: Record<Niche, string[]> = {
  beauty: [
    "sharing honest skincare routines for humid weather",
    "testing affordable makeup on Indian skin tones",
    "breaking down ingredient lists so you don't overspend",
    "comparing ayurvedic and modern skincare side by side",
  ],
  fashion: [
    "styling budget ethnic wear for weddings and office",
    "turning one saree into five different looks",
    "hunting streetwear deals and local labels",
    "showing how to wear handloom every day",
  ],
  food: [
    "sharing 5-minute home recipes and street-food finds",
    "cooking regional thalis the way grandma made them",
    "reviewing local eateries one plate at a time",
    "making healthy tiffin ideas for busy weekdays",
  ],
  travel: [
    "planning budget weekend trips from the city",
    "exploring offbeat homestays and treks",
    "documenting temple towns and food trails",
    "building itineraries for first-time solo travellers",
  ],
  tech: [
    "comparing budget smartphones and earbuds",
    "explaining apps and AI tools in simple language",
    "reviewing laptops for students and creators",
    "fixing everyday phone problems in under a minute",
  ],
  finance: [
    "explaining SIPs, taxes and UPI tips in plain words",
    "helping first-jobbers budget their salary",
    "breaking down credit cards and loans without jargon",
    "sharing money lessons for small-town families",
  ],
  fitness: [
    "sharing home workouts that need no equipment",
    "coaching beginners through their first 5K",
    "posting desi meal plans for fat loss",
    "teaching yoga flows for people with desk jobs",
  ],
  health: [
    "talking everyday wellness and nutrition",
    "busting diet myths with simple science",
    "sharing ayurvedic routines that fit city life",
    "starting honest conversations about sleep and mental health",
  ],
  gaming: [
    "streaming BGMI and Free Fire with the squad",
    "posting mobile gaming tips and funny clips",
    "reviewing budget gaming phones and setups",
    "running community tournaments every weekend",
  ],
  education: [
    "simplifying JEE and NEET preparation",
    "sharing spoken English tips for interviews",
    "making exam current affairs quick and clear",
    "teaching coding basics to first-year students",
    "helping students choose careers after Class 12",
  ],
  parenting: [
    "sharing honest parenting wins and fails",
    "posting toddler activities and meal ideas",
    "talking pregnancy, newborn care and sleepless nights",
    "reviewing baby products that are worth the money",
  ],
  comedy: [
    "making relatable sketches about family and office life",
    "writing desi skits about hostel days",
    "roasting everyday city struggles",
    "turning auto-rickshaw chats into comedy",
  ],
  lifestyle: [
    "vlogging everyday life, home decor and self-care",
    "sharing small-space home makeovers",
    "documenting a slow-living routine",
    "showing what a month in the city really costs",
  ],
  automotive: [
    "reviewing bikes, scooters and EVs for daily commutes",
    "test-riding electric scooters around the city",
    "explaining car maintenance in simple terms",
    "comparing budget cars for first-time buyers",
  ],
  devotional: [
    "sharing bhajans, festival rituals and temple stories",
    "explaining festivals and traditions for young families",
    "documenting temple architecture and local legends",
    "posting daily prayers and mythology stories",
  ],
  agriculture: [
    "helping farmers with crop tips, mandi rates and new tools",
    "showing organic farming experiments from the family farm",
    "reviewing tractors and farm equipment",
    "explaining government schemes for farmers",
  ],
  entertainment: [
    "posting dance covers of the latest film songs",
    "reviewing new films and OTT releases",
    "singing covers of classic and indie songs",
    "recreating iconic film scenes with friends",
  ],
  sports: [
    "breaking down cricket matches and fantasy picks",
    "covering local kabaddi and football leagues",
    "sharing training drills for young athletes",
    "talking badminton and chess for beginners",
  ],
};

/** Words for handles such as "priya.cooks" or "cookwithpriya". ASCII only. */
export const HANDLE_SUFFIXES: Record<Niche, string[]> = {
  beauty: ["glow", "beauty", "glam", "skin", "makeup"],
  fashion: ["style", "styles", "wears", "closet", "fashion"],
  food: ["eats", "cooks", "kitchen", "foodie", "rasoi", "tadka"],
  travel: ["travels", "wanders", "trails", "ghumakkad", "yatra"],
  tech: ["tech", "techtalks", "gadgets", "unboxed", "bytes"],
  finance: ["money", "paisa", "finance", "invests", "wealth"],
  fitness: ["fit", "fitness", "lifts", "moves", "yoga"],
  health: ["wellness", "health", "ayur", "nutrition", "wellbeing"],
  gaming: ["gaming", "plays", "gamer", "live", "op"],
  education: ["learns", "classes", "teaches", "edu", "padhai"],
  parenting: ["parenting", "kids", "family", "littleones"],
  comedy: ["comedy", "funny", "jokes", "laughs", "memes"],
  lifestyle: ["life", "vlogs", "daily", "lifestyle", "diaries"],
  automotive: ["drives", "rides", "garage", "auto", "evs"],
  devotional: ["bhakti", "dharma", "sanskriti", "devotion", "kirtan"],
  agriculture: ["kheti", "farms", "kisan", "farming", "agri"],
  entertainment: ["dance", "music", "beats", "films", "reviews"],
  sports: ["sports", "cricket", "athlete", "kabaddi", "plays"],
};

export const HANDLE_PREFIXES: Record<Niche, string[]> = {
  beauty: ["glowwith", "glamwith"],
  fashion: ["stylewith", "dressedby"],
  food: ["cookwith", "eatwith"],
  travel: ["travelwith", "ghumowith"],
  tech: ["techwith", "gadgetswith"],
  finance: ["moneywith", "paisawith"],
  fitness: ["fitwith", "sweatwith"],
  health: ["wellwith", "healwith"],
  gaming: ["playwith", "gamewith"],
  education: ["learnwith", "padhowith"],
  parenting: ["parentingwith", "kidswith"],
  comedy: ["laughwith", "hasowith"],
  lifestyle: ["lifewith", "dailywith"],
  automotive: ["ridewith", "drivewith"],
  devotional: ["bhaktiwith", "prayerswith"],
  agriculture: ["khetiwith", "farmwith"],
  entertainment: ["dancewith", "singwith"],
  sports: ["playwith", "trainwith"],
};

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** "Hinglish", "Tamil" or "" for English-first creators. */
function languageAdjective(languages: LanguageCode[]): string {
  const [primary] = languages;
  if (primary === "en") return "";
  if (primary === "hi" && languages.includes("en")) return "Hinglish";
  return LANGUAGES[primary].label;
}

/** One or two sentences, e.g. "Chennai-based Tamil food creator sharing 5-minute home recipes and street-food finds." */
export function buildBio(rng: Rng, options: { cityName: string; languages: LanguageCode[]; niches: Niche[] }): string {
  const { cityName, languages, niches } = options;
  const [primary, ...others] = niches;
  const adjective = languageAdjective(languages);
  const lead = [`${cityName}-based`, adjective, NICHE_NOUN[primary], "creator", rng.pick(NICHE_ACTIVITIES[primary])]
    .filter(Boolean)
    .join(" ");

  // Informative second sentences (other niches, languages) are preferred over generic ones.
  const extras: { text: string; weight: number }[] = [
    { text: "New videos every week.", weight: 1 },
    { text: "Open to brand collaborations that suit the audience.", weight: 1 },
  ];
  if (others.length > 0) extras.push({ text: `Also covers ${joinList(others.map((n) => NICHE_NOUN[n]))}.`, weight: 3 });
  if (languages.length > 1) extras.push({ text: `Posts in ${joinList(languages.map((code) => LANGUAGES[code].label))}.`, weight: 3 });

  if (!rng.chance(0.75)) return `${lead}.`;
  return `${lead}. ${rng.weighted(extras, (extra) => extra.weight).text}`;
}

/** Keywords tied to one film industry or regional festival only suit creators in those languages. */
const LANGUAGE_BOUND_TOPICS: Record<string, LanguageCode[]> = {
  bollywood: ["hi", "en", "mr", "gu", "pa"],
  tollywood: ["te"],
  kollywood: ["ta"],
  mollywood: ["ml"],
  onam: ["ml"],
  pongal: ["ta", "te", "kn"],
  "durga puja": ["bn", "or", "as", "hi", "en"],
  navratri: ["hi", "gu", "mr", "en"],
};

function suitsLanguages(keyword: string, languages: LanguageCode[]): boolean {
  const allowed = LANGUAGE_BOUND_TOPICS[keyword];
  return !allowed || languages.some((code) => allowed.includes(code));
}

/** 4-8 content keywords: mostly from the primary niche, a few from the others. */
export function pickTopics(rng: Rng, niches: Niche[], languages: LanguageCode[]): string[] {
  const topics = new Set<string>();
  const [primary, ...others] = niches;
  const keywordsFor = (niche: Niche) => NICHE_KEYWORDS[niche].filter((keyword) => suitsLanguages(keyword, languages));
  const primaryKeywords = keywordsFor(primary);
  for (const keyword of rng.sample(primaryKeywords, rng.int(3, 5))) topics.add(keyword);
  for (const niche of others) {
    for (const keyword of rng.sample(keywordsFor(niche), rng.int(1, 2))) topics.add(keyword);
  }
  for (const keyword of primaryKeywords) {
    if (topics.size >= 4) break;
    topics.add(keyword);
  }
  return [...topics].slice(0, 8);
}
