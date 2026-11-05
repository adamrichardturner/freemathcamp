import { example, key, math, numberAnswer, rule, step, text, tip, visual } from "../../../core/builders";
import { choose, num, paren, signed, texFrac } from "../../../core/math";
import type { Unit } from "../../../core/types";
import { joinSigned, lines } from "../../../core/working";

/** C(n, k) worked out with the shorter product: n(n−1)…/k! */
const chooseSteps = (n: number, k: number) => {
  const r = Math.min(k, n - k);
  const top = Array.from({ length: r }, (_, i) => n - i), bottom = Array.from({ length: r }, (_, i) => r - i);
  const parts = [String.raw`\binom{${n}}{${k}}`, String.raw`\frac{${n}!}{${k}!\,${n - k}!}`, String.raw`\frac{${top.join(String.raw`\times`)}}{${bottom.join(String.raw`\times`)}}`, String.raw`\frac{${top.reduce((a, b) => a * b, 1)}}{${bottom.reduce((a, b) => a * b, 1)}}`, `${choose(n, k)}`];
  return parts.filter((p, i) => p !== parts[i - 1] && !(i === 3 && r === 1)).join(" = ");
};

const r = String.raw;

export const sequences: Unit = {
  id: "sequences",
  title: "Sequences & Series",
  icon: "ListOrdered",
  description: "Patterns, arithmetic and geometric sequences, and summation — the doorway to limits.",
  exercises: [
    {
      id: "arithmetic-sequences",
      title: "Arithmetic Sequences",
      summary: "Adding the same difference every step.",
      prerequisites: ["slope-intercept", "evaluating-expressions"],
      estimatedMinutes: 8,
      expectedSeconds: 45,
      keyIdeas: ["$a_n = a_1 + (n - 1)d$", "Arithmetic sequences are linear functions on whole numbers."],
      lesson: [
        text("In an **arithmetic sequence** you add the same **common difference** $d$ each time: $5, 8, 11, 14, \\dots$ has $d = 3$."),
        visual({ type: "sequenceBars", terms: [5, 8, 11, 14, 17, 20] }, "Constant steps — the tops line up on a straight line."),
        rule("nth term", r`a_n = a_1 + (n - 1)d`),
        rule("Sum of the first n terms", r`S_n = \frac{n}{2}(a_1 + a_n)`, "Gauss's trick: pair the first and last terms."),
        example("Find the 20th term of $7, 11, 15, \\dots$", [["$a_1 = 7,\\ d = 4$.", r`a_{20} = 7 + 19\cdot4 = 83`]]),
      ],
      generate: (rng, level) => {
        const a1 = rng.int(-10, 15), d = rng.nonZero(-6, 8), n = rng.int(level === 1 ? 5 : 10, level === 1 ? 10 : 50);
        const terms = [0, 1, 2, 3].map((i) => a1 + i * d);
        if (level === 3) {
          const an = a1 + (n - 1) * d;
          return {
            prompt: `Find the sum of the first $${n}$ terms of $${terms.join(", ")}, \\dots$`,
            answer: numberAnswer((n * (a1 + an)) / 2),
            hints: [`Find the ${n}th term first.`, "S = n/2 × (first + last)."],
            solution: [
              step("Find the common difference: subtract any term from the next.", `d = ${terms[1]} - ${paren(terms[0]!)} = ${d}`),
              step(`Find the last term, number $${n}$, with $a_n = a_1 + (n - 1)d$.`, r`a_{${n}} = ${a1} + ${n - 1}\times${paren(d)} = ${a1} + ${paren((n - 1) * d)} = ${an}`),
              step("The sum of an arithmetic series is the number of terms times the average of the first and last.", r`S = \frac{n}{2}(a_1 + a_n) = \frac{${n}}{2}(${a1} + ${paren(an)}) = \frac{${n}}{2}\times${a1 + an} = ${(n * (a1 + an)) / 2}`),
            ],
          };
        }
        return {
          prompt: `Find term number $${n}$ of the sequence $${terms.join(", ")}, \\dots$`,
          visual: level === 1 ? { type: "sequenceBars", terms } : undefined,
          answer: numberAnswer(a1 + (n - 1) * d),
          hints: [`The common difference is ${d}.`, "a_n = a₁ + (n − 1)d"],
          solution: [
            step("Find the common difference: subtract any term from the next.", `d = ${terms[1]} - ${paren(terms[0]!)} = ${d}`),
            step(`To reach term $${n}$ from the first term you add $d$ a total of $${n - 1}$ times.`, r`a_n = a_1 + (n - 1)d`),
            step("Substitute and work it out.", r`a_{${n}} = ${a1} + ${n - 1}\times${paren(d)} = ${a1} + ${paren((n - 1) * d)} = ${a1 + (n - 1) * d}`),
          ],
        };
      },
    },
    {
      id: "geometric-sequences",
      title: "Geometric Sequences",
      summary: "Multiplying by the same ratio every step.",
      prerequisites: ["arithmetic-sequences", "exponential-functions"],
      estimatedMinutes: 9,
      expectedSeconds: 50,
      keyIdeas: ["$a_n = a_1 r^{n-1}$", "If $|r| < 1$, the infinite sum converges: $S_\\infty = \\frac{a_1}{1 - r}$."],
      lesson: [
        text("A **geometric sequence** multiplies by a **common ratio** $r$ each step: $3, 6, 12, 24, \\dots$ has $r = 2$. It's the discrete version of exponential growth."),
        visual({ type: "sequenceBars", terms: [1, 2, 4, 8, 16, 32] }),
        rule("nth term", r`a_n = a_1 \cdot r^{\,n-1}`),
        rule("Infinite sum", r`S_\infty = \frac{a_1}{1 - r}, \quad |r| < 1`, "$1 + \\frac12 + \\frac14 + \\dots = 2$. An infinite sum with a finite answer — your first taste of a **limit**."),
        visual({ type: "sequenceBars", terms: [1, 0.5, 0.25, 0.125, 0.0625, 0.03125] }, "The terms shrink so fast that their total never passes 2."),
        key("This idea — adding infinitely many shrinking pieces — is exactly what calculus formalises."),
      ],
      generate: (rng, level) => {
        // The prompt lists four terms, so ask for one beyond them.
        const a1 = rng.nonZero(-5, 6), ratio = rng.pick(level === 1 ? [2, 3] : [2, 3, -2, 0.5]), n = rng.int(5, level === 1 ? 6 : 8);
        if (level === 3) {
          const a = rng.int(2, 20), rr = rng.pick([0.5, 0.25, 0.2, -0.5, 0.75]);
          return {
            prompt: `Find the sum to infinity of the geometric series with $a_1 = ${a}$ and $r = ${rr}$.`,
            answer: numberAnswer(a / (1 - rr)),
            hints: ["|r| < 1, so the sum converges.", "S = a₁ / (1 − r)"],
            solution: [
              step(`The ratio $r = ${rr}$ is between $-1$ and $1$, so the terms shrink towards $0$ and the sum settles on a finite value.`, r`S_\infty = \frac{a_1}{1 - r}`),
              step("Work out the bottom first, as a fraction.", r`1 - ${paren(rr)} = ${num(1 - rr)} = ${texFrac(Math.round((1 - rr) * 100), 100)}`),
              step("Dividing by a fraction is multiplying by its reciprocal.", r`S_\infty = ${a} \div ${texFrac(Math.round((1 - rr) * 100), 100)} = ${texFrac(a * 100, Math.round((1 - rr) * 100))}`),
            ],
          };
        }
        const terms = [0, 1, 2, 3].map((i) => a1 * ratio ** i);
        return {
          prompt: `Find term number $${n}$ of $${terms.join(", ")}, \\dots$`,
          visual: level === 1 && a1 > 0 ? { type: "sequenceBars", terms } : undefined,
          solutionVisual: level === 1 && a1 > 0 ? { type: "sequenceBars", terms: Array.from({ length: n }, (_, i) => a1 * ratio ** i) } : undefined,
          answer: numberAnswer(a1 * ratio ** (n - 1)),
          hints: [`The common ratio is ${ratio}.`, "a_n = a₁ · r^(n−1)"],
          solution: [
            step("Find the common ratio: divide any term by the one before.", r`r = \frac{${terms[1]}}{${terms[0]}} = ${ratio}`),
            step(`To reach term $${n}$ you multiply the first term by $r$ a total of $${n - 1}$ times.`, r`a_n = a_1\cdot r^{n - 1}`),
            step("Work out the power first.", r`${paren(ratio)}^{${n - 1}} = ${num(ratio ** (n - 1))}`),
            step("Multiply by the first term.", r`a_{${n}} = ${a1}\times${paren(num(ratio ** (n - 1)) as unknown as number)} = ${num(a1 * ratio ** (n - 1))}`),
          ],
        };
      },
    },
    {
      id: "sigma-notation",
      title: "Sigma Notation",
      summary: "Compact notation for sums: $\\sum$.",
      prerequisites: ["arithmetic-sequences"],
      estimatedMinutes: 8,
      expectedSeconds: 55,
      keyIdeas: ["$\\sum_{k=1}^{n} f(k)$: plug in $k = 1, 2, \\dots, n$ and add.", "$\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}$"],
      lesson: [
        text("The Greek letter $\\Sigma$ (sigma) means **sum**. The bottom gives the starting value of the index, the top gives the last value."),
        rule("Sigma notation", r`\sum_{k=1}^{4} (2k + 1) = 3 + 5 + 7 + 9 = 24`),
        rule("Useful sums", r`\sum_{k=1}^{n} k = \frac{n(n+1)}{2} \qquad \sum_{k=1}^{n} c = cn`),
        tip("Sigma notation is everywhere in calculus — integrals are defined as limits of these sums."),
      ],
      generate: (rng, level) => {
        const a = rng.int(1, 5), b = rng.int(-3, 6), n = rng.int(level === 1 ? 3 : 5, level === 1 ? 5 : level === 2 ? 10 : 30);
        const total = (a * n * (n + 1)) / 2 + b * n;
        return {
          prompt: "Evaluate.",
          tex: r`\sum_{k=1}^{${n}} (${a === 1 ? "" : a}k ${b < 0 ? "-" : "+"} ${Math.abs(b)})`,
          answer: numberAnswer(total),
          hints: [level === 1 ? "Write out each term and add them." : "Split it: a·Σk + Σb.", `Σk from 1 to ${n} = ${(n * (n + 1)) / 2}.`],
          solution:
            level === 1
              ? [
                  step(`Put $k = 1, 2, \\dots, ${n}$ into $${a === 1 ? "" : a}k${signed(b)}$ in turn.`, Array.from({ length: n }, (_, i) => a * (i + 1) + b).join(r`,\ `)),
                  step("Add them up.", `${joinSigned(Array.from({ length: n }, (_, i) => a * (i + 1) + b))} = ${total}`),
                ]
              : [
                  step(`Split it into two sums: $${a === 1 ? "" : a}$ lots of $\\sum k$, plus $${b}$ added $${n}$ times.`, r`\sum_{k=1}^{${n}} (${a === 1 ? "" : a}k ${b < 0 ? "-" : "+"} ${Math.abs(b)}) = ${a === 1 ? "" : a}\sum_{k=1}^{${n}} k ${b < 0 ? "-" : "+"} ${Math.abs(b)}\times${n}`),
                  step(`The sum $1 + 2 + \\dots + n$ is $\\frac{n(n + 1)}{2}$.`, r`\sum_{k=1}^{${n}} k = \frac{${n}\times${n + 1}}{2} = ${(n * (n + 1)) / 2}`),
                  step("Put it together.", r`${a}\times${(n * (n + 1)) / 2} ${b < 0 ? "-" : "+"} ${Math.abs(b) * n} = ${(a * n * (n + 1)) / 2} ${b < 0 ? "-" : "+"} ${Math.abs(b) * n} = ${total}`),
                ],
        };
      },
    },
    {
      id: "binomial-theorem",
      title: "The Binomial Theorem",
      summary: "Expanding $(a + b)^n$ with Pascal's triangle.",
      prerequisites: ["sigma-notation", "multiplying-polynomials"],
      estimatedMinutes: 11,
      expectedSeconds: 60,
      keyIdeas: [
        "$\\binom{n}{k} = \\frac{n!}{k!\\,(n - k)!}$ counts the ways to choose $k$ things from $n$.",
        "$(a + b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k$",
        "Row $n$ of Pascal's triangle gives the coefficients of $(a + b)^n$.",
      ],
      lesson: [
        text("Expanding $(x + 2)^5$ by multiplying out five brackets is slow and error-prone. The **binomial theorem** jumps straight to the answer, with coefficients from Pascal's triangle."),
        math(
          r`\begin{array}{c} 1 \\ 1 \quad 1 \\ 1 \quad 2 \quad 1 \\ 1 \quad 3 \quad 3 \quad 1 \\ 1 \quad 4 \quad 6 \quad 4 \quad 1 \end{array}`,
          "Each number is the sum of the two above it. Row $n$ (counting the top row as row 0) gives the coefficients of $(a + b)^n$.",
        ),
        rule("Binomial coefficients", r`\binom{n}{k} = \frac{n!}{k!\,(n - k)!}`, "For example, $\\binom{4}{2} = \\frac{24}{2 \\cdot 2} = 6$."),
        rule("Binomial theorem", r`(a + b)^n = \sum_{k=0}^{n} \binom{n}{k}\, a^{\,n-k}\, b^{\,k}`),
        example("Expand $(x + 2)^3$.", [["Coefficients from row 3: $1, 3, 3, 1$.", r`x^3 + 3x^2(2) + 3x(2)^2 + 2^3`], ["Simplify.", r`x^3 + 6x^2 + 12x + 8`]]),
        key("$(x + h)^n = x^n + nx^{n-1}h + \\dots$, where every later term has $h^2$ or a higher power. That's exactly why the derivative of $x^n$ is $nx^{n-1}$."),
      ],
      generate: (rng, level) => {
        if (level === 1) {
          const n = rng.int(4, 9), k = rng.int(1, n - 1);
          return {
            prompt: "Evaluate.",
            tex: r`\binom{${n}}{${k}}`,
            answer: numberAnswer(choose(n, k)),
            hints: ["n! / (k! (n − k)!)", "Or read it from row n of Pascal's triangle."],
            solution: [
              step(`$\\binom{${n}}{${k}}$ counts the ways to choose $${k}$ things from $${n}$. Most of the factorials cancel, leaving $${Math.min(k, n - k)}$ factors on top and bottom.`, r`\binom{n}{k} = \frac{n!}{k!\,(n - k)!}`),
              step("Cancel and multiply.", chooseSteps(n, k)),
            ],
          };
        }
        const n = rng.int(3, level === 2 ? 6 : 5), k = rng.int(1, n - 1);
        const a = rng.nonZero(-3, 3), b = level === 2 ? 1 : rng.pick([2, 3, -2]);
        const coefficient = choose(n, k) * b ** k * a ** (n - k);
        const base = `${b === 1 ? "" : b === -1 ? "-" : b}x${signed(a)}`;
        return {
          prompt: `Find the coefficient of $x^{${k}}$ in the expansion of $(${base})^{${n}}$.`,
          answer: numberAnswer(coefficient),
          hints: [`The x^${k} term is C(${n}, ${k}) · (${b === 1 ? "" : b}x)^${k} · (${a})^${n - k}.`, "Keep track of the signs."],
          solution: [
            step(`Each term of $(${base})^{${n}}$ picks the $x$ part some number of times and the constant the rest. For $x^{${k}}$, pick the $x$ part $${k}$ times and $${a}$ the other $${n - k}$.`, r`\binom{${n}}{${k}}(${b === 1 ? "" : b}x)^{${k}}(${a})^{${n - k}}`),
            step("Work out the binomial coefficient.", chooseSteps(n, k)),
            step("Work out the powers.", lines(...(b === 1 ? [] : [r`(${b})^{${k}} &= ${b ** k}`]), r`(${a})^{${n - k}} &= ${a ** (n - k)}`)),
            step("Multiply everything together.", r`${choose(n, k)}\times${paren(b ** k)}\times${paren(a ** (n - k))} = ${coefficient}, \text{ so the term is } ${coefficient}x^{${k}}`),
          ],
        };
      },
    },
  ],
};
