/**
 * Deterministic PRNG (mulberry32). Problems are generated from a seed so the
 * server can regenerate exactly what the learner saw and grade it.
 */
export interface Rng {
  next(): number;
  int(min: number, max: number): number;
  nonZero(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
  chance(p: number): boolean;
  sign(): 1 | -1;
}

export const createRng = (seed: number): Rng => {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min;
  const rng: Rng = {
    next,
    int,
    nonZero: (min, max) => {
      for (;;) {
        const n = int(min, max);
        if (n !== 0) return n;
      }
    },
    pick: (items) => {
      if (items.length === 0) throw new Error("pick from empty list");
      return items[Math.floor(next() * items.length)] as (typeof items)[number];
    },
    shuffle: (items) => {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
      }
      return out;
    },
    chance: (p) => next() < p,
    sign: () => (next() < 0.5 ? -1 : 1),
  };
  return rng;
};

export const randomSeed = () => Math.floor(Math.random() * 2 ** 31);
