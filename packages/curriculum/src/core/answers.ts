import { gcd } from "./math";
import type { Answer } from "./types";

/**
 * Safe arithmetic evaluator for learner input. Supports + - * / ^, parentheses,
 * implicit multiplication (2sqrt(3), 3pi, 2(4)), sqrt/√, pi/π, mixed numbers (1 1/2)
 * and a trailing %. Never uses eval.
 */
export const evaluate = (raw: string): number | null => {
  const src = normalize(raw);
  if (src === "") return null;
  const tokens = tokenize(src);
  if (!tokens) return null;
  let i = 0;
  const peek = () => tokens[i];
  const take = () => tokens[i++];

  const startsFactor = (t: Token | undefined) =>
    !!t && (t.type === "num" || t.type === "ident" || (t.type === "op" && (t.value === "(" || t.value === "√")));

  const parseExpr = (): number => {
    let v = parseTerm();
    for (;;) {
      const t = peek();
      if (t?.type === "op" && (t.value === "+" || t.value === "-")) {
        take();
        const r = parseTerm();
        v = t.value === "+" ? v + r : v - r;
      } else return v;
    }
  };
  const parseTerm = (): number => {
    let v = parseUnary();
    for (;;) {
      const t = peek();
      if (t?.type === "op" && (t.value === "*" || t.value === "/")) {
        take();
        const r = parseUnary();
        v = t.value === "*" ? v * r : v / r;
      } else if (startsFactor(t)) {
        v *= parsePower();
      } else return v;
    }
  };
  const parseUnary = (): number => {
    const t = peek();
    if (t?.type === "op" && (t.value === "-" || t.value === "+")) {
      take();
      const v = parseUnary();
      return t.value === "-" ? -v : v;
    }
    return parsePower();
  };
  const parsePower = (): number => {
    const base = parseAtom();
    const t = peek();
    if (t?.type === "op" && t.value === "^") {
      take();
      return base ** parseUnary();
    }
    return base;
  };
  const parseAtom = (): number => {
    const t = take();
    if (!t) throw new Error("unexpected end");
    if (t.type === "num") return t.value;
    if (t.type === "ident") {
      if (t.value === "pi") return Math.PI;
      if (t.value === "e") return Math.E;
      if (t.value === "sqrt") return Math.sqrt(parsePower());
      throw new Error(`unknown ${t.value}`);
    }
    if (t.value === "√") return Math.sqrt(parsePower());
    if (t.value === "(") {
      const v = parseExpr();
      const close = take();
      if (close?.type !== "op" || close.value !== ")") throw new Error("missing )");
      return v;
    }
    throw new Error(`unexpected ${t.value}`);
  };

  try {
    const v = parseExpr();
    if (i !== tokens.length) return null;
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
};

type Token = { type: "num"; value: number } | { type: "op"; value: string } | { type: "ident"; value: string };

const normalize = (raw: string) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/[−–—]/g, "-")
    .replace(/[×·]/g, "*")
    .replace(/÷/g, "/")
    .replace(/π/g, "pi")
    .replace(/,(?=\d{3}\b)/g, "") // 1,000 → 1000
    .replace(/^[a-z]\s*=\s*/, "") // x = 4 → 4
    .replace(/\s*(degrees|degree|deg|°)$/, "");

const tokenize = (src: string): Token[] | null => {
  const out: Token[] = [];
  let i = 0;
  // Mixed number "1 1/2" → (1+1/2), only when it is the whole input.
  const mixed = /^(-?)(\d+)\s+(\d+)\/(\d+)$/.exec(src);
  if (mixed) {
    const [, s, w, n, d] = mixed;
    const v = Number(w) + Number(n) / Number(d);
    return [{ type: "num", value: s === "-" ? -v : v }];
  }
  while (i < src.length) {
    const c = src[i]!;
    if (c === " ") {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      const m = /^\d*\.?\d+(e[+-]?\d+)?|^\d+\.?/.exec(src.slice(i));
      if (!m) return null;
      out.push({ type: "num", value: Number(m[0]) });
      i += m[0].length;
      if (src[i] === "%") {
        const last = out[out.length - 1] as { type: "num"; value: number };
        last.value /= 100;
        i++;
      }
      continue;
    }
    if ("+-*/^()√".includes(c)) {
      out.push({ type: "op", value: c });
      i++;
      continue;
    }
    const id = /^(sqrt|pi|e)/.exec(src.slice(i));
    if (id) {
      out.push({ type: "ident", value: id[0] });
      i += id[0].length;
      continue;
    }
    return null;
  }
  return out;
};

const close = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

const splitList = (raw: string) =>
  raw
    .replace(/^\s*\(|\)\s*$/g, "")
    .split(/[,;]|\band\b|\bor\b/)
    .map((s) => s.trim())
    .filter(Boolean);

/** A fraction typed in lowest terms (or not a fraction at all). */
const inSimplestForm = (raw: string) => {
  const m = /^\s*-?\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(normalize(raw));
  if (!m) return true;
  return gcd(Number(m[1]), Number(m[2])) === 1;
};

export type CheckResult = { correct: boolean; feedback?: string };

export const checkAnswer = (answer: Answer, raw: string): CheckResult => {
  switch (answer.kind) {
    case "choice":
      return { correct: Number(raw) === answer.correct };
    case "number": {
      const isPercentAnswer = answer.unit === "%";
      const cleaned = isPercentAnswer ? raw.replace(/%\s*$/, "") : raw;
      const v = evaluate(cleaned);
      if (v === null) return { correct: false, feedback: "We couldn't read that as a number." };
      const ok = close(v, answer.value, answer.tolerance ?? 1e-6);
      if (ok && answer.requireSimplest && !inSimplestForm(raw))
        return { correct: false, feedback: "Right value — now simplify it fully." };
      return { correct: ok };
    }
    case "set":
    case "tuple": {
      const parts = splitList(raw).map(evaluate);
      if (parts.some((p) => p === null)) return { correct: false, feedback: "Separate values with commas, e.g. 2, -3" };
      const vals = parts as number[];
      if (vals.length !== answer.values.length)
        return { correct: false, feedback: `Expected ${answer.values.length} value${answer.values.length === 1 ? "" : "s"}.` };
      const tol = answer.tolerance ?? 1e-6;
      if (answer.kind === "tuple") return { correct: vals.every((v, i) => close(v, answer.values[i]!, tol)) };
      const remaining = [...answer.values];
      for (const v of vals) {
        const idx = remaining.findIndex((r) => close(v, r, tol));
        if (idx < 0) return { correct: false };
        remaining.splice(idx, 1);
      }
      return { correct: true };
    }
  }
};

/** Human-readable correct answer, used on reveal. */
export const formatAnswer = (answer: Answer, choices?: string[]) => {
  const fmt = (x: number) => `${Math.round(x * 1e6) / 1e6}`;
  switch (answer.kind) {
    case "choice":
      return choices?.[answer.correct] ?? "";
    case "number":
      return `${fmt(answer.value)}${answer.unit ? (answer.unit === "%" ? "%" : ` ${answer.unit}`) : ""}`;
    case "set":
      return answer.values.map(fmt).join(", ");
    case "tuple":
      return `(${answer.values.map(fmt).join(", ")})`;
  }
};
