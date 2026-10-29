import { describe, expect, it } from "vitest";
import { CREATOR_BY_ID, DATASET_SEED, DATASET_SIZE, FICTIONAL_BRANDS, creators, generateCreators, getCreatorById } from "./creators";
import { FAMOUS_NAMES, nameKey } from "./generator/names";
import {
  AGE_BANDS,
  CITY_BY_ID,
  CITY_TIER_LIST,
  CREATOR_TIER_LIST,
  CREATOR_TIERS,
  LANGUAGE_CODES,
  NICHES,
  PLATFORM_LIST,
  REGION_LIST,
  tierForFollowers,
} from "./taxonomy";
import type { CreatorTier } from "../types";

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const SHARE_TOLERANCE = 0.002;

function countBy<T extends string | number>(items: T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return counts;
}

describe("demo creator dataset", () => {
  it("is deterministic for a seed and differs for another seed", () => {
    expect(generateCreators(DATASET_SEED, DATASET_SIZE)).toEqual(creators);
    const other = generateCreators(DATASET_SEED + 1, DATASET_SIZE);
    expect(other.map((c) => c.id)).not.toEqual(creators.map((c) => c.id));
  });

  it("generates quickly", () => {
    // Fastest of several runs, so a busy parallel test run doesn't make this flaky.
    let fastest = Infinity;
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      generateCreators(DATASET_SEED, DATASET_SIZE);
      fastest = Math.min(fastest, performance.now() - start);
    }
    expect(fastest).toBeLessThan(60);
  });

  it("has 220-280 creators with unique ids and handles, and the lookups agree", () => {
    expect(creators.length).toBeGreaterThanOrEqual(220);
    expect(creators.length).toBeLessThanOrEqual(280);
    expect(new Set(creators.map((c) => c.id)).size).toBe(creators.length);
    expect(new Set(creators.map((c) => c.handle)).size).toBe(creators.length);
    for (const creator of creators) {
      expect(creator.handle).toMatch(/^[a-z0-9._]{3,30}$/);
      expect(creator.id).toMatch(/^[a-z0-9-]+$/);
      expect(CREATOR_BY_ID[creator.id]).toBe(creator);
      expect(getCreatorById(creator.id)).toBe(creator);
    }
    expect(getCreatorById("no-such-creator")).toBeUndefined();
  });

  it("uses invented names, never the blocked well-known ones", () => {
    for (const creator of creators) {
      expect(creator.name.trim().split(/\s+/).length).toBeGreaterThanOrEqual(2);
      expect(FAMOUS_NAMES.has(nameKey(creator.name))).toBe(false);
    }
  });

  it("skews towards small creators and keeps tier consistent with primary followers", () => {
    const tiers = countBy(creators.map((c) => c.tier));
    const share = (tier: CreatorTier) => (tiers.get(tier) ?? 0) / creators.length;
    expect(share("nano")).toBeGreaterThanOrEqual(0.2);
    expect(share("micro")).toBeGreaterThanOrEqual(0.3);
    expect(share("nano") + share("micro")).toBeGreaterThan(share("mid") + share("macro") + share("mega"));
    for (const tier of CREATOR_TIER_LIST) expect(tiers.get(tier) ?? 0).toBeGreaterThan(0);

    for (const creator of creators) {
      const [primary, ...secondary] = creator.platforms;
      expect(creator.tier).toBe(tierForFollowers(primary.followers));
      expect(primary.followers).toBeGreaterThanOrEqual(CREATOR_TIERS[creator.tier].minFollowers);
      expect(primary.followers).toBeLessThan(CREATOR_TIERS[creator.tier].maxFollowers);
      for (const stats of secondary) expect(stats.followers).toBeLessThan(primary.followers);
    }
  });

  it("gives every creator 1-3 distinct platforms with plausible stats, LinkedIn only as secondary", () => {
    for (const creator of creators) {
      const platforms = creator.platforms.map((p) => p.platform);
      expect(platforms.length).toBeGreaterThanOrEqual(1);
      expect(platforms.length).toBeLessThanOrEqual(3);
      expect(new Set(platforms).size).toBe(platforms.length);
      expect(platforms[0]).not.toBe("linkedin");
      for (const stats of creator.platforms) {
        expect(PLATFORM_LIST).toContain(stats.platform);
        expect(stats.followers).toBeGreaterThan(0);
        expect(stats.avgViews).toBeGreaterThan(0);
        expect(stats.engagementRate).toBeGreaterThan(0);
        expect(stats.engagementRate).toBeLessThan(30);
      }
    }
    const primaries = countBy(creators.map((c) => c.platforms[0].platform));
    const instagram = primaries.get("instagram") ?? 0;
    for (const [platform, count] of primaries) if (platform !== "instagram") expect(instagram).toBeGreaterThan(count);
  });

  it("covers every niche, language, region and city tier", () => {
    for (const niche of NICHES) {
      expect(creators.filter((c) => c.niches.includes(niche)).length, niche).toBeGreaterThanOrEqual(8);
    }
    for (const code of LANGUAGE_CODES) {
      expect(creators.filter((c) => c.audience.languages[0].code === code).length, code).toBeGreaterThanOrEqual(6);
    }
    const homeCities = creators.map((c) => CITY_BY_ID[c.homeCityId]);
    for (const region of REGION_LIST) expect(homeCities.some((city) => city.region === region), region).toBe(true);
    for (const tier of CITY_TIER_LIST) expect(homeCities.some((city) => city.tier === tier), `tier ${tier}`).toBe(true);
  });

  it("keeps profile fields within their documented ranges", () => {
    for (const creator of creators) {
      expect(CITY_BY_ID[creator.homeCityId], creator.homeCityId).toBeDefined();
      expect(creator.niches.length).toBeGreaterThanOrEqual(1);
      expect(creator.niches.length).toBeLessThanOrEqual(3);
      expect(new Set(creator.niches).size).toBe(creator.niches.length);
      expect(creator.languages.length).toBeGreaterThanOrEqual(1);
      expect(creator.topics.length).toBeGreaterThanOrEqual(4);
      expect(creator.topics.length).toBeLessThanOrEqual(8);
      expect(creator.bio.length).toBeGreaterThan(20);
      expect(creator.responseRate).toBeGreaterThanOrEqual(0.35);
      expect(creator.responseRate).toBeLessThanOrEqual(0.98);
      expect(creator.avgTurnaroundDays).toBeGreaterThanOrEqual(2);
      expect(creator.avgTurnaroundDays).toBeLessThanOrEqual(14);
      expect(creator.joinedMonthsAgo).toBeGreaterThanOrEqual(1);
      expect(creator.joinedMonthsAgo).toBeLessThanOrEqual(30);
      expect(creator.avatarHue).toBeGreaterThanOrEqual(0);
      expect(creator.avatarHue).toBeLessThanOrEqual(359);
    }
  });

  it("builds audiences whose share groups add up", () => {
    for (const { audience, id } of creators) {
      const gender = audience.gender.female + audience.gender.male;
      expect(gender, id).toBeGreaterThanOrEqual(0.97 - SHARE_TOLERANCE);
      expect(gender, id).toBeLessThanOrEqual(1 + SHARE_TOLERANCE);
      expect(Math.abs(sum(AGE_BANDS.map((band) => audience.age[band])) - 1), id).toBeLessThan(SHARE_TOLERANCE);
      expect(Math.abs(sum(CITY_TIER_LIST.map((tier) => audience.tiers[tier])) - 1), id).toBeLessThan(SHARE_TOLERANCE);
      expect(Math.abs(sum(REGION_LIST.map((region) => audience.regions[region])) - 1), id).toBeLessThan(SHARE_TOLERANCE);
      expect(Math.abs(sum(audience.languages.map((l) => l.share)) - 1), id).toBeLessThan(SHARE_TOLERANCE);

      expect(audience.topCities).toHaveLength(5);
      expect(new Set(audience.topCities.map((c) => c.cityId)).size).toBe(5);
      for (const city of audience.topCities) expect(CITY_BY_ID[city.cityId], city.cityId).toBeDefined();
      for (const list of [audience.topCities, audience.languages]) {
        for (let i = 1; i < list.length; i++) expect(list[i].share).toBeLessThanOrEqual(list[i - 1].share);
      }
      expect(audience.languages[0].share).toBeGreaterThanOrEqual(0.5 - SHARE_TOLERANCE);
      expect(audience.languages[0].share).toBeLessThanOrEqual(0.9 + SHARE_TOLERANCE);
    }
  });

  it("skews audience gender by niche", () => {
    const femaleShare = (pred: (niches: string[]) => boolean) => {
      const group = creators.filter((c) => pred(c.niches));
      return sum(group.map((c) => c.audience.gender.female)) / group.length;
    };
    expect(femaleShare((n) => n[0] === "beauty" || n[0] === "parenting")).toBeGreaterThan(0.6);
    expect(femaleShare((n) => n[0] === "automotive" || n[0] === "gaming")).toBeLessThan(0.4);
  });

  it("keeps authenticity and brand-safety scores consistent with their flags", () => {
    let lowAuthenticity = 0;
    for (const { authenticity, brandSafety, id } of creators) {
      expect(authenticity.score).toBeGreaterThanOrEqual(0);
      expect(authenticity.score).toBeLessThanOrEqual(100);
      expect(authenticity.suspiciousFollowerPct).toBeGreaterThanOrEqual(0);
      expect(authenticity.suspiciousFollowerPct).toBeLessThanOrEqual(100);
      expect(brandSafety.score).toBeGreaterThanOrEqual(0);
      expect(brandSafety.score).toBeLessThanOrEqual(100);
      if (authenticity.score <= 65) {
        lowAuthenticity += 1;
        expect(authenticity.flags.length, id).toBeGreaterThan(0);
      }
      if (brandSafety.score < 80) expect(brandSafety.flags.length, id).toBeGreaterThan(0);
    }
    expect(lowAuthenticity / creators.length).toBeGreaterThan(0.04);
    expect(lowAuthenticity / creators.length).toBeLessThan(0.2);

    const meanSuspicious = (pred: (score: number) => boolean) => {
      const group = creators.filter((c) => pred(c.authenticity.score));
      return sum(group.map((c) => c.authenticity.suspiciousFollowerPct)) / group.length;
    };
    expect(meanSuspicious((score) => score <= 65)).toBeGreaterThan(meanSuspicious((score) => score >= 80));
  });

  it("prices deliverables inside the tier's rate band, rounded to ₹500", () => {
    for (const { rates, tier, platforms, id } of creators) {
      const [min, max] = CREATOR_TIERS[tier].reelRate;
      expect(rates.reel, id).toBeGreaterThanOrEqual(min);
      expect(rates.reel, id).toBeLessThanOrEqual(max);
      for (const fee of [rates.reel, rates.story, rates.post, rates.video ?? 0]) expect(fee % 500, id).toBe(0);
      // Rounding to ₹500 can push small fees slightly outside the nominal ratio.
      expect(rates.story).toBeGreaterThanOrEqual(rates.reel * 0.3 - 250);
      expect(rates.story).toBeLessThanOrEqual(rates.reel * 0.4 + 250);
      expect(rates.post).toBeGreaterThanOrEqual(rates.reel * 0.6 - 250);
      expect(rates.post).toBeLessThanOrEqual(rates.reel * 0.8 + 250);
      if (platforms.some((p) => p.platform === "youtube")) {
        expect(rates.video, id).not.toBeNull();
        expect(rates.video!).toBeGreaterThanOrEqual(rates.reel * 1.5 - 250);
        expect(rates.video!).toBeLessThanOrEqual(rates.reel * 2.5 + 250);
      } else {
        expect(rates.video, id).toBeNull();
      }
    }
  });

  it("only lists collaborations with fictional brands", () => {
    const brandNames = new Set(FICTIONAL_BRANDS.map((b) => b.name));
    for (const { collaborations, id } of creators) {
      expect(collaborations.length, id).toBeLessThanOrEqual(6);
      for (const collaboration of collaborations) {
        expect(brandNames.has(collaboration.brand), collaboration.brand).toBe(true);
        expect(collaboration.monthsAgo).toBeGreaterThanOrEqual(1);
        expect(collaboration.monthsAgo).toBeLessThanOrEqual(24);
      }
    }
  });
});
