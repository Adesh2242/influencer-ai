import { getCity, LANGUAGE_CODES } from "@/data/taxonomy";
import type { Creator, LanguageCode } from "@/types";

export interface DatasetCoverage {
  creators: number;
  /** Distinct content languages. */
  languages: number;
  /** Distinct known home cities. */
  cities: number;
  /** Home cities in tier 2 and 3. */
  nonMetroCities: number;
  niches: number;
  /** Creators making content in each language. */
  creatorsByLanguage: Record<LanguageCode, number>;
}

/** Live counts for the "Built for India" band; safe on an empty dataset. */
export function computeCoverage(creators: readonly Creator[]): DatasetCoverage {
  const languages = new Set<LanguageCode>();
  const cityIds = new Set<string>();
  const niches = new Set<string>();
  const creatorsByLanguage = Object.fromEntries(LANGUAGE_CODES.map((code) => [code, 0])) as Record<LanguageCode, number>;
  let nonMetroCities = 0;

  for (const creator of creators) {
    for (const code of new Set(creator.languages)) {
      languages.add(code);
      creatorsByLanguage[code] = (creatorsByLanguage[code] ?? 0) + 1;
    }
    for (const niche of creator.niches) niches.add(niche);

    const city = getCity(creator.homeCityId);
    if (city && !cityIds.has(city.id)) {
      cityIds.add(city.id);
      if (city.tier !== 1) nonMetroCities += 1;
    }
  }

  return {
    creators: creators.length,
    languages: languages.size,
    cities: cityIds.size,
    nonMetroCities,
    niches: niches.size,
    creatorsByLanguage,
  };
}
