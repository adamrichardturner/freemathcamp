import { example, key, math, multipleChoice, numberAnswer, rule, step, text, visual } from "../../../core/builders";
import { factor, linear, paren, poly, quadratic, round, signed, texFrac } from "../../../core/math";
import type { Unit } from "../../../core/types";
import { lines, substitute } from "../../../core/working";
import { rationalisedLimit } from "./polynomials";

const r = String.raw;

export const calculusReady: Unit = {
  id: "calculus-ready",
  title: "Ready for Calculus",
  icon: "Infinity",
  description: "The difference quotient and limits: the two ideas every calculus course is built on.",
  exercises: [
    {
      id: "difference-quotient",
      title: "The Difference Quotient",
      summary: "The slope formula that becomes the derivative.",
      prerequisites: ["average-rate-of-change", "multiplying-polynomials", "rational-operations"],
      estimatedMinutes: 12,
      expectedSeconds: 75,
      keyIdeas: [
        "$\\dfrac{f(x + h) - f(x)}{h}$ is the slope of the secant from $x$ to $x + h$.",
        "Expand, cancel, then divide by $h$.",
        "Let $h$ shrink to 0 and you get the derivative: for $x^2$, $2x + h \\to 2x$.",
      ],
      lesson: [
        text("The average rate of change uses two fixed points. The **difference quotient** keeps one point at $x$ and puts the other a small step $h$ away, so we can study what happens as that step shrinks."),
        rule("Difference quotient", r`\frac{f(x + h) - f(x)}{h}`),
        example("Simplify the difference quotient for $f(x) = x^2$.", [
          ["Substitute.", r`\frac{(x + h)^2 - x^2}{h}`],
          ["Expand the top.", r`\frac{x^2 + 2xh + h^2 - x^2}{h} = \frac{2xh + h^2}{h}`],
          ["Divide by $h$.", r`2x + h`],
        ]),
        visual(
          {
            type: "functionPlot",
            functions: [{ fn: (x) => x * x }, { fn: (x) => 1 + 3 * (x - 1), tone: "accent", dashed: true }, { fn: (x) => 1 + 2 * (x - 1), tone: "success" }],
            points: [{ x: 1, y: 1, label: "(1, 1)" }, { x: 2, y: 4, label: "(2, 4)" }],
            viewBox: { x: [-1, 3.5], y: [-1, 7] },
          },
          "From $x = 1$ with $h = 1$, the secant (dashed) has slope $2(1) + 1 = 3$. As $h \\to 0$ it turns into the tangent (solid), with slope $2$.",
        ),
        key("$f'(x) = \\displaystyle\\lim_{h \\to 0} \\frac{f(x + h) - f(x)}{h}$ is the definition of the derivative. Every calculus course starts here."),
      ],
      generate: (rng, level) => {
        const a = level === 1 ? 1 : rng.nonZero(-3, 3), b = level === 1 ? 0 : rng.int(-5, 5), c = rng.int(-6, 6);
        const f = quadratic(a, b, c);
        if (level === 3) {
          const correct = poly([[2 * a, "x"], [a, "h"], [b, ""]]);
          return {
            prompt: `Simplify the difference quotient $\\dfrac{f(x + h) - f(x)}{h}$ for $f(x) = ${f}$.`,
            ...multipleChoice(rng, `$${correct}$`, [`$${poly([[2 * a, "x"], [b, ""]])}$`, `$${poly([[a, "x"], [a, "h"], [b, ""]])}$`, `$${poly([[2 * a, "x"], [a, "h^2"], [b, ""]])}$`]),
            hints: ["Expand f(x + h), then subtract f(x): every term without an h cancels.", "Every remaining term has a factor of h, so divide it out."],
            solution: [
              step(
                "Find $f(x + h)$: replace every $x$ with $(x + h)$, then expand.",
                lines(
                  r`f(x + h) &= ${a === 1 ? "" : a === -1 ? "-" : a}(x + h)^2${b === 0 ? "" : ` ${b < 0 ? "-" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}(x + h)`}${c === 0 ? "" : signed(c)}`,
                  r`&= ${poly([[a, "x^2"], [2 * a, "xh"], [a, "h^2"], [b, "x"], [b, "h"], [c, ""]])}`,
                ),
              ),
              step(`Subtract $f(x) = ${f}$. Every term without an $h$ cancels.`, r`f(x + h) - f(x) = ${poly([[2 * a, "xh"], [a, "h^2"], [b, "h"]])}`),
              step(
                `Every remaining term has a factor of $h$, so divide it out. (As $h \\to 0$ this becomes $${poly([[2 * a, "x"], [b, ""]])}$: the derivative.)`,
                r`\frac{${poly([[2 * a, "xh"], [a, "h^2"], [b, "h"]])}}{h} = ${correct}`,
              ),
            ],
          };
        }
        const x0 = rng.int(-3, 4), h = rng.pick([1, 2, 0.5, 0.1]);
        const fx = (x: number) => a * x * x + b * x + c;
        const terms: [number, number][] = [[a, 2], [b, 1], [c, 0]];
        const value = round(a * (2 * x0 + h) + b, 8);
        return {
          prompt: `For $f(x) = ${f}$, evaluate $\\dfrac{f(x + h) - f(x)}{h}$ at $x = ${x0}$ and $h = ${h}$.`,
          answer: numberAnswer(value),
          hints: [`Find f(${round(x0 + h, 6)}) and f(${x0}).`, `Subtract, then divide by ${h}.`],
          solution: [
            step(`Here $x + h = ${x0} + ${h} = ${round(x0 + h, 6)}$. Find $f$ there, and at $x = ${x0}$.`, lines(...[substitute(`f(${round(x0 + h, 6)})`, terms, round(x0 + h, 6)).tex, substitute(`f(${x0})`, terms, x0).tex].map((t) => t.replace(/\\(begin|end)\{aligned\}/g, "")))),
            step("Subtract to get the change in $f$.", r`f(${round(x0 + h, 6)}) - f(${x0}) = ${round(fx(x0 + h), 6)} - ${paren(fx(x0))} = ${round(fx(x0 + h) - fx(x0), 6)}`),
            step(`Divide by $h = ${h}$.`, r`\frac{${round(fx(x0 + h) - fx(x0), 6)}}{${h}} = ${value}`),
          ],
        };
      },
    },
    {
      id: "limits-intro",
      title: "Limits: Approaching a Value",
      summary: "What a function heads towards, even where it isn't defined.",
      prerequisites: ["difference-quotient", "rational-functions", "piecewise-functions", "rationalizing"],
      estimatedMinutes: 14,
      expectedSeconds: 70,
      keyIdeas: [
        "$\\lim_{x\\to a} f(x) = L$ means $f(x)$ gets as close to $L$ as we like when $x$ is close enough to $a$ (but not equal to it).",
        "Try direct substitution first. If you get $\\frac00$, factor and cancel (or rationalise), then substitute.",
        "At infinity only the leading terms matter: $\\lim_{x\\to\\infty}\\frac{3x^2 + 1}{x^2 - 5} = 3$.",
      ],
      lesson: [
        text("$f(x) = \\dfrac{x^2 - 4}{x - 2}$ isn't defined at $x = 2$, where it gives $\\frac00$. But try values *near* 2:"),
        math(r`\begin{array}{c|ccc|ccc} x & 1.9 & 1.99 & 1.999 & 2.001 & 2.01 & 2.1 \\ \hline f(x) & 3.9 & 3.99 & 3.999 & 4.001 & 4.01 & 4.1 \end{array}`),
        text("From both sides the outputs head towards 4, so we write $\\lim_{x \\to 2} \\frac{x^2 - 4}{x - 2} = 4$. A limit describes where a function is *going*, not where it is."),
        visual(
          { type: "functionPlot", functions: [{ fn: (x) => (Math.abs(x - 2) < 0.03 ? NaN : x + 2) }], points: [{ x: 2, y: 4, label: "hole at (2, 4)", tone: "warning", open: true }], viewBox: { x: [-3, 5], y: [-1, 8] } },
          "The graph is the line $y = x + 2$ with one point missing. The limit fills in the hole.",
        ),
        rule("Strategy", r`\text{substitute} \;\to\; \tfrac{0}{0}? \;\to\; \text{factor, cancel, substitute}`),
        example("Find $\\lim_{x\\to 3}\\dfrac{x^2 - x - 6}{x - 3}$.", [["Substitution gives $\\frac00$, so factor.", r`\frac{(x - 3)(x + 2)}{x - 3} = x + 2`], ["Now substitute.", r`3 + 2 = 5`]]),
        rule("Limits at infinity", r`\lim_{x\to\infty} \frac{1}{x} = 0, \qquad \lim_{x\to\infty} \frac{ax^n + \dots}{bx^n + \dots} = \frac{a}{b}`),
        key("You're ready for calculus. The derivative is $\\lim_{h\\to0}\\frac{f(x + h) - f(x)}{h}$, and the integral is a limit of sums. Both are built from this one idea."),
      ],
      generate: (rng, level) => {
        if (level === 1) {
          const a = rng.int(-4, 4), p = rng.nonZero(-3, 3), q = rng.int(-6, 6), s = rng.int(-9, 9);
          const value = p * a * a + q * a + s;
          return {
            prompt: `Find the limit.`,
            tex: r`\lim_{x \to ${a}} \left(${quadratic(p, q, s)}\right)`,
            answer: numberAnswer(value),
            hints: ["Polynomials have no gaps or jumps, so you can substitute directly."],
            solution: [
              step("A polynomial has no gaps or jumps, so the limit is just its value at that point. Substitute directly."),
              step(`Put $x = ${a}$.`, substitute(r`\lim_{x \to ${a}} \left(${quadratic(p, q, s)}\right)`, [[p, 2], [q, 1], [s, 0]], a).tex),
            ],
          };
        }
        if (level === 2) {
          const a = rng.nonZero(-5, 5);
          let s = rng.int(-6, 6);
          while (s === a) s = rng.int(-6, 6);
          return {
            prompt: "Find the limit.",
            tex: r`\lim_{x \to ${a}} \frac{${quadratic(1, -(a + s), a * s)}}{${linear(1, -a)}}`,
            answer: numberAnswer(a - s),
            hints: ["Substituting gives 0/0, so factor the top.", `One factor of the top is ${factor(a)}.`],
            solution: [
              step(`Putting in $x = ${a}$ gives $\\frac{0}{0}$, which tells you nothing. That means $${factor(a)}$ is a factor of the top.`),
              step(`Factor the top: $${-a}$ and $${-s}$ multiply to $${a * s}$ and add to $${-(a + s)}$.`, r`\frac{${quadratic(1, -(a + s), a * s)}}{${linear(1, -a)}} = \frac{${factor(a)}${factor(s)}}{${factor(a)}}`),
              step(`Cancel $${factor(a)}$. A limit only cares about $x$ near $${a}$, never at it, so this is allowed.`, linear(1, -s)),
              step(`Now substitute $x = ${a}$.`, `${a} ${s < 0 ? "+" : "-"} ${Math.abs(s)} = ${a - s}`),
            ],
          };
        }
        const kind = rng.int(0, 2);
        if (kind === 0) {
          const p = rng.nonZero(-6, 6), d = rng.int(1, 5), lower = rng.chance(0.3);
          const top = lower ? linear(p, rng.int(-9, 9)) : quadratic(p, rng.int(-5, 5), rng.int(-9, 9));
          return {
            prompt: "Find the limit.",
            tex: r`\lim_{x \to \infty} \frac{${top}}{${quadratic(d, rng.int(-5, 5), rng.int(1, 9))}}`,
            answer: numberAnswer(lower ? 0 : p / d),
            inputHint: "e.g. 3/2",
            hints: ["For huge x, only the highest powers matter.", lower ? "The bottom grows faster than the top." : "Divide the leading coefficients."],
            solution: [
              step(`For huge $x$, only the highest power on the top and on the bottom matters: $${lower ? linear(p, 0) : poly([[p, "x^2"]])}$ over $${poly([[d, "x^2"]])}$.`),
              lower
                ? step(`That's like $\\frac{${p}}{${d === 1 ? "" : d}x}$, which shrinks to $0$ as $x$ grows.`, "0")
                : step("The $x^2$ cancels, leaving the ratio of the leading coefficients.", r`\frac{${p}}{${d}}${texFrac(p, d) === r`\frac{${p}}{${d}}` ? "" : ` = ${texFrac(p, d)}`}`),
            ],
          };
        }
        if (kind === 1) {
          const c = rng.int(1, 5);
          return {
            prompt: "Find the limit.",
            tex: r`\lim_{x \to 0} \frac{\sqrt{x + ${c * c}} - ${c}}{x}`,
            answer: numberAnswer(1 / (2 * c)),
            inputHint: "e.g. 1/6",
            hints: ["Substitution gives 0/0. Rationalise the numerator.", `Multiply the top and bottom by √(x + ${c * c}) + ${c}.`],
            solution: rationalisedLimit(c),
          };
        }
        const x0 = rng.nonZero(-4, 5);
        return {
          prompt: "Find the limit. (It's the slope of $y = x^2$ at one point.)",
          tex: r`\lim_{h \to 0} \frac{(${x0} + h)^2 - ${paren(x0)}^2}{h}`,
          answer: numberAnswer(2 * x0),
          hints: ["Expand the top. The terms without h cancel.", "Divide by h, then let h go to 0."],
          solution: [
            step("Expand the square on top. The plain numbers cancel.", r`(${x0} + h)^2 - ${paren(x0)}^2 = ${x0 * x0} ${2 * x0 < 0 ? "-" : "+"} ${Math.abs(2 * x0)}h + h^2 - ${x0 * x0} = ${2 * x0}h + h^2`),
            step("Divide every term by $h$.", r`\frac{${2 * x0}h + h^2}{h} = ${2 * x0} + h`),
            step(`As $h \\to 0$, the $h$ disappears. That's the slope of $y = x^2$ at $x = ${x0}$.`, `${2 * x0}`),
          ],
        };
      },
    },
  ],
};
