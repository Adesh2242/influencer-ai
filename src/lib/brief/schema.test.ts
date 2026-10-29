import { describe, expect, it } from "vitest";
import { aiBriefOutputSchema, aiOutputToParsedBrief, BRIEF_JSON_SCHEMA, cityIdForName, type AiBriefOutput } from "./schema";

const EMPTY: AiBriefOutput = {
  brandName: "",
  productCategory: "",
  goal: "",
  niches: [],
  languages: [],
  platforms: [],
  deliverable: "",
  targetGender: "any",
  targetAges: [],
  targetTiers: [],
  targetRegions: [],
  targetCities: [],
  creatorTiers: [],
  budgetINR: 0,
  creatorsWanted: 0,
  minAuthenticity: 0,
  minEngagementRate: 0,
  excludeBrands: [],
  notes: [],
};

const ALLOWED_KEYWORDS = new Set([
  "type",
  "enum",
  "items",
  "properties",
  "required",
  "additionalProperties",
  "description",
  "minimum",
  "maximum",
]);

function visit(node: unknown, path: string, check: (schema: Record<string, unknown>, path: string) => void): void {
  if (typeof node !== "object" || node === null) return;
  const schema = node as Record<string, unknown>;
  check(schema, path);
  if (schema.properties) {
    for (const [key, child] of Object.entries(schema.properties as Record<string, unknown>)) visit(child, `${path}.${key}`, check);
  }
  if (schema.items) visit(schema.items, `${path}[]`, check);
}

describe("BRIEF_JSON_SCHEMA", () => {
  it("closes every object and requires all of its properties", () => {
    let objects = 0;
    visit(BRIEF_JSON_SCHEMA, "$", (schema, path) => {
      if (schema.type !== "object") return;
      objects += 1;
      expect(schema.additionalProperties, path).toBe(false);
      expect([...(schema.required as string[])].sort(), path).toEqual(Object.keys(schema.properties as object).sort());
    });
    expect(objects).toBeGreaterThan(0);
  });

  it("uses only supported keywords and no nulls", () => {
    visit(BRIEF_JSON_SCHEMA, "$", (schema, path) => {
      for (const key of Object.keys(schema)) expect(ALLOWED_KEYWORDS.has(key), `${path}.${key}`).toBe(true);
      expect(schema.type, path).not.toBe("null");
      if (Array.isArray(schema.enum)) expect(schema.enum, path).not.toContain(null);
    });
  });

  it("matches the zod validator's fields", () => {
    expect(Object.keys(BRIEF_JSON_SCHEMA.properties).sort()).toEqual(Object.keys(aiBriefOutputSchema.shape).sort());
    expect(aiBriefOutputSchema.safeParse(EMPTY).success).toBe(true);
    expect(aiBriefOutputSchema.safeParse({ ...EMPTY, niches: ["astrophysics"] }).success).toBe(false);
    expect(aiBriefOutputSchema.safeParse({ ...EMPTY, budgetINR: -1 }).success).toBe(false);
    expect(aiBriefOutputSchema.safeParse({ ...EMPTY, targetTiers: [4] }).success).toBe(false);
  });
});

describe("aiOutputToParsedBrief", () => {
  it("omits empty and zero fields", () => {
    expect(aiOutputToParsedBrief(EMPTY)).toEqual({ brief: {}, source: "ai", notes: [], detectedFields: [] });
  });

  it("maps city names and aliases to ids and reports unknown cities", () => {
    const parsed = aiOutputToParsedBrief({ ...EMPTY, targetCities: ["Bangalore", "new delhi", "BOMBAY", "Mysore city", "Atlantis"] });
    expect(parsed.brief.targetCityIds).toEqual(["bengaluru", "delhi", "mumbai", "mysuru"]);
    expect(parsed.notes.join(" ")).toMatch(/Atlantis/);
    expect(parsed.detectedFields).toEqual(["targetCityIds"]);
  });

  it("maps a full output and keeps the source text as the description", () => {
    const parsed = aiOutputToParsedBrief(
      {
        ...EMPTY,
        brandName: "  Glowleaf Naturals ",
        productCategory: "vitamin C serum",
        goal: "awareness",
        niches: ["beauty", "beauty", "health"],
        languages: ["ta", "te"],
        platforms: ["instagram"],
        deliverable: "reel",
        targetGender: "female",
        targetAges: ["25-34", "18-24"],
        targetTiers: [3, 1],
        targetRegions: ["south"],
        creatorTiers: ["mid", "micro"],
        budgetINR: 300_000,
        creatorsWanted: 8,
        minAuthenticity: 80,
        excludeBrands: ["Dewdrop", "dewdrop", " "],
        notes: ["Read 3 L as ₹3,00,000."],
      },
      "  the brief  ",
    );
    expect(parsed.source).toBe("ai");
    expect(parsed.brief).toEqual({
      brandName: "Glowleaf Naturals",
      productCategory: "vitamin C serum",
      description: "the brief",
      goal: "awareness",
      niches: ["beauty", "health"],
      languages: ["ta", "te"],
      platforms: ["instagram"],
      deliverable: "reel",
      targetGender: "female",
      targetAges: ["18-24", "25-34"],
      targetTiers: [1, 3],
      targetRegions: ["south"],
      creatorTiers: ["micro", "mid"],
      budgetINR: 300_000,
      creatorsWanted: 8,
      minAuthenticity: 80,
      excludeBrands: ["Dewdrop"],
    });
    expect(parsed.detectedFields).not.toContain("description");
    expect(parsed.notes).toEqual(["Read 3 L as ₹3,00,000."]);
  });

  it("looks up cities case-insensitively", () => {
    expect(cityIdForName("TRIVANDRUM")).toBe("thiruvananthapuram");
    expect(cityIdForName("Hubli-Dharwad")).toBe("hubballi");
    expect(cityIdForName("Gotham")).toBeUndefined();
  });
});
