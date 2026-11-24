import { describe, expect, it } from "vitest";
import { DEFAULT_BRIEF } from "./brief/defaults";
import {
  asciDisclosureLine,
  buildOutreachMessage,
  deliverableName,
  firstNameOf,
  resolveDeliverable,
  type OutreachChannel,
  type OutreachLanguage,
  defaultOutreachLanguage,
} from "./outreach";
import type { CampaignBrief, Creator } from "../types";

// Fictional creator used only by these tests.
const CREATOR: Creator = {
  id: "test-meera",
  name: "Meera Krishnan",
  handle: "meera.cooks.tamil",
  bio: "Everyday Chettinad recipes and kitchen hacks.",
  homeCityId: "pune",
  languages: ["mr", "en"],
  niches: ["food", "lifestyle"],
  topics: ["recipes", "millets", "kitchen"],
  platforms: [
    { platform: "instagram", handle: "meera.cooks.tamil", followers: 48_000, avgViews: 22_000, engagementRate: 4.8, postsPerMonth: 14 },
    { platform: "youtube", handle: "MeeraCooksTamil", followers: 21_000, avgViews: 9_000, engagementRate: 3.1, postsPerMonth: 4 },
  ],
  tier: "micro",
  audience: {
    gender: { female: 0.71, male: 0.27 },
    age: { "13-17": 0.03, "18-24": 0.22, "25-34": 0.41, "35-44": 0.24, "45+": 0.1 },
    tiers: { 1: 0.38, 2: 0.4, 3: 0.22 },
    regions: { western: 0.62, mumbai_metro: 0.18, north: 0.1, marathwada: 0.05, vidarbha: 0.04, konkan: 0.01 },
    topCities: [
      { cityId: "pune", share: 0.24 },
      { cityId: "kolhapur", share: 0.11 },
      { cityId: "nashik", share: 0.08 },
      { cityId: "nashik", share: 0.06 },
      { cityId: "salem", share: 0.04 },
    ],
    languages: [
      { code: "mr", share: 0.78 },
      { code: "en", share: 0.15 },
    ],
  },
  authenticity: { score: 91, dormantSubscriberPct: 4.2, flags: [] },
  brandSafety: { score: 96, flags: [] },
  rates: { reel: 38_000, story: 9_000, post: 21_000, video: 55_000 },
  collaborations: [{ brand: "Kolam Kitchenware", category: "Kitchen", monthsAgo: 3 }],
  responseRate: 0.82,
  avgTurnaroundDays: 5,
  verified: true,
  gstRegistered: true,
  joinedMonthsAgo: 14,
  avatarHue: 24,
};

const BRIEF: CampaignBrief = {
  ...DEFAULT_BRIEF,
  brandName: "Millet Mornings",
  productCategory: "Breakfast cereal",
  niches: ["food", "health"],
  languages: ["mr"],
  targetRegions: ["western"],
  targetGender: "female",
};

const ESTIMATE = { platform: "instagram" as const, estimatedCostINR: 38_000 };

const LANGUAGES: OutreachLanguage[] = ["en", "hinglish", "mr"];
const CHANNELS: OutreachChannel[] = ["email", "dm"];

function expectClean(text: string) {
  expect(text).not.toMatch(/undefined|null|NaN|Infinity|\[object/);
  expect(text).not.toMatch(/ {2}|\s[,.:]|\(\s*\)|\{|\}/);
  expect(text.trim()).toBe(text);
}

describe("buildOutreachMessage", () => {
  for (const language of LANGUAGES) {
    for (const channel of CHANNELS) {
      describe(`${language} ${channel}`, () => {
        const message = buildOutreachMessage({ creator: CREATOR, brief: BRIEF, estimate: ESTIMATE, language, channel });

        it("greets the creator by first name and includes the ASCI disclosure line", () => {
          expect(message.body).toContain("Meera");
          expect(message.body).not.toContain("Krishnan");
          expect(message.body).toContain(asciDisclosureLine(language, "reel"));
          expect(message.body).toMatch(/ASCI/);
          expect(message.body).toContain("#ad");
        });

        it("personalises the brand, deliverable, fee and city", () => {
          expect(message.body).toContain("Millet Mornings");
          expect(message.body).toContain("1 Instagram Reel");
          expect(message.body).toContain("₹38,000");
          expect(message.body).toContain("GST");
          expect(message.body).toContain(language === "mr" ? "पुणे" : "Pune");
          // The brand's own product category is never translated — it is free text they typed.
          expect(message.body).toContain("breakfast cereal");
          expect(message.body).toMatch(language === "mr" ? /कॅम्पेन/ : /campaign/);
        });

        it("never leaves placeholders or broken values", () => {
          expectClean(message.body);
          if (message.subject !== null) expectClean(message.subject);
        });

        if (channel === "dm") {
          it("has no subject and stays short", () => {
            expect(message.subject).toBeNull();
            expect(message.body.length).toBeLessThan(language === "mr" ? 800 : 700);
          });
        } else {
          it("has a subject and a timeline", () => {
            expect(message.subject).toContain("Millet Mornings");
            const timeline = { en: /first draft in about 5 days/, hinglish: /5 din mein first draft/, mr: /5 दिवसांत पहिला ड्राफ्ट/ };
            expect(message.body).toMatch(timeline[language]);
          });
        }
      });
    }
  }

  it("writes Hinglish in Roman script", () => {
    const { body } = buildOutreachMessage({ creator: CREATOR, brief: BRIEF, estimate: ESTIMATE, language: "hinglish", channel: "email" });
    expect(body).toMatch(/Namaste Meera ji/);
    expect(body).toMatch(/\bhum\b|\bHum\b/);
    expect(body).not.toMatch(/[ऀ-ॿ]/);
  });

  it("explains the fit from the brief's targeting", () => {
    const { body } = buildOutreachMessage({ creator: CREATOR, brief: BRIEF, estimate: ESTIMATE, language: "en", channel: "email" });
    expect(body).toContain("of your audience is in Western Maharashtra");
    expect(body).toContain("you create in Marathi");
  });

  it("falls back gracefully when the brief is empty and the data is sparse", () => {
    const sparse: Creator = {
      ...CREATOR,
      name: "",
      homeCityId: "atlantis",
      niches: [],
      gstRegistered: false,
      avgTurnaroundDays: Number.NaN,
      platforms: [],
      authenticity: { score: 60, dormantSubscriberPct: 20, flags: [] },
    };
    const estimate = { platform: "instagram" as const, estimatedCostINR: Number.NaN };
    for (const language of LANGUAGES) {
      for (const channel of CHANNELS) {
        const message = buildOutreachMessage({ creator: sparse, brief: DEFAULT_BRIEF, estimate, language, channel });
        expectClean(message.body);
        if (message.subject !== null) expectClean(message.subject);
        expect(message.body).toContain(asciDisclosureLine(language, "reel"));
        expect(message.body).not.toContain("GST");
        expect(message.body).not.toContain("₹");
      }
    }
    const english = buildOutreachMessage({ creator: sparse, brief: DEFAULT_BRIEF, estimate, language: "en", channel: "email" });
    expect(english.subject).toBe("Paid collaboration with our brand: 1 Instagram Reel");
    expect(english.body).toContain("Hi there,");
    expect(english.body).toContain("our upcoming campaign");
  });

  it("is deterministic", () => {
    const input = { creator: CREATOR, brief: BRIEF, estimate: ESTIMATE, language: "en" as const, channel: "email" as const };
    expect(buildOutreachMessage(input)).toEqual(buildOutreachMessage(input));
  });

  it("matches the disclosure advice to the format", () => {
    const brief: CampaignBrief = { ...BRIEF, deliverable: "video" };
    const { body } = buildOutreachMessage({
      creator: CREATOR,
      brief,
      estimate: { platform: "youtube", estimatedCostINR: 55_000 },
      language: "en",
      channel: "email",
    });
    expect(body).toContain("1 YouTube integration");
    expect(body).toContain(asciDisclosureLine("en", "video"));
  });
});

describe("helpers", () => {
  it("finds the first name after an honorific", () => {
    expect(firstNameOf("Meera Krishnan")).toBe("Meera");
    expect(firstNameOf("Dr. Kavya Rao")).toBe("Kavya");
    expect(firstNameOf("CA Rohan Shah")).toBe("Rohan");
    expect(firstNameOf("  ")).toBe("");
  });

  it("falls back to a deliverable the platform supports", () => {
    expect(resolveDeliverable("story", "youtube")).toBe("video");
    expect(resolveDeliverable("reel", "youtube")).toBe("reel");
    expect(resolveDeliverable("reel", "linkedin")).toBe("post");
  });

  it("names formats the way creators do", () => {
    expect(deliverableName("reel", "instagram")).toBe("Instagram Reel");
    expect(deliverableName("reel", "youtube")).toBe("YouTube Short");
    expect(deliverableName("reel", "moj")).toBe("Moj short video");
    expect(deliverableName("post", "sharechat")).toBe("ShareChat post");
  });
});

/**
 * Marathi is the default for most of this catalogue, so these cover the things a half-translated
 * draft gets wrong: an English sentence surviving in the middle of it, a city or niche left in
 * Latin script, or a postposition left hanging off a word it does not attach to.
 */
describe("the Marathi draft", () => {
  const pune: Creator = {
    ...CREATOR,
    name: "Mitali Pawar",
    homeCityId: "pune",
    languages: ["mr", "hi"],
    niches: ["food", "lifestyle"],
    audience: { ...CREATOR.audience, topCities: [{ cityId: "pune", share: 0.42 }] },
  };
  const brief = { ...BRIEF, languages: ["mr" as const], targetCityIds: ["pune"], targetRegions: [] };
  const draft = (channel: OutreachChannel) =>
    buildOutreachMessage({ creator: pune, brief, estimate: ESTIMATE, language: "mr", channel });

  it("is written in Devanagari, with no English sentence left in it", () => {
    const { subject, body } = draft("email");
    expect(body).toMatch(/[ऀ-ॿ]/);
    expect(subject).toMatch(/[ऀ-ॿ]/);
    // The giveaways that the English or Hinglish branch ran instead.
    expect(body).not.toMatch(/I'm reaching out|Here's what we have in mind|Warm regards/);
    expect(body).not.toMatch(/\bHum\b|ki taraf se|ke hisaab se/);
  });

  it("names the city and the niche in Marathi, not in Latin script", () => {
    const { body } = draft("email");
    expect(body).toContain("पुणे");
    expect(body).not.toMatch(/\bPune\b/);
    expect(body).toContain("खाद्यपदार्थ कंटेंट");
    expect(body).not.toMatch(/\bFood content\b|\bfood content\b/);
  });

  it("uses the Marathi word for a professional fee and keeps the rupee figure", () => {
    const { body } = draft("email");
    expect(body).toContain("मानधन");
    expect(body).toContain("₹38,000");
  });

  it("carries the ASCI disclosure in Marathi", () => {
    expect(draft("email").body).toContain(asciDisclosureLine("mr", "reel"));
    expect(asciDisclosureLine("mr", "reel")).toMatch(/मार्गदर्शक तत्त्वांनुसार/);
    expect(asciDisclosureLine("mr", "reel")).toContain("#ad");
  });

  it("writes a DM with no subject line", () => {
    expect(draft("dm").subject).toBeNull();
  });

  it("holds together when the brand, fee and city are all missing", () => {
    const anonymous: Creator = { ...pune, name: "", homeCityId: "", gstRegistered: false };
    const empty = { ...brief, brandName: "", productCategory: "" };
    for (const channel of CHANNELS) {
      const { body } = buildOutreachMessage({
        creator: anonymous,
        brief: empty,
        estimate: { platform: "instagram", estimatedCostINR: 0 },
        channel,
        language: "mr",
      });
      expectClean(body);
      // No name, so the bare greeting; no brand, so "our brand"; no fee, so it asks for their rate.
      expect(body).toContain("नमस्कार");
      expect(body).toContain("आमच्या ब्रँडकडून");
      expect(body).toContain("आमच्या पुढील कॅम्पेन");
      expect(body).not.toContain("₹");
      expect(body).not.toContain("GST");
      expect(body).toMatch(channel === "email" ? /तुमच्या कोटेशननुसार/ : /तुमचा दर कळवा/);
    }
  });
});

describe("defaultOutreachLanguage", () => {
  it("opens in Marathi for a creator who publishes in Marathi", () => {
    expect(defaultOutreachLanguage({ ...CREATOR, languages: ["mr", "hi"] })).toBe("mr");
  });

  it("opens in Hinglish for a Hindi-only creator, which is how brands write to them", () => {
    expect(defaultOutreachLanguage({ ...CREATOR, languages: ["hi"] })).toBe("hinglish");
  });

  it("opens in English for a creator who publishes in neither Marathi nor only Hindi", () => {
    expect(defaultOutreachLanguage({ ...CREATOR, languages: ["en"] })).toBe("en");
    expect(defaultOutreachLanguage({ ...CREATOR, languages: ["hi", "en"] })).toBe("en");
  });
});
