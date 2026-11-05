import katex from "katex";
import { describe, expect, it } from "vitest";
import { courses, generateProblem, type Answer, type Level, type Problem } from "../src";

/** Every piece of TeX in a problem's working: step displays and $…$ spans in the text. */
const texIn = (p: Problem) => p.solution.flatMap((s) => [...(s.tex ? [s.tex] : []), ...[...s.md.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]!)]);

/** Ways an answer might be written in the working: 0.75, 3/4, \frac{3}{4}, 2\sqrt{3}, 4\pi, … */
const spellings = (v: number): string[] => {
  const out = [`${Math.round(v * 1e9) / 1e9}`, v.toFixed(2), `${Math.round(v * 100) / 100}`, `${Math.round(v * 10) / 10}`, `${Math.round(v)}`];
  const rational = (x: number) => {
    for (let d = 1; d <= 2000; d++) {
      const n = Math.round(x * d);
      if (Math.abs(n / d - x) < 1e-9) return [n, d] as const;
    }
    return null;
  };
  const q = rational(v);
  if (q) out.push(`\\frac{${Math.abs(q[0])}}{${q[1]}}`, `${Math.abs(q[0])}/${q[1]}`, `${Math.floor(Math.abs(q[0]) / q[1])}\\frac{${Math.abs(q[0]) % q[1]}}{${q[1]}}`);
  const qp = rational(v / Math.PI);
  if (qp) out.push("\\pi");
  for (const k of [2, 3, 5, 6, 7]) if (rational(v / Math.sqrt(k))) out.push(`\\sqrt{${k}}`, `\\sqrt${k}`);
  return out.map((s) => s.replace(/^-/, ""));
};

const squash = (s: string) => s.toLowerCase().replace(/\$|\s|\\[,;!]|\\quad|\\left|\\right/g, "").replace(/\\[dt]frac/g, "\\frac");

const endsAtAnswer = (p: Problem) => {
  const last = p.solution.at(-1)!;
  const text = squash(`${last.md} ${last.tex ?? ""}`);
  const a: Answer = p.answer;
  if (a.kind === "choice") return text.includes(squash(p.choices![a.correct]!));
  const values = a.kind === "number" ? [a.value] : a.values;
  if (/\\ln|e\^/.test(text)) return true; // exact log/exp answers are checked by hand
  return values.every((v) => spellings(v).some((s) => text.includes(squash(s))));
};

/** Seeds per level; raise it (SOLUTION_SEEDS=2000) for a deeper sweep of rare branches. */
const SEEDS = Number(process.env.SOLUTION_SEEDS ?? 60);

describe("worked solutions", () => {
  for (const course of courses)
    for (const unit of course.units)
      for (const ex of unit.exercises)
        it(`${ex.id}: works step by step to the answer`, () => {
          for (const level of [1, 2, 3] as Level[])
            for (let seed = 1; seed <= SEEDS; seed++) {
              const p = generateProblem({ exercise: ex, unit, course, order: 0 }, seed * 104729 + level, level);
              const id = `${ex.id} L${level} seed ${seed * 104729 + level}`;
              const all = p.solution.map((s) => `${s.md} ${s.tex ?? ""}`).join(" | ");
              expect(p.solution.length, `${id}: ${all}`).toBeGreaterThanOrEqual(2);
              expect(all, id).not.toMatch(/undefined|NaN|Infinity|\[object|\$\{|\\\$/);
              // A TeX command in a plain template string loses its backslash: \times becomes a tab, \frac a form feed.
              expect(all, `${id}: ${JSON.stringify(all)}`).not.toMatch(/[\t\f\v\b\r\n]/);
              // Signs glued together, like "+ -3", "- -3" or "+ +".
              expect(all, id).not.toMatch(/[+-]\s*-\s*\d|\+\s*\+|-\s*\+\s*\d/);
              expect(endsAtAnswer(p), `${id} doesn't end at its answer: ${all}`).toBe(true);
              for (const tex of texIn(p)) {
                expect(() => katex.renderToString(tex, { throwOnError: true, strict: "ignore" }), `${id}: ${tex}`).not.toThrow();
                // A command that lost its backslash still renders, as a stray word: "x = 3 ;Rightarrow".
                const bare = tex.replace(/\\text\{[^}]*\}/g, "").match(/(?<![\\a-zA-Z])(frac|tfrac|dfrac|times|cdot|sqrt|Rightarrow|quad|qquad|left|right|infty|div|pm|checkmark|begin|end|hline|circ|le|ge|ne|dots|approx|cup|binom|sum|lim|log|ln|sin|cos|tan|theta|pi|Delta|to)(?![a-zA-Z])/);
                expect(bare?.[0], `${id}: TeX command without its backslash in ${tex}`).toBeUndefined();
                // An unescaped % starts a TeX comment and silently hides the rest of the line.
                expect(tex, `${id}: unescaped % in ${tex}`).not.toMatch(/(?<!\\)%/);
              }
            }
        });
});
