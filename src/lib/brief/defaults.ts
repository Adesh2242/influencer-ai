import type { CampaignBrief } from "../../types";

/** Starting point for a new brief: no targeting preferences, a mid-size budget, sensible hard filters. */
export const DEFAULT_BRIEF: CampaignBrief = {
  brandName: "",
  productCategory: "",
  description: "",
  goal: "awareness",
  niches: [],
  languages: [],
  platforms: ["instagram", "youtube"],
  deliverable: "reel",
  targetGender: "any",
  targetAges: [],
  targetTiers: [],
  targetRegions: [],
  targetCityIds: [],
  creatorTiers: [],
  budgetINR: 500_000,
  creatorsWanted: 10,
  minAuthenticity: 70,
  minEngagementRate: 0,
  excludeBrands: [],
};

/** Applies the defined fields of `patch` over `base`. undefined never overwrites a value. */
export function mergeBrief(base: CampaignBrief, patch: Partial<CampaignBrief>): CampaignBrief {
  const next: CampaignBrief = { ...base };
  for (const key of Object.keys(patch) as (keyof CampaignBrief)[]) {
    const value = patch[key];
    if (value !== undefined) {
      (next as unknown as Record<string, unknown>)[key] = value;
    }
  }
  return next;
}
