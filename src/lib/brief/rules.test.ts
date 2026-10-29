import { describe, expect, it } from "vitest";
import { parseBriefWithRules } from "./rules";

const parse = (text: string) => parseBriefWithRules(text).brief;

describe("parseBriefWithRules: realistic briefs", () => {
  it("reads a South India skincare launch", () => {
    const result = parseBriefWithRules(
      "We are Glowleaf Naturals, launching a vitamin C serum for women 18-34 in South India. Tamil, Telugu, Kannada and Malayalam creators on Instagram reels. Budget ₹3 lakh for 8 micro-influencers. No fake followers please. Avoid creators who worked with Dewdrop Botanics in the last 6 months.",
    );
    expect(result.source).toBe("rules");
    expect(result.brief).toMatchObject({
      brandName: "Glowleaf Naturals",
      productCategory: "serum",
      niches: ["beauty"],
      languages: ["ta", "te", "kn", "ml"],
      platforms: ["instagram"],
      deliverable: "reel",
      targetGender: "female",
      targetAges: ["18-24", "25-34"],
      targetRegions: ["south"],
      creatorTiers: ["micro"],
      budgetINR: 300_000,
      creatorsWanted: 8,
      minAuthenticity: 80,
      excludeBrands: ["Dewdrop Botanics"],
    });
    expect(result.detectedFields).toContain("budgetINR");
    expect(result.detectedFields).not.toContain("description");
  });

  it("reads a Hinglish fintech brief for the Hindi belt", () => {
    const result = parseBriefWithRules(
      "PaisaPilot UPI app ke liye Hindi belt mein tier 2 aur tier 3 cities ke 20 creators chahiye. Goal: app installs. Budget 5L. Gen Z and millennials, Hinglish content, Moj and ShareChat bhi chalega.",
    );
    expect(result.brief).toMatchObject({
      niches: ["finance"],
      goal: "app_installs",
      languages: ["hi", "en"],
      platforms: ["moj", "sharechat"],
      targetTiers: [2, 3],
      targetRegions: ["north", "central"],
      targetAges: ["18-24", "25-34", "35-44"],
      budgetINR: 500_000,
      creatorsWanted: 20,
    });
    expect(result.notes.join(" ")).toMatch(/Hinglish/);
  });

  it("suggests Hindi for the Hindi belt when no language is given", () => {
    const result = parseBriefWithRules("Credit card awareness campaign across the hindi heartland, 10 creators");
    expect(result.brief.targetRegions).toEqual(["north", "central"]);
    expect(result.brief.languages).toEqual(["hi"]);
    expect(result.notes.join(" ")).toMatch(/Suggested Hindi/);
  });

  it("reads a festive snack brief with a per-creator fee and competitors", () => {
    const result = parseBriefWithRules(
      "Diwali campaign for Crunchwala namkeen in Maharashtra and Gujarat. 15 food creators, ₹20k per creator, reels + stories, Marathi and Gujarati. Competitors: SnackSutra, Masala Munch.",
    );
    expect(result.brief).toMatchObject({
      brandName: "Crunchwala",
      niches: ["food"],
      targetRegions: ["west"],
      languages: ["mr", "gu"],
      deliverable: "reel",
      creatorsWanted: 15,
      budgetINR: 300_000,
      excludeBrands: ["SnackSutra", "Masala Munch"],
    });
    expect(result.brief.niches).not.toContain("devotional");
    expect(result.notes.join(" ")).toMatch(/per creator × 15 creators/);
  });

  it("reads an EV test-drive brief with cities and an engagement floor", () => {
    expect(
      parse(
        "EV scooter test-drive drive for VoltRide in Bengaluru, Pune and Hyderabad. Men 25-44, working professionals. INR 12 lakh, a dozen creators, Instagram reels. Engagement rate above 3%.",
      ),
    ).toMatchObject({
      brandName: "VoltRide",
      niches: ["automotive"],
      targetCityIds: ["bengaluru", "pune", "hyderabad"],
      targetGender: "male",
      targetAges: ["25-34", "35-44"],
      budgetINR: 1_200_000,
      creatorsWanted: 12,
      minEngagementRate: 3,
      platforms: ["instagram"],
      deliverable: "reel",
    });
  });

  it("reads an exam-prep brief on YouTube", () => {
    const brief = parse(
      "JEE/NEET exam-prep app, Hindi and English YouTube creators, college students, 1.2 crore budget, 25 education creators, long-form integration",
    );
    expect(brief).toMatchObject({
      niches: ["education"],
      languages: ["hi", "en"],
      platforms: ["youtube"],
      deliverable: "video",
      targetAges: ["18-24"],
      budgetINR: 12_000_000,
      creatorsWanted: 25,
    });
    expect(brief.targetRegions).toBeUndefined();
  });

  it("reads a regional UGC brief and ignores a dollar budget", () => {
    const result = parseBriefWithRules(
      "Ayurvedic haircare brand. Brand: Keshveda. Need regional-language UGC on Moj/ShareChat, Bharat audience, $5,000 budget, 30 nano creators",
    );
    expect(result.brief).toMatchObject({
      brandName: "Keshveda",
      goal: "ugc",
      platforms: ["moj", "sharechat"],
      targetTiers: [2, 3],
      creatorTiers: ["nano"],
      creatorsWanted: 30,
    });
    expect(result.brief.niches).toContain("beauty");
    expect(result.brief.budgetINR).toBeUndefined();
    expect(result.notes.join(" ")).toMatch(/Ignored "\$5,000"/);
    expect(result.notes.join(" ")).toMatch(/Bharat/);
  });

  it("reads a pan-India gaming brief without a geo filter", () => {
    const result = parseBriefWithRules(
      "Pan-India launch of a BGMI tournament app. Looking for 40 gaming YouTubers and streamers, boys 18-24, ₹25 lakh total. Goal is downloads.",
    );
    expect(result.brief).toMatchObject({
      niches: ["gaming"],
      platforms: ["youtube"],
      targetGender: "male",
      targetAges: ["18-24"],
      creatorsWanted: 40,
      budgetINR: 2_500_000,
      goal: "app_installs",
    });
    expect(result.brief.targetRegions).toBeUndefined();
    expect(result.notes.join(" ")).toMatch(/Pan-India/);
  });

  it("reads a Kolkata Durga Puja fashion brief in Bengali", () => {
    expect(
      parse(
        "Durga Puja ethnic wear collection by Tantbari Looms. Bengali creators in Kolkata and Siliguri, sarees and kurtas, carousel posts on Instagram, budget Rs. 2,50,000, 10 creators.",
      ),
    ).toMatchObject({
      niches: ["fashion"],
      languages: ["bn"],
      targetCityIds: ["kolkata", "siliguri"],
      deliverable: "post",
      platforms: ["instagram"],
      budgetINR: 250_000,
      creatorsWanted: 10,
    });
  });

  it("reads a parenting brief for moms in metros", () => {
    expect(
      parse("Diapers and baby care range for new moms in metro cities. Hindi + English, stories on IG, 50k budget, 6 parenting creators"),
    ).toMatchObject({
      niches: ["parenting"],
      targetGender: "female",
      targetTiers: [1],
      platforms: ["instagram"],
      deliverable: "story",
      budgetINR: 50_000,
      creatorsWanted: 6,
    });
  });

  it("reads Hindi script and state abbreviations", () => {
    const brief = parse("हिंदी creators chahiye UP aur MP ke liye, kisan tractor brand, 8 lakh ka budget, 12 creators");
    expect(brief.languages).toEqual(["hi"]);
    expect(brief.targetRegions).toEqual(expect.arrayContaining(["north", "central"]));
    expect(brief.niches).toContain("agriculture");
    expect(brief.budgetINR).toBe(800_000);
    expect(brief.creatorsWanted).toBe(12);
  });

  it("does not read Tamil Nadu as a language request", () => {
    const brief = parse("Filter coffee brand looking for food creators in Tamil Nadu and Kerala, tier-2/3 towns");
    expect(brief.languages).toBeUndefined();
    expect(brief.targetRegions).toEqual(["south"]);
    expect(brief.targetTiers).toEqual([2, 3]);
    expect(brief.niches).toEqual(["food"]);
  });

  it("reads mixed-gender, mixed-tier audiences", () => {
    const result = parseBriefWithRules(
      "Fitness app for men and women aged 25+, tier 1 and 2 cities, mid-tier and macro creators, YouTube Shorts",
    );
    expect(result.brief).toMatchObject({
      niches: ["fitness"],
      targetGender: "any",
      targetAges: ["25-34", "35-44", "45+"],
      targetTiers: [1, 2],
      creatorTiers: ["mid", "macro"],
      platforms: ["youtube"],
      deliverable: "reel",
    });
  });

  it("does not take a follower count as a budget, count or age", () => {
    const brief = parse("Need creators with 50k followers or more, 20-30 year old women, budget not decided");
    expect(brief.budgetINR).toBeUndefined();
    expect(brief.creatorsWanted).toBeUndefined();
    expect(brief.targetAges).toEqual(["18-24", "25-34"]);
    expect(brief.goal).toBeUndefined();
  });
});

describe("parseBriefWithRules: budgets", () => {
  const cases: [string, number][] = [
    ["Budget ₹5 lakh", 500_000],
    ["budget 5L", 500_000],
    ["we have 5 lakhs for this", 500_000],
    ["Rs. 2,50,000 total", 250_000],
    ["INR 3.5 lakh", 350_000],
    ["budget around 50k", 50_000],
    ["1.2 crore campaign", 12_000_000],
    ["1 cr", 10_000_000],
    ["₹75,000", 75_000],
    ["budget is 300000", 300_000],
    ["₹3-5 lakh", 500_000],
    ["2 lakh rupees", 200_000],
  ];
  it.each(cases)("reads %s", (text, expected) => {
    expect(parse(text).budgetINR).toBe(expected);
  });

  it("ignores lakh figures that describe reach", () => {
    expect(parse("we want 5 lakh views and 1 lakh installs").budgetINR).toBeUndefined();
  });

  it("ignores bare thousands without a budget context", () => {
    expect(parse("creators between 10k and 100k").budgetINR).toBeUndefined();
  });

  it("ignores non-INR currencies with a note", () => {
    const result = parseBriefWithRules("We can spend USD 10,000 or €8k");
    expect(result.brief.budgetINR).toBeUndefined();
    expect(result.notes[0]).toMatch(/rupees only/);
  });

  it("multiplies a per-creator fee by the creator count", () => {
    expect(parse("₹20k per creator, 15 influencers").budgetINR).toBe(300_000);
    expect(parse("10 creators at Rs 15,000 each").budgetINR).toBe(150_000);
  });

  it("prefers the stated total over a per-creator fee", () => {
    expect(parse("Total budget ₹4 lakh, about ₹25k per creator, 12 creators").budgetINR).toBe(400_000);
  });

  it("leaves the budget unset when a per-creator fee has no count", () => {
    const result = parseBriefWithRules("₹20k per creator");
    expect(result.brief.budgetINR).toBeUndefined();
    expect(result.notes.join(" ")).toMatch(/no creator count/);
  });
});

describe("parseBriefWithRules: robustness", () => {
  it("returns an empty brief for empty text", () => {
    expect(parseBriefWithRules("")).toEqual({ brief: {}, source: "rules", notes: [], detectedFields: [] });
    expect(parseBriefWithRules("   \n ")).toEqual({ brief: {}, source: "rules", notes: [], detectedFields: [] });
  });

  it("never throws on odd input", () => {
    for (const input of ["₹", "tier", "18-", "%%%", "a".repeat(5000), "🙂🙂", null as unknown as string]) {
      expect(() => parseBriefWithRules(input)).not.toThrow();
    }
  });

  it("trims the description to 2000 characters", () => {
    expect(parse(`  ${"x".repeat(2500)}  `).description).toHaveLength(2000);
  });

  it("does not read Hinglish 'gaya' or a person's name as a city", () => {
    expect(parse("launch ho gaya, ab reels chahiye").targetCityIds).toBeUndefined();
  });

  it("maps Gen Z and teens onto age bands", () => {
    expect(parse("Gen Z and teens").targetAges).toEqual(["13-17", "18-24"]);
  });
});
