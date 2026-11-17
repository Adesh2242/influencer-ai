// Deterministic fictional creators, used only as a test fixture.
//
// This was the app's dataset until real Maharashtra creators arrived from YouTube. It is kept
// because the matching engine, optimiser and query tests need a large, varied, reproducible set of
// creators, and generating one beats checking in a fixture file. Nothing outside tests imports it:
// the app loads real creators from /api/creators.
import type { Creator } from "../types";
import { DATASET_SEED, DATASET_SIZE, generateCreators } from "../data/generator/generate";

export { DATASET_SEED, DATASET_SIZE, generateCreators } from "../data/generator/generate";
export { FICTIONAL_BRANDS, type FictionalBrand } from "../data/generator/brands";

export const creators: Creator[] = generateCreators(DATASET_SEED, DATASET_SIZE);

export const CREATOR_BY_ID: Record<string, Creator> = Object.fromEntries(creators.map((c) => [c.id, c]));

export function getCreatorById(id: string): Creator | undefined {
  return CREATOR_BY_ID[id];
}
