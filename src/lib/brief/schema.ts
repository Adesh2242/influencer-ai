// Contract between the parse-brief Netlify function, Claude's structured output and the browser
// client. Relative imports only: the function bundle imports this file.
import { z } from "zod";
import type { CampaignBrief, CityTier, ParsedBrief } from "../../types";
import {
  AGE_BANDS,
  CITIES,
  CITY_TIER_LIST,
  CREATOR_TIER_LIST,
  DELIVERABLE_LIST,
  GOAL_LIST,
  LANGUAGE_CODES,
  NICHES,
  PLATFORM_LIST,
  REGION_LIST,
} from "../../data/taxonomy";

const MAX_NOTES = 8;
const MAX_NOTE_LENGTH = 240;
const MAX_TEXT = 2000;

// ---------------------------------------------------------------------------------------------
// JSON schema for Claude's structured output. Only keywords the structured-output grammar accepts:
// every object closes additionalProperties and lists every property as required, and unknown values
// are "" / 0 / [] rather than null.
// ---------------------------------------------------------------------------------------------

const stringList = (description: string) => ({ type: "array", items: { type: "string" }, description });
const enumList = (values: readonly (string | number)[], description: string, itemType = "string") => ({
  type: "array",
  items: { type: itemType, enum: [...values] },
  description,
});

export const BRIEF_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    brandName: { type: "string", description: 'The advertiser\'s brand name, or "" if not stated.' },
    productCategory: {
      type: "string",
      description: 'Short product or category phrase, e.g. "vitamin C serum" or "UPI payments app"; "" if unclear.',
    },
    goal: {
      type: "string",
      enum: ["", ...GOAL_LIST],
      description: 'Primary campaign objective; "" if not stated or implied.',
    },
    niches: enumList(NICHES, "Creator content niches that fit the product, most relevant first (max 3)."),
    languages: enumList(LANGUAGE_CODES, "ISO 639-1 codes of the content languages requested."),
    platforms: enumList(PLATFORM_LIST, "Social platforms requested."),
    deliverable: {
      type: "string",
      enum: ["", ...DELIVERABLE_LIST],
      description: 'reel = short vertical video, story, post = static or carousel, video = long-form YouTube integration; "" if not stated.',
    },
    targetGender: { type: "string", enum: ["any", "female", "male"], description: 'Audience gender; "any" if not stated.' },
    targetAges: enumList(AGE_BANDS, "Audience age bands overlapping the requested ages."),
    targetTiers: enumList(CITY_TIER_LIST, "City tiers: 1 = metros, 2 = large non-metro cities, 3 = small towns.", "integer"),
    targetRegions: enumList(REGION_LIST, "Indian regions targeted (states map to their region)."),
    targetCities: stringList("Indian city names explicitly targeted, as written in the brief."),
    creatorTiers: enumList(CREATOR_TIER_LIST, "Creator sizes requested: nano 1K-10K, micro 10K-100K, mid 100K-500K, macro 500K-1M, mega 1M+."),
    budgetINR: { type: "integer", minimum: 0, description: "Total campaign budget in rupees; 0 if not stated." },
    creatorsWanted: { type: "integer", minimum: 0, maximum: 200, description: "Number of creators wanted; 0 if not stated." },
    minAuthenticity: {
      type: "integer",
      minimum: 0,
      maximum: 100,
      description: "Minimum authenticity score 0-100; 80 if the brief asks for genuine or no fake followers, else 0.",
    },
    minEngagementRate: {
      type: "number",
      minimum: 0,
      maximum: 100,
      description: "Minimum engagement rate in percent if stated, else 0.",
    },
    excludeBrands: stringList("Competitor brands whose recent collaborators should be excluded."),
    notes: stringList("Short notes on assumptions or interpretations, in plain English."),
  },
  required: [
    "brandName",
    "productCategory",
    "goal",
    "niches",
    "languages",
    "platforms",
    "deliverable",
    "targetGender",
    "targetAges",
    "targetTiers",
    "targetRegions",
    "targetCities",
    "creatorTiers",
    "budgetINR",
    "creatorsWanted",
    "minAuthenticity",
    "minEngagementRate",
    "excludeBrands",
    "notes",
  ],
} as const;

// ---------------------------------------------------------------------------------------------
// Validation of the model output
// ---------------------------------------------------------------------------------------------

const tierSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const aiBriefOutputSchema = z.object({
  brandName: z.string().max(200),
  productCategory: z.string().max(200),
  goal: z.enum(["", ...GOAL_LIST]),
  niches: z.array(z.enum(NICHES)),
  languages: z.array(z.enum(LANGUAGE_CODES)),
  platforms: z.array(z.enum(PLATFORM_LIST)),
  deliverable: z.enum(["", ...DELIVERABLE_LIST]),
  targetGender: z.enum(["any", "female", "male"]),
  targetAges: z.array(z.enum(AGE_BANDS)),
  targetTiers: z.array(tierSchema),
  targetRegions: z.array(z.enum(REGION_LIST)),
  targetCities: z.array(z.string().max(100)),
  creatorTiers: z.array(z.enum(CREATOR_TIER_LIST)),
  budgetINR: z.number().int().min(0),
  creatorsWanted: z.number().int().min(0).max(200),
  minAuthenticity: z.number().int().min(0).max(100),
  minEngagementRate: z.number().min(0).max(100),
  excludeBrands: z.array(z.string().max(100)),
  notes: z.array(z.string()),
});

export type AiBriefOutput = z.infer<typeof aiBriefOutputSchema>;

/** Validates a ParsedBrief received over the network before it is merged into the user's brief. */
export const parsedBriefSchema = z.object({
  brief: z
    .object({
      brandName: z.string(),
      productCategory: z.string(),
      description: z.string(),
      goal: z.enum(GOAL_LIST),
      niches: z.array(z.enum(NICHES)),
      languages: z.array(z.enum(LANGUAGE_CODES)),
      platforms: z.array(z.enum(PLATFORM_LIST)),
      deliverable: z.enum(DELIVERABLE_LIST),
      targetGender: z.enum(["any", "female", "male"]),
      targetAges: z.array(z.enum(AGE_BANDS)),
      targetTiers: z.array(tierSchema),
      targetRegions: z.array(z.enum(REGION_LIST)),
      targetCityIds: z.array(z.string()),
      creatorTiers: z.array(z.enum(CREATOR_TIER_LIST)),
      budgetINR: z.number().min(0),
      creatorsWanted: z.number().int().min(1).max(200),
      minAuthenticity: z.number().min(0).max(100),
      minEngagementRate: z.number().min(0).max(100),
      excludeBrands: z.array(z.string()),
    })
    .partial(),
  source: z.enum(["ai", "rules"]),
  notes: z.array(z.string()),
  detectedFields: z.array(z.string()),
});

// ---------------------------------------------------------------------------------------------
// Mapping to the app's ParsedBrief
// ---------------------------------------------------------------------------------------------

const CITY_LOOKUP: Map<string, string> = new Map(
  CITIES.flatMap((city) => [city.name, city.id, ...city.aliases].map((term) => [normaliseCityName(term), city.id] as const)),
);

function normaliseCityName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(?:city|district|metro)\b/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Returns the city id for a free-text name ("Bangalore", "new delhi"), or undefined. */
export function cityIdForName(name: string): string | undefined {
  return CITY_LOOKUP.get(normaliseCityName(name));
}

function cleanText(value: string, max: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function uniq<T>(values: T[]): T[] {
  return [...new Set(values)];
}

/**
 * Maps validated model output to a ParsedBrief: city names become ids (unknown names are reported
 * in notes), empty or zero values are left out so they never overwrite the user's own choices.
 */
export function aiOutputToParsedBrief(output: AiBriefOutput, sourceText?: string): ParsedBrief {
  const brief: Partial<CampaignBrief> = {};
  const notes: string[] = [];

  const brandName = cleanText(output.brandName, 80);
  if (brandName) brief.brandName = brandName;
  const productCategory = cleanText(output.productCategory, 80);
  if (productCategory) brief.productCategory = productCategory;
  if (sourceText?.trim()) brief.description = sourceText.trim().slice(0, MAX_TEXT);
  if (output.goal) brief.goal = output.goal;
  if (output.niches.length) brief.niches = uniq(output.niches).slice(0, 3);
  if (output.languages.length) brief.languages = uniq(output.languages);
  if (output.platforms.length) brief.platforms = uniq(output.platforms);
  if (output.deliverable) brief.deliverable = output.deliverable;
  if (output.targetGender !== "any") brief.targetGender = output.targetGender;
  if (output.targetAges.length) brief.targetAges = AGE_BANDS.filter((band) => output.targetAges.includes(band));
  if (output.targetTiers.length) brief.targetTiers = uniq(output.targetTiers as CityTier[]).sort();
  if (output.targetRegions.length) brief.targetRegions = uniq(output.targetRegions);

  const cityIds: string[] = [];
  const unknownCities: string[] = [];
  for (const raw of output.targetCities) {
    const name = cleanText(raw, 60);
    if (!name) continue;
    const id = cityIdForName(name);
    if (id) cityIds.push(id);
    else unknownCities.push(name);
  }
  if (cityIds.length) brief.targetCityIds = uniq(cityIds);
  if (unknownCities.length) {
    const list = uniq(unknownCities).slice(0, 5).join(", ");
    notes.push(`No creator data for ${list} yet, so ${unknownCities.length > 1 ? "those cities were" : "that city was"} left out.`);
  }

  if (output.creatorTiers.length) brief.creatorTiers = CREATOR_TIER_LIST.filter((t) => output.creatorTiers.includes(t));
  if (output.budgetINR > 0) brief.budgetINR = output.budgetINR;
  if (output.creatorsWanted > 0) brief.creatorsWanted = output.creatorsWanted;
  if (output.minAuthenticity > 0) brief.minAuthenticity = output.minAuthenticity;
  if (output.minEngagementRate > 0) brief.minEngagementRate = output.minEngagementRate;

  const brands: string[] = [];
  for (const raw of output.excludeBrands) {
    const brand = cleanText(raw, 60);
    if (brand && !brands.some((b) => b.toLowerCase() === brand.toLowerCase())) brands.push(brand);
  }
  if (brands.length) brief.excludeBrands = brands.slice(0, 10);

  for (const note of output.notes) {
    const clean = cleanText(note, MAX_NOTE_LENGTH);
    if (clean) notes.push(clean);
  }

  const detectedFields = (Object.keys(brief) as (keyof CampaignBrief)[]).filter((key) => key !== "description");
  return { brief, source: "ai", notes: uniq(notes).slice(0, MAX_NOTES), detectedFields };
}
