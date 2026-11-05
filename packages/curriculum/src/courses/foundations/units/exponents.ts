import { example, math, multipleChoice, numberAnswer, rule, step, text, tip, visual, warn } from "../../../core/builders";
import { paren, simplifyRoot, texFrac, texRoot } from "../../../core/math";
import type { Unit } from "../../../core/types";
import { chain, type Step } from "../../../core/working";

const r = String.raw;

/** b^n as repeated multiplication, multiplied out from the left one factor at a time. */
const powerSteps = (b: number, n: number): Step => {
  const rows = [Array(n).fill(paren(b)).join(r`\times`)];
  for (let k = 2; k < n; k++) rows.push([paren(b ** k), ...Array(n - k).fill(paren(b))].join(r`\times`));
  rows.push(`${b ** n}`);
  const sign = b < 0 ? ` There ${n === 1 ? "is" : "are"} ${n} negative factor${n > 1 ? "s" : ""}: ${n % 2 ? "an odd number, so the answer is negative" : "pairs of negatives make positives, so the answer is positive"}.` : "";
  return step(`Multiply from the left, one factor at a time.${sign}`, chain(`${paren(b)}^{${n}}`, ...rows));
};

export const exponents: Unit = {
  id: "exponents",
  title: "Exponents & Roots",
  icon: "Superscript",
  description: "Powers, the exponent laws, roots, radicals and scientific notation.",
  exercises: [
    {
      id: "exponent-basics",
      title: "Powers & Exponents",
      summary: "Repeated multiplication written compactly.",
      prerequisites: ["multiplication"],
      estimatedMinutes: 6,
      expectedSeconds: 25,
      keyIdeas: ["$b^n$ multiplies $b$ by itself $n$ times.", "$(-2)^2 = 4$ but $-2^2 = -4$."],
      lesson: [
        text("An **exponent** tells you how many times to multiply the **base** by itself. $2^5 = 2\\times2\\times2\\times2\\times2 = 32$."),
        visual({ type: "exponentBlocks", base: 3, exponent: 3 }, "$3^1$ is a row, $3^2$ a square, $3^3$ a cube: $27$ unit blocks."),
        math(r`\underbrace{b \times b \times \cdots \times b}_{n \text{ times}} = b^n`),
        warn("Brackets matter: $(-3)^2 = 9$, but $-3^2 = -(3^2) = -9$. The exponent only touches what it's attached to."),
      ],
      generate: (rng, level) => {
        const b = level === 1 ? rng.int(2, 5) : rng.int(-6, 9) || 2;
        const n = level === 1 ? rng.int(2, 3) : rng.int(2, 4);
        if (level === 3 && rng.chance(0.5)) {
          const base = rng.int(2, 5);
          return {
            prompt: "Evaluate (mind the brackets).",
            tex: `-${base}^${2} + (-${base})^2`,
            answer: numberAnswer(0),
            hints: [`$-${base}^2$ means $-(${base}^2)$.`, `$(-${base})^2$ is positive.`],
            solution: [
              step(`In $-${base}^2$ the power belongs only to the $${base}$: square it first, then make it negative.`, r`-${base}^2 = -(${base}\times${base}) = -${base * base}`),
              step(`In $(-${base})^2$ the brackets square the whole negative number, and a negative times a negative is positive.`, r`(-${base})^2 = (-${base})\times(-${base}) = ${base * base}`),
              step("Add the two parts.", r`-${base * base} + ${base * base} = 0`),
            ],
          };
        }
        return {
          prompt: "Evaluate.",
          tex: `${paren(b)}^{${n}}`,
          solutionVisual: level === 1 && n <= 3 ? { type: "exponentBlocks", base: b, exponent: n } : undefined,
          answer: numberAnswer(b ** n),
          hints: [`Multiply ${b} by itself ${n} times.`, b < 0 ? "An even number of negatives makes a positive." : "Go step by step."],
          solution: [step(`The exponent $${n}$ says how many times to use $${b}$ as a factor: write $${b}$ down $${n}$ times and multiply.`), powerSteps(b, n)],
        };
      },
    },
    {
      id: "exponent-rules",
      title: "The Exponent Laws",
      summary: "Multiplying, dividing and raising powers.",
      prerequisites: ["exponent-basics"],
      estimatedMinutes: 10,
      expectedSeconds: 40,
      keyIdeas: ["$a^m a^n = a^{m+n}$", "$\\frac{a^m}{a^n} = a^{m-n}$", "$(a^m)^n = a^{mn}$"],
      lesson: [
        text("Counting factors explains every exponent law. $2^3 \\times 2^4$ is three 2s times four 2s — seven 2s in total."),
        rule("Product law", r`a^m \cdot a^n = a^{m+n}`),
        rule("Quotient law", r`\frac{a^m}{a^n} = a^{m-n}`),
        rule("Power law", r`(a^m)^n = a^{mn} \qquad (ab)^n = a^n b^n`),
        example("Simplify $\\dfrac{x^7 \\cdot x^2}{x^4}$.", [["Product law on top.", r`\frac{x^9}{x^4}`], ["Quotient law.", r`x^5`]]),
        warn("The laws need the **same base**. $2^3 \\cdot 3^2$ can't be combined this way, and $(a+b)^2 \\neq a^2 + b^2$."),
      ],
      generate: (rng, level) => {
        const m = rng.int(2, 9), n = rng.int(2, 9), p = rng.int(2, 4);
        const product = (a: number, b: number) =>
          step(`Multiplying powers of the same base: **add** the exponents (you have $${a}$ $x$'s, then $${b}$ more).`, r`x^{${a}} \cdot x^{${b}} = x^{${a} + ${b}} = x^{${a + b}}`);
        const quotient = (a: number, b: number) =>
          step(`Dividing powers of the same base: **subtract** the exponents ($${b}$ of the $x$'s on top cancel with the bottom).`, r`\frac{x^{${a}}}{x^{${b}}} = x^{${a} - ${b}} = x^{${a - b}}`);
        const power = (a: number, b: number) =>
          step(`A power of a power: **multiply** the exponents ($${b}$ copies of $x^{${a}}$).`, r`(x^{${a}})^{${b}} = x^{${a}\times${b}} = x^{${a * b}}`);
        const forms: [string, number, string, Step[]][] = [
          [r`x^{${m}} \cdot x^{${n}} = x^{?}`, m + n, "Add exponents when multiplying.", [product(m, n)]],
          [r`\frac{x^{${m + n}}}{x^{${n}}} = x^{?}`, m, "Subtract exponents when dividing.", [quotient(m + n, n)]],
          [r`(x^{${m}})^{${p}} = x^{?}`, m * p, "Multiply exponents for a power of a power.", [power(m, p)]],
        ];
        if (level >= 2)
          forms.push([r`\frac{(x^{${m}})^{${p}} \cdot x^{${n}}}{x^{${m}}} = x^{?}`, m * p + n - m, "Power law, then product, then quotient.", [power(m, p), product(m * p, n), quotient(m * p + n, m)]]);
        if (level === 3)
          forms.push([
            r`\frac{x^{${m}}\cdot (x^{2})^{${n}}}{(x^{${p}})^{2}} = x^{?}`,
            m + 2 * n - 2 * p,
            "Handle the powers of powers first.",
            [power(2, n), power(p, 2), product(m, 2 * n), quotient(m + 2 * n, 2 * p)],
          ]);
        const [tex, ans, hint, work] = rng.pick(forms);
        return {
          prompt: "Find the missing exponent.",
          tex,
          answer: numberAnswer(ans),
          hints: [hint],
          solution: [...work, step(`So the missing exponent is $${ans}$.`)],
        };
      },
    },
    {
      id: "zero-negative-exponents",
      title: "Zero & Negative Exponents",
      summary: "Why $a^0 = 1$ and $a^{-n} = \\frac{1}{a^n}$.",
      prerequisites: ["exponent-rules", "fraction-basics"],
      estimatedMinutes: 7,
      expectedSeconds: 35,
      keyIdeas: ["$a^0 = 1$ for $a \\neq 0$.", "$a^{-n} = \\frac{1}{a^n}$"],
      lesson: [
        text("Follow the pattern: each step down in the exponent **divides by the base**."),
        math(r`2^3 = 8,\quad 2^2 = 4,\quad 2^1 = 2,\quad 2^0 = 1,\quad 2^{-1} = \tfrac12,\quad 2^{-2} = \tfrac14`),
        visual({ type: "functionPlot", functions: [{ fn: (x) => 2 ** x, label: "y = 2^x" }], points: [{ x: 0, y: 1, label: "(0, 1)" }, { x: -1, y: 0.5, label: "(-1, ½)" }, { x: -2, y: 0.25 }], viewBox: { x: [-4, 4], y: [-1, 8] } }),
        rule("Zero and negative exponents", r`a^0 = 1 \qquad a^{-n} = \frac{1}{a^n}`),
        warn("A negative exponent makes a **reciprocal**, not a negative number: $3^{-2} = \\frac19$, not $-9$."),
      ],
      generate: (rng, level) => {
        const b = rng.int(2, level === 1 ? 5 : 10), n = rng.int(1, 3);
        if (level === 1 && rng.chance(0.4))
        {
          const z = rng.int(2, 999);
          return {
            prompt: "Evaluate.",
            tex: `${z}^0`,
            answer: numberAnswer(1),
            hints: ["Any non-zero number to the power 0 is 1."],
            solution: [
              step(`See why with the division law: dividing $${z}$ by itself subtracts the exponents and leaves the power $0$.`, r`\frac{${z}^1}{${z}^1} = ${z}^{1 - 1} = ${z}^0`),
              step("But anything (except 0) divided by itself is $1$.", `${z}^0 = 1`),
            ],
          };
        }
        if (level === 3) {
          const p = rng.int(1, 3);
          return {
            prompt: "Evaluate.",
            tex: r`\left(\frac{1}{${b}}\right)^{-${p}}`,
            answer: numberAnswer(b ** p),
            hints: ["A negative exponent flips the fraction."],
            solution: [
              step("A negative exponent means take the reciprocal. The reciprocal of a fraction is the fraction flipped.", r`\left(\frac{1}{${b}}\right)^{-${p}} = \left(\frac{${b}}{1}\right)^{${p}} = ${b}^{${p}}`),
              p === 1 ? step("A power of $1$ leaves the number unchanged.", `${b}^{1} = ${b}`) : powerSteps(b, p),
            ],
          };
        }
        return {
          prompt: "Evaluate as a fraction.",
          tex: `${b}^{-${n}}`,
          answer: numberAnswer(1 / b ** n),
          inputHint: "e.g. 1/9",
          hints: ["Write it as 1 over the positive power."],
          solution: [
            step("A negative exponent means one over the positive power.", r`${b}^{-${n}} = \frac{1}{${b}^{${n}}}`),
            step(
              n === 1 ? "The power of $1$ is just the number itself." : `Work out the power: $${b}^{${n}} = ${Array(n).fill(b).join("\\times")} = ${b ** n}$.`,
              r`\frac{1}{${b}^{${n}}} = ${texFrac(1, b ** n)}`,
            ),
          ],
        };
      },
    },
    {
      id: "square-roots",
      title: "Square Roots",
      summary: "Undoing squaring, and estimating roots.",
      prerequisites: ["exponent-basics"],
      estimatedMinutes: 6,
      expectedSeconds: 30,
      keyIdeas: ["$\\sqrt{n}$ is the non-negative number whose square is $n$.", "Non-perfect squares lie between consecutive integers."],
      lesson: [
        text("The **square root** $\\sqrt{n}$ asks: which non-negative number squared gives $n$? A square of area $49$ has side $\\sqrt{49} = 7$."),
        visual({ type: "functionPlot", functions: [{ fn: (x) => (x >= 0 ? Math.sqrt(x) : NaN), label: "y = √x" }], points: [{ x: 4, y: 2, label: "(4, 2)" }, { x: 9, y: 3, label: "(9, 3)" }], viewBox: { x: [-1, 12], y: [-1, 4] } }),
        tip("Learn the perfect squares to $15^2 = 225$. They let you estimate: $\\sqrt{50}$ is a little more than $7$ because $7^2 = 49$."),
        warn("$\\sqrt{9} = 3$, not $\\pm 3$. The symbol means the **principal** (non-negative) root. The equation $x^2 = 9$ has two solutions, $\\pm3$."),
      ],
      generate: (rng, level) => {
        const s = rng.int(2, level === 1 ? 12 : 20);
        if (level >= 2 && rng.chance(0.5)) {
          const n = rng.int(s * s + 1, (s + 1) ** 2 - 1);
          return {
            prompt: `$\\sqrt{${n}}$ lies between which two consecutive whole numbers? Enter the **smaller** one.`,
            answer: numberAnswer(s),
            hints: ["Find the perfect squares on either side."],
            solution: [
              step(`Find the perfect squares either side of $${n}$.`, r`${s}^2 = ${s * s}, \quad ${s + 1}^2 = ${(s + 1) ** 2}`),
              step(`$${n}$ is between them, so its square root is between their roots.`, r`${s * s} < ${n} < ${(s + 1) ** 2} \;\Rightarrow\; ${s} < \sqrt{${n}} < ${s + 1}`),
              step(`The smaller whole number is $${s}$.`),
            ],
          };
        }
        return {
          prompt: "Evaluate.",
          tex: r`\sqrt{${s * s}}`,
          answer: numberAnswer(s),
          hints: [`Which number times itself gives ${s * s}?`],
          solution: [
            step(`$\\sqrt{${s * s}}$ asks: which non-negative number, times itself, makes $${s * s}$?`),
            step(`$${s}\\times${s} = ${s * s}$, so the answer is $${s}$.`, r`\sqrt{${s * s}} = ${s}`),
          ],
        };
      },
    },
    {
      id: "simplifying-radicals",
      title: "Simplifying Radicals",
      summary: "Pulling perfect squares out of roots.",
      prerequisites: ["square-roots", "prime-factorization"],
      estimatedMinutes: 9,
      expectedSeconds: 50,
      keyIdeas: ["$\\sqrt{ab} = \\sqrt{a}\\sqrt{b}$", "Pull out the largest perfect-square factor."],
      lesson: [
        rule("Product rule for roots", r`\sqrt{ab} = \sqrt{a}\cdot\sqrt{b} \qquad \sqrt{\frac{a}{b}} = \frac{\sqrt a}{\sqrt b}`),
        text("To simplify, find the **largest perfect square** that divides the number under the root and take its root outside."),
        example("Simplify $\\sqrt{72}$.", [["$36$ is the largest perfect square factor.", r`\sqrt{72} = \sqrt{36\cdot2}`], ["Take the root of 36.", r`= 6\sqrt{2}`]]),
        example("Simplify $\\sqrt{12} + \\sqrt{27}$.", [["Simplify each.", r`2\sqrt3 + 3\sqrt3`], ["Combine like radicals.", r`= 5\sqrt3`]]),
        warn("$\\sqrt{a+b} \\neq \\sqrt a + \\sqrt b$. Check: $\\sqrt{9+16} = 5$, but $3 + 4 = 7$."),
      ],
      generate: (rng, level) => {
        const inside = rng.pick([2, 3, 5, 6, 7]);
        const out = rng.int(2, level === 1 ? 5 : 9);
        const n = out * out * inside;
        const correct = `$${texRoot(out, inside)}$`;
        if (level === 3) {
          const o2 = rng.int(2, 6);
          const total = out + o2;
          return {
            prompt: "Simplify. (You can type answers like 5sqrt(3).)",
            tex: r`\sqrt{${n}} + \sqrt{${o2 * o2 * inside}}`,
            answer: numberAnswer(total * Math.sqrt(inside), { tolerance: 1e-6 }),
            inputHint: "e.g. 5sqrt(3)",
            hints: ["Simplify each root separately.", "Then add like radicals."],
            solution: [
              step(`Simplify the first root: $${n} = ${out * out}\\times${inside}$ and $${out * out}$ is a perfect square.`, r`\sqrt{${n}} = \sqrt{${out * out}}\cdot\sqrt{${inside}} = ${texRoot(out, inside)}`),
              step(`Simplify the second: $${o2 * o2 * inside} = ${o2 * o2}\\times${inside}$.`, r`\sqrt{${o2 * o2 * inside}} = \sqrt{${o2 * o2}}\cdot\sqrt{${inside}} = ${texRoot(o2, inside)}`),
              step(`Both are now multiples of $\\sqrt{${inside}}$ (like terms), so add the numbers in front.`, r`${texRoot(out, inside)} + ${texRoot(o2, inside)} = ${texRoot(total, inside)}`),
            ],
          };
        }
        const [wo, wi] = simplifyRoot(out * inside);
        return {
          prompt: `Simplify $\\sqrt{${n}}$.`,
          ...multipleChoice(rng, correct, [`$${texRoot(inside, out * out)}$`, `$${texRoot(out * out, inside)}$`, `$${texRoot(wo, wi * out)}$`, `$${texRoot(out + 1, inside)}$`]),
          hints: [`Look for a perfect square that divides ${n}.`, `$${out * out}$ divides it.`],
          solution: [
            step(`Find the largest perfect square that divides $${n}$. Trying $4, 9, 16, 25, \\dots$ gives $${out * out}$.`, r`${n} = ${out * out}\times${inside}`),
            step("Split the root into two roots.", r`\sqrt{${n}} = \sqrt{${out * out}}\cdot\sqrt{${inside}}`),
            step(`$\\sqrt{${out * out}} = ${out}$, and $${inside}$ has no square factor left.`, r`\sqrt{${n}} = ${texRoot(out, inside)}`),
          ],
        };
      },
    },
    {
      id: "scientific-notation",
      title: "Scientific Notation",
      summary: "Writing huge and tiny numbers with powers of ten.",
      prerequisites: ["zero-negative-exponents", "decimals"],
      estimatedMinutes: 7,
      expectedSeconds: 40,
      keyIdeas: ["$a \\times 10^n$ with $1 \\le a < 10$.", "Multiply: multiply the $a$'s, add the exponents."],
      lesson: [
        text("Scientists write the distance to the Sun as $1.5 \\times 10^{8}$ km and a bacterium's width as $2 \\times 10^{-6}$ m. **Scientific notation** is a number between 1 and 10 times a power of ten."),
        rule("Scientific notation", r`a \times 10^n, \qquad 1 \le a < 10,\; n \in \mathbb{Z}`),
        example("Write $0.00042$ in scientific notation.", ["Move the point 4 places right to get $4.2$.", ["Moving right means a negative power.", r`4.2\times10^{-4}`]]),
        example("Compute $(3\\times10^5)(4\\times10^3)$.", [["Multiply the numbers, add the exponents.", r`12\times10^{8}`], ["Re-normalise.", r`1.2\times10^{9}`]]),
      ],
      generate: (rng, level) => {
        const a = rng.int(11, 99) / 10, n = level === 1 ? rng.int(2, 6) : rng.int(-7, 9) || 3;
        if (level === 3) {
          const b = rng.int(11, 49) / 10, m = rng.int(-5, 6);
          let prod = Math.round(a * b * 1000) / 1000, e = n + m;
          const raw = prod;
          if (prod >= 10) {
            prod = Math.round(prod * 100) / 1000;
            e++;
          }
          return {
            prompt: `Compute $(${a}\\times10^{${n}})(${b}\\times10^{${m}})$ in scientific notation. What is the **exponent** of 10?`,
            answer: numberAnswer(e),
            hints: ["Add the exponents.", "If the number part is 10 or more, shift it and add 1 to the exponent."],
            solution: [
              step("Multiply the number parts and the powers of 10 separately. Multiplying powers adds the exponents.", r`(${a}\times${b})\times10^{${n} + ${paren(m)}} = ${raw}\times10^{${n + m}}`),
              ...(raw >= 10
                ? [step(`$${raw}$ isn't between $1$ and $10$. Write it as $${prod}\\times10$, which adds $1$ to the exponent.`, r`${raw}\times10^{${n + m}} = ${prod}\times10^{${e}}`)]
                : [step(`$${raw}$ is already between $1$ and $10$, so this is in scientific notation.`, r`${prod}\times10^{${e}}`)]),
              step(`The exponent of 10 is $${e}$.`),
            ],
          };
        }
        const value = a * 10 ** n;
        const display = n >= 0 ? Math.round(value).toLocaleString("en-US").replace(/,/g, "{,}") : value.toFixed(-n + 1);
        return {
          prompt: `Write $${display}$ in scientific notation $a \\times 10^n$. What is $n$?`,
          answer: numberAnswer(n),
          hints: ["Move the decimal point until you have a number between 1 and 10.", "Count the moves: left → positive n, right → negative n."],
          solution: [
            step(
              `${n > 0 ? `In a whole number the decimal point sits at the end: $${display}.$ ` : ""}Move the point so there's exactly one non-zero digit in front of it. That gives $${a}$, a number between $1$ and $10$.`,
            ),
            step(
              n > 0
                ? `The point moved $${n}$ place${n > 1 ? "s" : ""} to the **left**, so multiply by $10$ that many times: $10^{${n}}$.`
                : `The point moved $${-n}$ place${n < -1 ? "s" : ""} to the **right**, so the power of 10 is negative: $10^{${n}}$.`,
              r`${display} = ${a}\times10^{${n}}`,
            ),
            step(`So $n = ${n}$.`),
          ],
        };
      },
    },
    {
      id: "rational-exponents",
      title: "Fractional Exponents",
      summary: "Roots as powers: $a^{1/n} = \\sqrt[n]{a}$.",
      prerequisites: ["simplifying-radicals", "zero-negative-exponents"],
      estimatedMinutes: 9,
      expectedSeconds: 45,
      keyIdeas: ["$a^{1/n} = \\sqrt[n]{a}$", "$a^{m/n} = (\\sqrt[n]{a})^m$"],
      lesson: [
        text("If the exponent laws keep working, then $(9^{1/2})^2 = 9^1 = 9$. So $9^{1/2}$ must be the square root of 9."),
        rule("Fractional exponents", r`a^{1/n} = \sqrt[n]{a} \qquad a^{m/n} = \left(\sqrt[n]{a}\right)^m`),
        example("Evaluate $8^{2/3}$.", [["Cube root first (it keeps numbers small).", r`\sqrt[3]{8} = 2`], ["Then square.", r`2^2 = 4`]]),
        tip("Take the root first, then the power. $27^{2/3} = 3^2 = 9$ is far easier than $\\sqrt[3]{729}$."),
      ],
      generate: (rng, level) => {
        const root = rng.pick(level === 1 ? [2, 3] : [2, 3, 4]);
        const base = rng.int(2, root === 2 ? 9 : root === 3 ? 5 : 3);
        // Numerators that don't cancel with the root, so the exponent is already in lowest terms.
        const m = level === 1 ? 1 : rng.pick([1, 2, 3].filter((k) => k % root !== 0));
        const neg = level === 3 && rng.chance(0.5);
        const result = base ** (m * (neg ? -1 : 1));
        return {
          prompt: "Evaluate.",
          tex: `${base ** root}^{${neg ? "-" : ""}${m === 1 ? `1/${root}` : `${m}/${root}`}}`,
          answer: numberAnswer(result),
          inputHint: neg ? "e.g. 1/4" : undefined,
          hints: [`The denominator ${root} means take the ${root === 2 ? "square" : root === 3 ? "cube" : "fourth"} root.`, m > 1 ? `Then raise to the power ${m}.` : "That's it!"],
          solution: [
            step(
              `The denominator of the exponent, $${root}$, means take the ${root === 2 ? "square" : root === 3 ? "cube" : "fourth"} root. $${Array(root).fill(base).join("\\times")} = ${base ** root}$, so:`,
              r`\sqrt[${root}]{${base ** root}} = ${base}`,
            ),
            ...(m > 1 ? [step(`The numerator, $${m}$, means raise that to the power $${m}$.`, r`${base}^{${m}} = ${base ** m}`)] : []),
            ...(neg ? [step("The minus sign in the exponent means take the reciprocal.", r`${base ** m} \to \frac{1}{${base ** m}}`)] : []),
            step("Putting it together:", r`${base ** root}^{${neg ? "-" : ""}${m === 1 ? `1/${root}` : `${m}/${root}`}} = ${neg ? texFrac(1, base ** m) : base ** m}`),
          ],
        };
      },
    },
  ],
};
