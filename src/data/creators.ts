// The fictional demo dataset: about 250 invented creators generated deterministically at module load.
// No database: the same seed rebuilds the same creators, with the same ids, on the server and in every
// browser, so shortlists and profile URLs stay valid across visits.
import type { Creator } from "../types";
import { DATASET_SEED, DATASET_SIZE, generateCreators } from "./generator/generate";

export { DATASET_SEED, DATASET_SIZE, generateCreators } from "./generator/generate";
export { FICTIONAL_BRANDS, type FictionalBrand } from "./generator/brands";

export const creators: Creator[] = generateCreators(DATASET_SEED, DATASET_SIZE);

export const CREATOR_BY_ID: Record<string, Creator> = Object.fromEntries(creators.map((c) => [c.id, c]));

export function getCreatorById(id: string): Creator | undefined {
  return CREATOR_BY_ID[id];
}
