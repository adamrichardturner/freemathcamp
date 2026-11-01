import { round } from "./math";
import type { Rng } from "./rng";
import type { Answer, Block, Md, Visual } from "./types";

/** Shuffles a correct option among unique distractors (up to 4 options total). */
export const multipleChoice = (rng: Rng, correct: Md, distractors: Md[]): { choices: Md[]; answer: Answer } => {
  const unique = [...new Set(distractors.filter((d) => d !== correct))].slice(0, 3);
  const choices = rng.shuffle([correct, ...unique]);
  return { choices, answer: { kind: "choice", correct: choices.indexOf(correct) } };
};

export const numberAnswer = (value: number, opts: Omit<Extract<Answer, { kind: "number" }>, "kind" | "value"> = {}): Answer => ({
  kind: "number",
  value,
  ...opts,
});

/** An answer that may be typed rounded to `dp` decimal places, or exactly (e.g. ln(5)/2). */
export const decimalAnswer = (value: number, dp = 2): Answer =>
  numberAnswer(round(value, 8), { tolerance: (0.6 * 10 ** -dp) / Math.max(1, Math.abs(value)) });

/* Lesson block shorthands keep the content files readable. */
export const text = (md: Md): Block => ({ kind: "text", md });
export const heading = (text: string): Block => ({ kind: "heading", text });
export const math = (tex: string, caption?: Md): Block => ({ kind: "math", tex, ...(caption ? { caption } : {}) });
export const key = (md: Md, title = "Key idea"): Block => ({ kind: "callout", tone: "key", title, md });
export const tip = (md: Md, title = "Tip"): Block => ({ kind: "callout", tone: "tip", title, md });
export const warn = (md: Md, title = "Watch out"): Block => ({ kind: "callout", tone: "warning", title, md });
export const info = (md: Md, title?: string): Block => ({ kind: "callout", tone: "info", ...(title ? { title } : {}), md });
export const visual = (v: Visual, caption?: Md): Block => ({ kind: "visual", visual: v, ...(caption ? { caption } : {}) });
export const rule = (name: string, tex: string, md?: Md): Block => ({ kind: "rule", name, tex, ...(md ? { md } : {}) });
export const example = (problem: Md, steps: (Md | [Md, string])[], title?: string): Block => ({
  kind: "example",
  problem,
  ...(title ? { title } : {}),
  steps: steps.map((s) => (Array.isArray(s) ? { md: s[0], tex: s[1] } : { md: s })),
});

/** Solution step helper. */
export const step = (md: Md, tex?: string) => (tex ? { md, tex } : { md });
