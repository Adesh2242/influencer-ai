import type { ScoreKey, ScoreWeights } from "@/types";

/** Score keys in the weights object's own order (the order the engine reports components in). */
export function scoreKeys(weights: ScoreWeights): ScoreKey[] {
  return Object.keys(weights) as ScoreKey[];
}

/**
 * Each weight as a share (0..1) of the weights that still count. Skipped keys map to null, which
 * mirrors how the engine re-normalises when a brief leaves criteria open.
 */
export function weightShares(weights: ScoreWeights, skipped: readonly ScoreKey[] = []): Record<ScoreKey, number | null> {
  const keys = scoreKeys(weights);
  const total = keys.filter((key) => !skipped.includes(key)).reduce((sum, key) => sum + weights[key], 0);
  return Object.fromEntries(
    keys.map((key) => [key, skipped.includes(key) || total <= 0 ? null : weights[key] / total]),
  ) as Record<ScoreKey, number | null>;
}

/** 0.24 -> "24%", 0.125 -> "12.5%". */
export function formatWeight(share: number): string {
  return `${Math.round(share * 1000) / 10}%`;
}
