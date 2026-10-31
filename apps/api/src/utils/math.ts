export const clamp = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));

export const mean = (xs: readonly number[]) => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

export const round = (x: number, dp = 3) => {
  const f = 10 ** dp;
  return Math.round(x * f) / f;
};
