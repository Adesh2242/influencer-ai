import { describe, expect, it } from "vitest";
import { CITIES, CREATOR_TIER_LIST, CREATOR_TIERS, LANGUAGE_CODES, NICHES, PLATFORM_LIST, tierForFollowers } from "@/data/taxonomy";
import {
  CITY_OPTION_GROUPS,
  FOLLOWER_OPTIONS,
  followerRangeLabel,
  LANGUAGE_OPTIONS,
  MONTHLY_BUDGET_OPTIONS,
  NICHE_OPTIONS,
  PLATFORM_OPTIONS,
  tierName,
} from "./options";

describe("sign-up form options", () => {
  it("lists monthly budgets as rupee ranges in lakh and crore", () => {
    expect(MONTHLY_BUDGET_OPTIONS.map((option) => option.label)).toEqual([
      "Under ₹1 L",
      "₹1 L – ₹5 L",
      "₹5 L – ₹25 L",
      "₹25 L – ₹1 Cr",
      "Over ₹1 Cr",
      "Not sure yet",
    ]);
  });

  it("offers one follower range per creator tier, matching the tier bounds", () => {
    expect(FOLLOWER_OPTIONS).toHaveLength(CREATOR_TIER_LIST.length);
    expect(FOLLOWER_OPTIONS[0]?.value).toBe("1K–10K (Nano)");
    expect(FOLLOWER_OPTIONS.at(-1)?.value).toBe("1M+ (Mega)");
    for (const tier of CREATOR_TIER_LIST) {
      expect(tierForFollowers(CREATOR_TIERS[tier].minFollowers)).toBe(tier);
    }
  });

  it("names tiers without their follower range", () => {
    expect(tierName("mid")).toBe("Mid-tier");
    expect(followerRangeLabel("mid")).toBe("100K–500K");
  });

  it("groups every city exactly once by tier, alphabetically", () => {
    const values = CITY_OPTION_GROUPS.flatMap((group) => group.options.map((option) => option.value));
    expect(values).toHaveLength(CITIES.length);
    expect(new Set(values).size).toBe(values.length);
    for (const group of CITY_OPTION_GROUPS) {
      const labels = group.options.map((option) => option.label);
      expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, "en-IN")));
    }
    expect(values).toContain("Coimbatore, Tamil Nadu");
    expect(values).toContain("Delhi");
  });

  it("shows languages with their native names", () => {
    expect(LANGUAGE_OPTIONS).toHaveLength(LANGUAGE_CODES.length);
    expect(LANGUAGE_OPTIONS).toContainEqual({ value: "Tamil", label: "Tamil (தமிழ்)" });
    expect(LANGUAGE_OPTIONS).toContainEqual({ value: "English", label: "English" });
  });

  it("covers every niche and platform", () => {
    expect(NICHE_OPTIONS).toHaveLength(NICHES.length);
    expect(PLATFORM_OPTIONS).toHaveLength(PLATFORM_LIST.length);
    expect(PLATFORM_OPTIONS.map((option) => option.value)).toEqual(expect.arrayContaining(["Moj", "ShareChat"]));
  });
});
