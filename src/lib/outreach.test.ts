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
} from "./outreach";
import type { CampaignBrief, Creator } from "../types";

// Fictional creator used only by these tests.
const CREATOR: Creator = {
  id: "test-meera",
  name: "Meera Krishnan",
  handle: "meera.cooks.tamil",
  bio: "Everyday Chettinad recipes and kitchen hacks.",
  homeCityId: "chennai",
  languages: ["ta", "en"],
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
    regions: { north: 0.04, south: 0.86, east: 0.02, west: 0.05, central: 0.01, northeast: 0.02 },
    topCities: [
      { cityId: "chennai", share: 0.24 },
      { cityId: "coimbatore", share: 0.11 },
      { cityId: "madurai", share: 0.08 },
      { cityId: "bengaluru", share: 0.06 },
      { cityId: "salem", share: 0.04 },
    ],
    languages: [
      { code: "ta", share: 0.78 },
      { code: "en", share: 0.15 },
    ],
  },
  authenticity: { score: 91, suspiciousFollowerPct: 4.2, flags: [] },
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
  languages: ["ta"],
  targetRegions: ["south"],
  targetGender: "female",
};

const ESTIMATE = { platform: "instagram" as const, estimatedCostINR: 38_000 };

const LANGUAGES: OutreachLanguage[] = ["en", "hinglish"];
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
          expect(message.body).toContain("Chennai");
          expect(message.body).toContain("breakfast cereal campaign");
        });

        it("never leaves placeholders or broken values", () => {
          expectClean(message.body);
          if (message.subject !== null) expectClean(message.subject);
        });

        if (channel === "dm") {
          it("has no subject and stays short", () => {
            expect(message.subject).toBeNull();
            expect(message.body.length).toBeLessThan(700);
          });
        } else {
          it("has a subject and a timeline", () => {
            expect(message.subject).toContain("Millet Mornings");
            expect(message.body).toMatch(language === "en" ? /first draft in about 5 days/ : /5 din mein first draft/);
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
    expect(body).toContain("86% of your audience is in South India");
    expect(body).toContain("you create in Tamil");
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
      authenticity: { score: 60, suspiciousFollowerPct: 20, flags: [] },
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
