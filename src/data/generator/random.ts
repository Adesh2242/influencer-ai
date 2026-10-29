// Deterministic randomness for the demo dataset. mulberry32 only uses 32-bit integer arithmetic, so a
// seed produces the same sequence in every JavaScript engine: the server and every browser agree.

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 32-bit FNV-1a hash, used to derive stable sub-seeds such as `${seed}:creator:17`. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const SQRT3 = Math.sqrt(3);

export class Rng {
  private readonly source: () => number;

  constructor(seed: number) {
    this.source = mulberry32(seed);
  }

  /** An independent stream for one purpose, so changing one part of the generator leaves the others intact. */
  static derive(seed: number, label: string): Rng {
    return new Rng(hashString(`${seed}:${label}`));
  }

  /** Uniform float in [0, 1). */
  next(): number {
    return this.source();
  }

  /** Uniform float in [min, max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.source();
  }

  /** Uniform integer in [min, max], both inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.source() * (max - min + 1));
  }

  chance(probability: number): boolean {
    return this.source() < probability;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("Rng.pick() needs at least one item");
    return items[Math.floor(this.source() * items.length)];
  }

  /** Picks one item with probability proportional to its weight. Non-positive weights never win. */
  weighted<T>(items: readonly T[], weightOf: (item: T) => number): T {
    const [item] = this.weightedSample(items, 1, weightOf);
    if (item === undefined) throw new Error("Rng.weighted() needs at least one item");
    return item;
  }

  /** Up to `count` distinct items, each draw proportional to weight (see weightedIndices). */
  weightedSample<T>(items: readonly T[], count: number, weightOf: (item: T) => number): T[] {
    const weights = new Float64Array(items.length);
    for (let i = 0; i < items.length; i++) weights[i] = weightOf(items[i]);
    return this.weightedIndices(weights, count).map((index) => items[index]);
  }

  /**
   * Up to `count` distinct indices, each draw proportional to `weights[i]` (the array is not modified).
   * Once only zero-weight entries are left, the rest are drawn uniformly. Typed arrays and plain loops
   * keep this cheap: it runs thousands of times while the dataset is generated at page load.
   */
  weightedIndices(source: ArrayLike<number>, count: number): number[] {
    const n = source.length;
    const weights = new Float64Array(n);
    let total = 0;
    for (let i = 0; i < n; i++) {
      const weight = source[i];
      weights[i] = weight > 0 ? weight : 0;
      total += weights[i];
    }
    const taken = new Uint8Array(n);
    const target = Math.min(Math.max(0, count), n);
    const picked: number[] = [];
    while (picked.length < target) {
      let index = -1;
      if (total > 1e-12) {
        let remaining = this.source() * total;
        for (let i = 0; i < n; i++) {
          if (weights[i] <= 0) continue;
          remaining -= weights[i];
          if (remaining < 0) {
            index = i;
            break;
          }
        }
        if (index === -1) for (let i = n - 1; i >= 0 && index === -1; i--) if (weights[i] > 0) index = i;
      }
      if (index === -1) {
        let open = 0;
        for (let i = 0; i < n; i++) if (!taken[i]) open++;
        let skip = Math.floor(this.source() * open);
        for (let i = 0; i < n; i++) {
          if (taken[i]) continue;
          if (skip-- === 0) {
            index = i;
            break;
          }
        }
      }
      picked.push(index);
      taken[index] = 1;
      total -= weights[index];
      weights[index] = 0;
    }
    return picked;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.source() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  sample<T>(items: readonly T[], count: number): T[] {
    return this.shuffle(items).slice(0, Math.max(0, count));
  }

  /**
   * Approximately normal (Irwin-Hall: the sum of four uniforms, rescaled to unit variance). Plain
   * arithmetic keeps it identical across engines, unlike Box-Muller's log and cos.
   */
  normal(mean = 0, sd = 1): number {
    const sum = this.source() + this.source() + this.source() + this.source();
    return mean + (sum - 2) * SQRT3 * sd;
  }

  /** Log-uniform in [min, max). skew > 1 favours the low end, as follower counts do. */
  logUniform(min: number, max: number, skew = 1): number {
    return min * Math.pow(max / min, Math.pow(this.source(), skew));
  }

  /** Multiplies `value` by a log-normal factor; spread 0.2 is roughly ±20%. */
  jitter(value: number, spread: number): number {
    return value * Math.exp(this.normal(0, spread));
  }
}
