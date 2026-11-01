/** Number-theory helpers and TeX formatting utilities shared by every generator. */

export const gcd = (a: number, b: number): number => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
};

export const lcm = (a: number, b: number) => Math.abs(a * b) / gcd(a, b);

export const primeFactors = (n: number): number[] => {
  const out: number[] = [];
  let m = Math.abs(n);
  for (let p = 2; p * p <= m; p++) {
    while (m % p === 0) {
      out.push(p);
      m /= p;
    }
  }
  if (m > 1) out.push(m);
  return out;
};

export const isPrime = (n: number) => n > 1 && primeFactors(n).length === 1;

export const round = (x: number, dp = 2) => {
  const f = 10 ** dp;
  return Math.round(x * f) / f;
};

/** Reduced fraction with the sign carried on the numerator. */
export const reduce = (n: number, d: number): [number, number] => {
  if (d === 0) throw new Error("zero denominator");
  const g = gcd(n, d) || 1;
  const s = d < 0 ? -1 : 1;
  return [(s * n) / g, (s * d) / g];
};

/** TeX for n/d, reduced; whole numbers collapse to integers. */
export const texFrac = (n: number, d: number, reduceIt = true): string => {
  const [a, b] = reduceIt ? reduce(n, d) : [n, d];
  if (b === 1) return `${a}`;
  return a < 0 ? `-\\frac{${-a}}{${b}}` : `\\frac{${a}}{${b}}`;
};

/** Plain text fraction (what a learner would type). */
export const textFrac = (n: number, d: number) => {
  const [a, b] = reduce(n, d);
  return b === 1 ? `${a}` : `${a}/${b}`;
};

/** Formats a number for TeX, using a proper minus and trimming float noise. */
export const num = (x: number) => {
  const r = Math.round(x * 1e9) / 1e9;
  return `${r}`;
};

/** Wraps negatives in parentheses: (-3). */
export const paren = (x: number) => (x < 0 ? `(${num(x)})` : num(x));

/** Coefficient display for a term: 1x → x, -1x → -x. */
const coef = (c: number, variable: string) => {
  if (variable === "") return num(Math.abs(c));
  const a = Math.abs(c);
  return a === 1 ? variable : `${num(a)}${variable}`;
};

/**
 * Builds a TeX polynomial from [coefficient, variable-part] terms,
 * dropping zeros and handling signs: poly([[2,'x^2'],[-3,'x'],[1,'']]) → 2x^2 - 3x + 1
 */
export const poly = (terms: [number, string][]): string => {
  const parts = terms.filter(([c]) => c !== 0);
  if (parts.length === 0) return "0";
  return parts
    .map(([c, v], i) => {
      const body = coef(c, v);
      if (i === 0) return c < 0 ? `-${body}` : body;
      return c < 0 ? ` - ${body}` : ` + ${body}`;
    })
    .join("");
};

/** ax + b */
export const linear = (a: number, b: number, v = "x") => poly([[a, v], [b, ""]]);

/** ax^2 + bx + c */
export const quadratic = (a: number, b: number, c: number, v = "x") =>
  poly([
    [a, `${v}^2`],
    [b, v],
    [c, ""],
  ]);

/** " + 3" or " - 3" for appending a constant. */
export const signed = (x: number) => (x < 0 ? ` - ${num(-x)}` : ` + ${num(x)}`);

/** Interval notation; null is an infinite end. interval(-2, null, true) → [-2, \infty) */
export const interval = (lo: number | null, hi: number | null, incLo = false, incHi = false) =>
  `${lo === null ? "(-\\infty" : `${incLo ? "[" : "("}${num(lo)}`}, ${hi === null ? "\\infty)" : `${num(hi)}${incHi ? "]" : ")"}`}`;

/** Binomial coefficient n choose k. */
export const choose = (n: number, k: number): number => (k < 0 || k > n ? 0 : k === 0 || k === n ? 1 : (choose(n - 1, k - 1) * n) / k);

/** (x - r) factor display. */
export const factor = (r: number, v = "x") => (r === 0 ? v : r > 0 ? `(${v} - ${r})` : `(${v} + ${-r})`);

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export const formatThousands = (n: number) => n.toLocaleString("en-US");

/** Superscript-friendly prime factorisation in TeX: 2^3 \cdot 3 */
export const texPrimeFactorization = (n: number) => {
  const counts = new Map<number, number>();
  for (const p of primeFactors(n)) counts.set(p, (counts.get(p) ?? 0) + 1);
  return [...counts.entries()].map(([p, k]) => (k > 1 ? `${p}^{${k}}` : `${p}`)).join(" \\cdot ");
};

/** Simplifies √n into a√b. */
export const simplifyRoot = (n: number): [number, number] => {
  let outside = 1;
  let inside = n;
  for (let f = 2; f * f <= inside; f++) {
    while (inside % (f * f) === 0) {
      outside *= f;
      inside /= f * f;
    }
  }
  return [outside, inside];
};

export const texRoot = (outside: number, inside: number) => {
  if (inside === 1) return `${outside}`;
  return `${outside === 1 ? "" : outside}\\sqrt{${inside}}`;
};

export const DEG = Math.PI / 180;
