// Small numeric helpers for the generator. Shares are stored with three decimals and always sum to 1.

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function roundDecimals(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Converts non-negative weights into shares with `unit` resolution (1000 = three decimals) that sum
 * to exactly 1, using the largest-remainder method so no share is rounded in a biased direction.
 */
export function toShares(weights: readonly number[], unit = 1000): number[] {
  const n = weights.length;
  if (n === 0) return [];
  let total = 0;
  for (const w of weights) total += Number.isFinite(w) && w > 0 ? w : 0;
  const units: number[] = new Array(n);
  const remainders: number[] = new Array(n);
  let assigned = 0;
  for (let i = 0; i < n; i++) {
    const w = weights[i];
    const exact = total > 0 ? ((Number.isFinite(w) && w > 0 ? w : 0) / total) * unit : unit / n;
    units[i] = Math.floor(exact);
    remainders[i] = exact - units[i];
    assigned += units[i];
  }
  // Hand the leftover units to the largest remainders (ties go to the earlier entry).
  for (let leftover = unit - assigned; leftover > 0; leftover--) {
    let best = 0;
    for (let i = 1; i < n; i++) if (remainders[i] > remainders[best]) best = i;
    units[best] += 1;
    remainders[best] = -1;
  }
  return units.map((value) => value / unit);
}

/** Rounds follower-like counts to a precision that looks natural for their size. */
export function roundCount(value: number): number {
  if (value < 1_000) return Math.round(value);
  if (value < 10_000) return roundTo(value, 10);
  if (value < 100_000) return roundTo(value, 100);
  if (value < 1_000_000) return roundTo(value, 1_000);
  return roundTo(value, 10_000);
}

/** Rupee fees are quoted in round numbers: nearest ₹500, never below ₹500. */
export function roundFee(value: number): number {
  return Math.max(500, roundTo(value, 500));
}
