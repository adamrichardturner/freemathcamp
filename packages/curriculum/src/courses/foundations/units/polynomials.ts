import { example, key, math, multipleChoice, numberAnswer, rule, step, text, tip, visual, warn } from "../../../core/builders";
import { factor, gcd, linear, poly, quadratic, round, signed, simplifyRoot, texRoot } from "../../../core/math";
import type { Unit } from "../../../core/types";

const r = String.raw;

export const polynomials: Unit = {
  id: "polynomials",
  title: "Polynomials, Quadratics & Rational Functions",
  icon: "Spline",
  description: "Expanding, factoring, every method for solving quadratics, polynomial division, and the algebra of rational functions.",
  exercises: [
    {
      id: "polynomial-arithmetic",
      title: "Adding & Subtracting Polynomials",
      summary: "Degree, terms and combining polynomials.",
      prerequisites: ["like-terms", "exponent-rules"],
      estimatedMinutes: 7,
      expectedSeconds: 45,
      keyIdeas: ["The degree is the highest power.", "Subtracting a polynomial negates **every** term."],
      lesson: [
        text("A **polynomial** is a sum of terms like $ax^n$ with whole-number powers. Its **degree** is the highest power: $4x^3 - x + 7$ has degree 3."),
        example("Simplify $(3x^2 - 5x + 2) - (x^2 + 4x - 6)$.", [["Distribute the minus.", r`3x^2 - 5x + 2 - x^2 - 4x + 6`], ["Combine like terms.", r`2x^2 - 9x + 8`]]),
        warn("Forgetting to negate the **last** terms is the classic error."),
      ],
      generate: (rng, level) => {
        const p = [rng.int(-5, 5), rng.int(-7, 7), rng.int(-9, 9)], q = [rng.int(-5, 5), rng.int(-7, 7), rng.int(-9, 9)];
        const sub = level >= 2 && rng.chance(0.6);
        const res = p.map((v, i) => (sub ? v - q[i]! : v + q[i]!));
        const which = rng.int(0, 2);
        const names = ["x^2", "x", "constant"];
        return {
          prompt: `Simplify, then give the coefficient of the ${which === 2 ? "**constant** term" : `$${names[which]}$ term`}.`,
          tex: r`(${quadratic(p[0]!, p[1]!, p[2]!)}) ${sub ? "-" : "+"} (${quadratic(q[0]!, q[1]!, q[2]!)})`,
          answer: numberAnswer(res[which]!),
          hints: [sub ? "Change the sign of every term in the second bracket." : "Remove the brackets.", "Combine like terms."],
          solution: [step("Combine.", quadratic(res[0]!, res[1]!, res[2]!))],
        };
      },
    },
    {
      id: "multiplying-polynomials",
      title: "Multiplying Polynomials",
      summary: "Expanding $(x + a)(x + b)$ and beyond.",
      prerequisites: ["distributive-property", "polynomial-arithmetic"],
      estimatedMinutes: 9,
      expectedSeconds: 50,
      keyIdeas: ["Every term in the first bracket multiplies every term in the second.", "$(a + b)^2 = a^2 + 2ab + b^2$"],
      lesson: [
        text("To multiply two brackets, multiply **every** term by **every** term. A grid (area model) makes sure nothing is missed."),
        visual({ type: "areaModel", a: 13, b: 12 }, "$(10 + 3)(10 + 2) = 100 + 20 + 30 + 6$ — the same idea as $(x + 3)(x + 2) = x^2 + 2x + 3x + 6$."),
        example("Expand $(x + 3)(x - 5)$.", [["First, Outer, Inner, Last.", r`x^2 - 5x + 3x - 15`], ["Combine.", r`x^2 - 2x - 15`]]),
        rule("Perfect square", r`(a + b)^2 = a^2 + 2ab + b^2`),
        warn("$(x + 3)^2 \\neq x^2 + 9$. Don't forget the middle term $6x$."),
      ],
      generate: (rng, level) => {
        const a = level === 3 ? rng.int(2, 4) : 1, b = rng.nonZero(-9, 9), c = rng.int(1, level === 1 ? 1 : 3), d = rng.nonZero(-9, 9);
        const A = a * c, B = a * d + b * c, C = b * d;
        const bx = (p: number, q: number) => (p === 1 ? `(x ${q < 0 ? "-" : "+"} ${Math.abs(q)})` : `(${p}x ${q < 0 ? "-" : "+"} ${Math.abs(q)})`);
        return {
          prompt: "Expand. Enter the coefficients $a, b, c$ of $ax^2 + bx + c$.",
          tex: `${bx(a, b)}${bx(c, d)}`,
          answer: { kind: "tuple", values: [A, B, C] },
          inputHint: "e.g. 1, -2, -15",
          hints: ["Multiply each term in the first bracket by each in the second (4 products).", "Combine the two middle terms."],
          solution: [step("Four products.", poly([[A, "x^2"], [a * d, "x"], [b * c, "x"], [C, ""]])), step("Combine.", quadratic(A, B, C))],
        };
      },
    },
    {
      id: "factoring-gcf",
      title: "Factoring Out the GCF",
      summary: "The reverse of distributing.",
      prerequisites: ["gcf-lcm", "distributive-property"],
      estimatedMinutes: 6,
      expectedSeconds: 40,
      keyIdeas: ["Always look for a common factor first.", "Check by expanding back."],
      lesson: [
        text("**Factoring** is distributing in reverse: write an expression as a product. The first move is always to pull out the **greatest common factor** of every term."),
        example("Factor $12x^3 - 18x^2$.", ["The GCF of the numbers is 6; of $x^3$ and $x^2$ it's $x^2$.", ["Divide each term by $6x^2$.", r`6x^2(2x - 3)`]]),
        tip("Check your answer by expanding: $6x^2 \\cdot 2x - 6x^2 \\cdot 3 = 12x^3 - 18x^2$ ✓"),
      ],
      generate: (rng, level) => {
        const g = rng.int(2, 9), p = rng.int(1, 3);
        let m = rng.nonZero(-7, 7), n = rng.nonZero(-7, 7);
        while (gcd(m, n) !== 1) n = rng.nonZero(-7, 7);
        const power = level === 1 ? 0 : p;
        const tex = poly([[g * m, power ? `x^{${power + 1}}` : "x"], [g * n, power ? (power === 1 ? "x" : `x^{${power}}`) : ""]]);
        const gcfTex = power ? `${g}${power === 1 ? "x" : `x^{${power}}`}` : `${g}`;
        const inner = poly([[m, "x"], [n, ""]]);
        const mOdd = poly([[m, "x"], [-n, ""]]);
        return {
          prompt: "Factor completely.",
          tex,
          ...multipleChoice(rng, `$${gcfTex}(${inner})$`, [`$${g}(${poly([[m, power ? `x^{${power + 1}}` : "x"], [n, ""]])})$`, `$${gcfTex}(${mOdd})$`, `$${power ? "x" : "1"}(${poly([[g * m, "x"], [g * n, ""]])})$`]),
          hints: [`What's the largest number dividing ${Math.abs(g * m)} and ${Math.abs(g * n)}?`, power ? "Also take out the lowest power of x." : "Divide each term by it."],
          solution: [step("Take out the GCF.", `${gcfTex}(${inner})`)],
        };
      },
    },
    {
      id: "factoring-trinomials",
      title: "Factoring Quadratics",
      summary: "$x^2 + bx + c = (x + p)(x + q)$",
      prerequisites: ["multiplying-polynomials", "factoring-gcf"],
      estimatedMinutes: 11,
      expectedSeconds: 60,
      keyIdeas: ["Find two numbers that **multiply to $c$** and **add to $b$**.", "For $a \\neq 1$, split the middle term."],
      lesson: [
        text("Since $(x + p)(x + q) = x^2 + (p + q)x + pq$, factoring $x^2 + bx + c$ means finding $p$ and $q$ with $p + q = b$ and $pq = c$."),
        example("Factor $x^2 + 7x + 12$.", ["Pairs multiplying to 12: $(1,12), (2,6), (3,4)$.", ["$3 + 4 = 7$ ✓", r`(x + 3)(x + 4)`]]),
        example("Factor $x^2 - 2x - 15$.", ["Need product $-15$, sum $-2$: that's $-5$ and $3$.", ["So", r`(x - 5)(x + 3)`]]),
        rule("Difference of two squares", r`a^2 - b^2 = (a - b)(a + b)`, "e.g. $x^2 - 49 = (x - 7)(x + 7)$"),
        tip("Signs: if $c > 0$, both numbers share $b$'s sign. If $c < 0$, they have opposite signs."),
      ],
      generate: (rng, level) => {
        const p = rng.nonZero(-9, 9), q = rng.nonZero(-9, 9);
        if (level >= 2 && rng.chance(0.35)) {
          const k = rng.int(2, 12);
          return {
            prompt: "Factor.",
            tex: `x^2 - ${k * k}`,
            ...multipleChoice(rng, `$(x - ${k})(x + ${k})$`, [`$(x - ${k})^2$`, `$(x + ${k})^2$`, `$(x - ${k * k})(x + 1)$`]),
            hints: ["This is a difference of two squares."],
            solution: [step("Use $a^2 - b^2 = (a-b)(a+b)$.", `(x - ${k})(x + ${k})`)],
          };
        }
        const correct = `$${factor(-p)}${factor(-q)}$`;
        return {
          prompt: "Factor.",
          tex: quadratic(1, p + q, p * q),
          ...multipleChoice(rng, correct, [`$${factor(p)}${factor(q)}$`, `$${factor(-p)}${factor(q)}$`, `$${factor(p)}${factor(-q)}$`, `$${factor(-p * q === 0 ? 1 : -(p * q))}${factor(-1)}$`]),
          hints: [`Find two numbers with product ${p * q} and sum ${p + q}.`],
          solution: [step(`${p} × ${q} = ${p * q} and ${p} + ${q} = ${p + q}.`, `${factor(-p)}${factor(-q)}`)],
        };
      },
    },
    {
      id: "solving-quadratics-factoring",
      title: "Solving Quadratics by Factoring",
      summary: "The zero product property.",
      prerequisites: ["factoring-trinomials", "one-step-equations"],
      estimatedMinutes: 9,
      expectedSeconds: 60,
      keyIdeas: ["If $AB = 0$ then $A = 0$ or $B = 0$.", "Get everything on one side = 0 first."],
      lesson: [
        rule("Zero product property", r`AB = 0 \;\Longrightarrow\; A = 0 \;\text{ or }\; B = 0`),
        text("Rearrange to **= 0**, factor, then set each factor to zero. Each solution is an **$x$-intercept** (root) of the parabola."),
        example("Solve $x^2 + x = 12$.", [["Set to zero.", r`x^2 + x - 12 = 0`], ["Factor.", r`(x + 4)(x - 3) = 0`], ["Solve each.", r`x = -4 \;\text{ or }\; x = 3`]]),
        visual({ type: "functionPlot", functions: [{ fn: (x) => x * x + x - 12, label: "y = x² + x − 12" }], points: [{ x: -4, y: 0, label: "−4" }, { x: 3, y: 0, label: "3" }], viewBox: { x: [-7, 6], y: [-14, 8] } }),
        warn("Never divide both sides by $x$ — you'd lose the solution $x = 0$."),
      ],
      generate: (rng, level) => {
        const p = rng.int(-9, 9), q = rng.int(-9, 9);
        const lead = level === 3 ? rng.int(2, 3) : 1;
        return {
          prompt: "Solve. Enter all solutions separated by commas.",
          tex: `${quadratic(lead, -lead * (p + q), lead * p * q)} = 0`,
          answer: { kind: "set", values: p === q ? [p] : [p, q] },
          inputHint: "e.g. -4, 3",
          solutionVisual: level === 1 ? { type: "functionPlot", functions: [{ fn: (x) => (x - p) * (x - q), tone: "muted" }], points: [...new Set([p, q])].map((r) => ({ x: r, y: 0, label: `x = ${r}` })), viewBox: { x: [-11, 11], y: [-25, 15] } } : undefined,
          hints: [lead > 1 ? `Factor out ${lead} first.` : "Factor into two brackets.", "Set each bracket equal to zero."],
          solution: [step("Factor.", `${lead > 1 ? lead : ""}${factor(p)}${factor(q)} = 0`), step("Solve.", p === q ? `x = ${p}` : `x = ${p} \\text{ or } x = ${q}`)],
        };
      },
    },
    {
      id: "completing-the-square",
      title: "Completing the Square & Vertex Form",
      summary: "Rewriting $x^2 + bx + c$ as $(x + h)^2 + k$.",
      prerequisites: ["solving-quadratics-factoring", "transformations"],
      estimatedMinutes: 12,
      expectedSeconds: 75,
      keyIdeas: ["$x^2 + bx = (x + \\frac b2)^2 - (\\frac b2)^2$", "Vertex form $a(x - h)^2 + k$ has vertex $(h, k)$."],
      lesson: [
        text("Every quadratic is a transformed $y = x^2$. **Vertex form** $y = a(x - h)^2 + k$ shows the turning point $(h, k)$ directly. Explore it:"),
        visual({ type: "parabolaExplorer", a: 1, h: 2, k: -3 }),
        rule("Completing the square", r`x^2 + bx + c = \left(x + \frac{b}{2}\right)^2 - \left(\frac{b}{2}\right)^2 + c`),
        example("Write $x^2 - 6x + 5$ in vertex form.", [["Half of $-6$ is $-3$.", r`(x - 3)^2 - 9 + 5`], ["Simplify.", r`(x - 3)^2 - 4`], "Vertex $(3, -4)$."]),
      ],
      generate: (rng, level) => {
        const h = rng.int(-6, 6), k = rng.int(-9, 9), a = level === 3 ? rng.pick([2, -1, -2, 3]) : 1;
        return {
          prompt: "Find the vertex of the parabola. Enter $(h, k)$.",
          tex: `y = ${quadratic(a, -2 * a * h, a * h * h + k)}`,
          answer: { kind: "tuple", values: [h, k] },
          inputHint: "e.g. (3, -4)",
          hints: [a !== 1 ? `Factor ${a} out of the x terms first.` : "Halve the x-coefficient.", "Or use $h = -\\frac{b}{2a}$, then $k = f(h)$."],
          solution: [step("Complete the square.", `y = ${a === 1 ? "" : a}(x ${h < 0 ? "+" : "-"} ${Math.abs(h)})^2 ${k < 0 ? "-" : "+"} ${Math.abs(k)}`), step("Vertex.", `(${h}, ${k})`)],
        };
      },
    },
    {
      id: "quadratic-formula",
      title: "The Quadratic Formula",
      summary: "Solving any quadratic, and the discriminant.",
      prerequisites: ["completing-the-square", "simplifying-radicals"],
      estimatedMinutes: 12,
      expectedSeconds: 90,
      keyIdeas: ["$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$", "Discriminant $b^2 - 4ac$: >0 two roots, =0 one, <0 none (real)."],
      lesson: [
        text("Completing the square on $ax^2 + bx + c = 0$ in general gives a formula that solves **every** quadratic."),
        rule("Quadratic formula", r`x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`),
        rule("Discriminant", r`\Delta = b^2 - 4ac`, "$\\Delta > 0$: two real roots · $\\Delta = 0$: one repeated root · $\\Delta < 0$: no real roots"),
        visual({ type: "functionPlot", functions: [{ fn: (x) => x * x - 2 * x - 2, label: "Δ > 0" }, { fn: (x) => x * x - 2 * x + 1, tone: "accent", label: "Δ = 0" }, { fn: (x) => x * x - 2 * x + 3, tone: "warning", label: "Δ < 0" }], viewBox: { x: [-3, 5], y: [-4, 8] } }),
        example("Solve $2x^2 + 3x - 4 = 0$.", [["$a = 2,\\ b = 3,\\ c = -4$.", r`x = \frac{-3 \pm \sqrt{9 + 32}}{4}`], ["", r`x = \frac{-3 \pm \sqrt{41}}{4} \approx 0.85,\; -2.35`]]),
      ],
      generate: (rng, level) => {
        const a = rng.int(1, level === 1 ? 1 : 3), b = rng.int(-9, 9), c = rng.int(-9, 9);
        const disc = b * b - 4 * a * c;
        if (level === 1 || rng.chance(0.3)) {
          return {
            prompt: "Compute the discriminant $b^2 - 4ac$. How many real solutions are there?",
            tex: `${quadratic(a, b, c)} = 0`,
            answer: numberAnswer(disc > 0 ? 2 : disc === 0 ? 1 : 0),
            hints: [`$b^2 - 4ac = ${b * b} - ${4 * a * c}$`.replace("- -", "+ "), "Positive → 2, zero → 1, negative → 0."],
            solution: [step("Discriminant.", r`\Delta = ${disc}`), step(disc > 0 ? "Positive: two real roots." : disc === 0 ? "Zero: one repeated root." : "Negative: no real roots.")],
          };
        }
        let A = a, B = b, C = c;
        if (disc < 0) [A, B, C] = [1, b, -Math.abs(c) - 1];
        const D = B * B - 4 * A * C;
        const roots = [(-B + Math.sqrt(D)) / (2 * A), (-B - Math.sqrt(D)) / (2 * A)].map((x) => round(x, 2));
        const [o, i] = simplifyRoot(D);
        return {
          prompt: "Solve using the quadratic formula. Give answers to 2 decimal places, separated by commas.",
          tex: `${quadratic(A, B, C)} = 0`,
          answer: { kind: "set", values: D === 0 ? [roots[0]!] : roots, tolerance: 0.006 },
          inputHint: "e.g. 0.85, -2.35",
          hints: [`a = ${A}, b = ${B}, c = ${C}.`, `The discriminant is ${D}.`],
          solution: [step("Substitute.", r`x = \frac{${-B} \pm ${texRoot(o, i)}}{${2 * A}}`), step("Evaluate.", roots.join(r`,\ `))],
        };
      },
    },
    {
      id: "rationalizing",
      title: "Rationalising & Conjugates",
      summary: "Clearing roots from denominators with conjugates.",
      prerequisites: ["simplifying-radicals", "multiplying-polynomials"],
      estimatedMinutes: 10,
      expectedSeconds: 60,
      keyIdeas: [
        "Multiplying top and bottom by the same thing doesn't change a fraction's value.",
        "$\\dfrac{k}{\\sqrt n} = \\dfrac{k\\sqrt n}{n}$",
        "Conjugates: $(a + \\sqrt b)(a - \\sqrt b) = a^2 - b$, and the root disappears.",
      ],
      lesson: [
        text("A fraction with a root in its denominator is correct, but awkward to compare or simplify. **Rationalising** rewrites it with a whole-number denominator, without changing its value."),
        rule("A single root", r`\frac{k}{\sqrt n} = \frac{k}{\sqrt n}\cdot\frac{\sqrt n}{\sqrt n} = \frac{k\sqrt n}{n}`),
        example("Rationalise $\\dfrac{6}{\\sqrt3}$.", [["Multiply top and bottom by $\\sqrt3$.", r`\frac{6\sqrt3}{3}`], ["Simplify.", r`2\sqrt3`]]),
        rule("Conjugates", r`(a + \sqrt b)(a - \sqrt b) = a^2 - b`, "It's a difference of two squares, so the root cancels out."),
        example("Rationalise $\\dfrac{1}{3 + \\sqrt2}$.", [["Multiply by the conjugate over itself, $\\frac{3 - \\sqrt2}{3 - \\sqrt2}$.", r`\frac{3 - \sqrt2}{9 - 2}`], ["Simplify.", r`\frac{3 - \sqrt2}{7}`]]),
        key("Calculus uses this exact trick. $\\dfrac{\\sqrt{x + 4} - 2}{x}$ can't be evaluated at $x = 0$, but after rationalising the **numerator** it becomes $\\dfrac{1}{\\sqrt{x + 4} + 2}$, which can: it's $\\frac14$."),
      ],
      generate: (rng, level) => {
        const n = rng.pick([2, 3, 5, 6, 7]);
        if (level === 1) {
          const m = rng.int(1, 4), k = n * m; // k/√n = m√n
          const root = (c: number, v: number) => `${c === 1 ? "" : c}\\sqrt{${v}}`;
          return {
            prompt: "Rationalise the denominator and simplify.",
            tex: r`\frac{${k}}{\sqrt{${n}}}`,
            ...multipleChoice(rng, `$${root(m, n)}$`, [`$${root(k, n)}$`, `$\\frac{\\sqrt{${n}}}{${k}}$`, `$${root(m, k)}$`]),
            hints: [`Multiply the top and bottom by √${n}.`, `Then simplify ${k}/${n}.`],
            solution: [step(`Multiply by $\\frac{\\sqrt{${n}}}{\\sqrt{${n}}}$.`, r`\frac{${k}\sqrt{${n}}}{${n}}`), step("Simplify.", root(m, n))],
          };
        }
        if (level === 2) {
          const a = rng.int(3, 5), plus = rng.chance(0.5), den = a * a - n;
          const over = (top: string, bottom: number) => (bottom === 1 ? top : `\\frac{${top}}{${bottom}}`);
          const conj = `${a} ${plus ? "-" : "+"} \\sqrt{${n}}`;
          return {
            prompt: "Rationalise the denominator.",
            tex: r`\frac{1}{${a} ${plus ? "+" : "-"} \sqrt{${n}}}`,
            ...multipleChoice(rng, `$${over(conj, den)}$`, [`$${over(`${a} ${plus ? "+" : "-"} \\sqrt{${n}}`, den)}$`, `$${over(conj, a * a + n)}$`, `$${over(conj, a - n)}$`]),
            hints: [`Multiply the top and bottom by the conjugate, ${conj.replace("\\sqrt", "√").replace(/[{}]/g, "")}.`, "The bottom becomes a² − b."],
            solution: [step("Multiply by the conjugate.", r`\frac{${conj}}{(${a})^2 - ${n}}`), step("Simplify.", over(conj, den))],
          };
        }
        const c = rng.int(1, 5);
        if (rng.chance(0.4)) {
          const a = rng.int(2, 9);
          return {
            prompt: "Multiply out the conjugates.",
            tex: r`(${a} + \sqrt{${n}})(${a} - \sqrt{${n}})`,
            answer: numberAnswer(a * a - n),
            hints: ["It's a difference of two squares.", "(a + √b)(a − √b) = a² − b"],
            solution: [step("Difference of two squares.", r`${a}^2 - (\sqrt{${n}})^2 = ${a * a} - ${n} = ${a * a - n}`)],
          };
        }
        return {
          prompt: `Rationalise the numerator, then find the value the expression approaches as $x \\to 0$.`,
          tex: r`\frac{\sqrt{x + ${c * c}} - ${c}}{x}`,
          answer: numberAnswer(1 / (2 * c)),
          inputHint: "e.g. 1/6",
          hints: [`Multiply the top and bottom by √(x + ${c * c}) + ${c}.`, "The x on top cancels with the x on the bottom."],
          solution: [
            step("Multiply by the conjugate.", r`\frac{(x + ${c * c}) - ${c * c}}{x(\sqrt{x + ${c * c}} + ${c})} = \frac{1}{\sqrt{x + ${c * c}} + ${c}}`),
            step("Now set $x = 0$.", r`\frac{1}{${c} + ${c}} = \frac{1}{${2 * c}}`),
          ],
        };
      },
    },
    {
      id: "polynomial-division",
      title: "Polynomial Division & the Factor Theorem",
      summary: "Dividing polynomials, and finding factors from roots.",
      prerequisites: ["factoring-trinomials", "function-notation"],
      estimatedMinutes: 12,
      expectedSeconds: 70,
      keyIdeas: [
        "Remainder theorem: dividing $p(x)$ by $(x - a)$ leaves the remainder $p(a)$.",
        "Factor theorem: $(x - a)$ is a factor exactly when $p(a) = 0$.",
        "Find one root, divide it out, then factor the quadratic that's left.",
      ],
      lesson: [
        text("Polynomials divide like whole numbers: you get a quotient and a remainder. You'll rarely need long division by hand, because two theorems do most of the work."),
        rule("Remainder theorem", r`p(x) \div (x - a) \;\text{ leaves the remainder }\; p(a)`),
        rule("Factor theorem", r`p(a) = 0 \;\Leftrightarrow\; (x - a) \text{ is a factor of } p(x)`),
        example("Factor $p(x) = x^3 - 2x^2 - 5x + 6$ completely.", [
          ["Try small values: $p(1) = 1 - 2 - 5 + 6 = 0$, so $(x - 1)$ is a factor.", r`p(1) = 0`],
          ["Divide it out. Synthetic division with the coefficients $1, -2, -5, 6$ and the root $1$ gives $1, -1, -6$.", r`p(x) = (x - 1)(x^2 - x - 6)`],
          ["Factor the quadratic.", r`p(x) = (x - 1)(x - 3)(x + 2)`],
        ]),
        tip("Whole-number roots must divide the constant term. For $x^3 - 2x^2 - 5x + 6$, you only need to try $\\pm1, \\pm2, \\pm3$ and $\\pm6$."),
        key("In calculus, dividing out $(x - a)$ is how you simplify limits like $\\lim_{x\\to a}\\dfrac{p(x)}{x - a}$."),
      ],
      generate: (rng, level) => {
        const cubic = (cs: number[]) => poly([[cs[0]!, "x^3"], [cs[1]!, "x^2"], [cs[2]!, "x"], [cs[3]!, ""]]);
        if (level === 1) {
          const cs = [rng.nonZero(-3, 3), rng.int(-6, 6), rng.int(-8, 8), rng.int(-9, 9)];
          const k = rng.nonZero(-3, 3);
          const value = cs[0]! * k ** 3 + cs[1]! * k * k + cs[2]! * k + cs[3]!;
          return {
            prompt: `Find the remainder when $p(x) = ${cubic(cs)}$ is divided by $${factor(k)}$.`,
            answer: numberAnswer(value),
            hints: ["You don't need to divide: use the remainder theorem.", `The remainder is p(${k}).`],
            solution: [step("Remainder theorem: substitute the root of the divisor.", r`p(${k}) = ${cubic(cs).replace(/x/g, `(${k})`)} = ${value}`)],
          };
        }
        if (level === 2) {
          const [r1, r2, r3] = rng.shuffle([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]) as [number, number, number];
          const cs = [1, -(r1 + r2 + r3), r1 * r2 + r1 * r3 + r2 * r3, -r1 * r2 * r3];
          return {
            prompt: `Given that $${factor(r1)}$ is a factor of $p(x) = ${cubic(cs)}$, solve $p(x) = 0$. Enter every solution.`,
            answer: { kind: "set", values: [r1, r2, r3] },
            inputHint: "e.g. -2, 1, 3",
            hints: [`Divide p(x) by ${factor(r1)} to get a quadratic.`, "Factor the quadratic and set each factor equal to zero."],
            solution: [
              step("Divide out the known factor.", `p(x) = ${factor(r1)}(${quadratic(1, -(r2 + r3), r2 * r3)})`),
              step("Factor completely.", `p(x) = ${factor(r1)}${factor(r2)}${factor(r3)}`),
              step("Set each factor to zero.", `x = ${r1}, \\; ${r2}, \\; ${r3}`),
            ],
          };
        }
        const a = rng.nonZero(-3, 3), b = rng.int(-5, 5), k = rng.int(-9, 9);
        const c = -(a ** 3 + b * a * a + k * a);
        const known = a ** 3 + b * a * a + c;
        const ka = Math.abs(a) === 1 ? "k" : `${Math.abs(a)}k`;
        return {
          prompt: `Find $k$ so that $${factor(a)}$ is a factor of $p(x) = ${poly([[1, "x^3"], [b, "x^2"]])} + kx${c === 0 ? "" : signed(c)}$.`,
          answer: numberAnswer(k),
          hints: ["Factor theorem: (x − a) is a factor exactly when p(a) = 0.", `Substitute x = ${a} and solve for k.`],
          solution: [step(`Set $p(${a}) = 0$.`, `${known} ${a < 0 ? "-" : "+"} ${ka} = 0`), step("Solve.", `k = ${k}`)],
        };
      },
    },
    {
      id: "rational-expressions",
      title: "Rational Expressions",
      summary: "Simplifying algebraic fractions.",
      prerequisites: ["factoring-trinomials", "equivalent-fractions"],
      estimatedMinutes: 10,
      expectedSeconds: 60,
      keyIdeas: ["Factor top and bottom, then cancel common **factors**.", "Never cancel terms that are added."],
      lesson: [
        text("A **rational expression** is a fraction of polynomials. Simplify exactly like numerical fractions: factor, then cancel common factors."),
        example("Simplify $\\dfrac{x^2 - 9}{x^2 + 5x + 6}$.", [["Factor both.", r`\frac{(x - 3)(x + 3)}{(x + 2)(x + 3)}`], ["Cancel $(x + 3)$.", r`\frac{x - 3}{x + 2}, \quad x \neq -3, -2`]]),
        warn("$\\dfrac{x + 3}{x}$ is **not** $3$ — you can only cancel factors, not terms."),
        math(r`\frac{\cancel{(x+3)}\,(x-3)}{\cancel{(x+3)}\,(x+2)}`),
      ],
      generate: (rng) => {
        const p = rng.nonZero(-6, 6);
        let q = rng.nonZero(-6, 6), s = rng.nonZero(-6, 6);
        while (q === s || q === p || s === p) [q, s] = [rng.nonZero(-6, 6), rng.nonZero(-6, 6)];
        const correct = `$\\dfrac{${factor(-q).replace(/^\(|\)$/g, "")}}{${factor(-s).replace(/^\(|\)$/g, "")}}$`;
        return {
          prompt: "Simplify.",
          tex: r`\frac{${quadratic(1, p + q, p * q)}}{${quadratic(1, p + s, p * s)}}`,
          ...multipleChoice(rng, correct, [`$\\dfrac{${p * q}}{${p * s}}$`, `$\\dfrac{${factor(q).replace(/^\(|\)$/g, "")}}{${factor(s).replace(/^\(|\)$/g, "")}}$`, `$\\dfrac{${factor(-p).replace(/^\(|\)$/g, "")}}{${factor(-s).replace(/^\(|\)$/g, "")}}$`]),
          hints: ["Factor the numerator and denominator.", "Look for a shared bracket."],
          solution: [step("Factor.", r`\frac{${factor(-p)}${factor(-q)}}{${factor(-p)}${factor(-s)}}`), step("Cancel the common factor.")],
        };
      },
    },
    {
      id: "rational-operations",
      title: "Operations with Rational Expressions",
      summary: "Multiplying, dividing, adding and subtracting algebraic fractions.",
      prerequisites: ["rational-expressions", "add-subtract-fractions"],
      estimatedMinutes: 12,
      expectedSeconds: 75,
      keyIdeas: [
        "Multiply: factor everything, cancel common factors, multiply what's left.",
        "Divide: flip the second fraction and multiply.",
        "Add or subtract: rewrite over a common denominator first.",
      ],
      lesson: [
        text("Algebraic fractions follow exactly the same rules as number fractions. The only new skill is factoring, so that you can see what cancels."),
        example("Simplify $\\dfrac{x^2 - 9}{x + 2}\\cdot\\dfrac{x + 2}{x - 3}$.", [["Factor.", r`\frac{(x - 3)(x + 3)}{x + 2}\cdot\frac{x + 2}{x - 3}`], ["Cancel the common factors.", r`x + 3`]]),
        rule("Common denominator", r`\frac{a}{x} + \frac{b}{x + c} = \frac{a(x + c) + bx}{x(x + c)}`),
        example("Simplify $\\dfrac{1}{x} - \\dfrac{1}{x + h}$.", [["Use the common denominator $x(x + h)$.", r`\frac{(x + h) - x}{x(x + h)}`], ["Simplify the top.", r`\frac{h}{x(x + h)}`]]),
        warn("Only cancel **factors**, never terms: $\\dfrac{x + 3}{x}$ does not simplify to $3$."),
        key("That last example is the first step in finding the derivative of $\\frac1x$. You'll combine fractions like this again and again in calculus."),
      ],
      generate: (rng, level) => {
        const p = rng.int(1, 7);
        let q = rng.nonZero(-6, 6);
        while (q === p || q === -p) q = rng.nonZero(-6, 6);
        if (level === 1)
          return {
            prompt: "Simplify.",
            tex: r`\frac{x^2 - ${p * p}}{${linear(1, q)}}\cdot\frac{${linear(1, q)}}{${linear(1, -p)}}`,
            ...multipleChoice(rng, `$${linear(1, p)}$`, [`$${linear(1, -p)}$`, `$${linear(1, q)}$`, `$\\frac{${linear(1, p)}}{${linear(1, q)}}$`]),
            hints: [`Factor x² − ${p * p} as a difference of two squares.`, "Cancel every factor that appears on both the top and the bottom."],
            solution: [step("Factor.", r`\frac{(${linear(1, -p)})(${linear(1, p)})}{${linear(1, q)}}\cdot\frac{${linear(1, q)}}{${linear(1, -p)}}`), step("Cancel.", linear(1, p))],
          };
        const a = rng.int(1, 5), b = rng.int(1, 5), c = q;
        const den = `x(${linear(1, c)})`;
        if (level === 2)
          return {
            prompt: "Write as a single fraction.",
            tex: r`\frac{${a}}{x} + \frac{${b}}{${linear(1, c)}}`,
            ...multipleChoice(rng, `$\\frac{${linear(a + b, a * c)}}{${den}}$`, [
              `$\\frac{${a + b}}{${linear(2, c)}}$`,
              `$\\frac{${a + b}}{${den}}$`,
              `$\\frac{${linear(a + b, b * c)}}{${den}}$`,
            ]),
            hints: [`The common denominator is ${den.replace(/[{}]/g, "")}.`, `Multiply the first fraction by (${linear(1, c)}) on top and bottom, and the second by x.`],
            solution: [step("Common denominator.", r`\frac{${a}(${linear(1, c)}) + ${b}x}{${den}}`), step("Expand the top.", r`\frac{${linear(a + b, a * c)}}{${den}}`)],
          };
        if (rng.chance(0.5))
          return {
            prompt: "Write as a single fraction.",
            tex: r`\frac{${a}}{x} - \frac{${a}}{${linear(1, c)}}`,
            ...multipleChoice(rng, `$\\frac{${a * c}}{${den}}$`, [`$\\frac{${-a * c}}{${den}}$`, `$\\frac{${a * c}}{${linear(1, c)}}$`, "$0$"]),
            hints: ["Use the common denominator x(x + c).", "Be careful with the minus sign in front of the second fraction."],
            solution: [step("Common denominator.", r`\frac{${a}(${linear(1, c)}) - ${a}x}{${den}}`), step("The x terms cancel.", r`\frac{${a * c}}{${den}}`)],
          };
        return {
          prompt: "Simplify.",
          tex: r`\frac{x^2 - ${p * p}}{x} \div \frac{${linear(1, p)}}{x^2}`,
          ...multipleChoice(rng, `$x(${linear(1, -p)})$`, [`$x(${linear(1, p)})$`, `$\\frac{${linear(1, -p)}}{x}$`, `$\\frac{${linear(1, -p)}}{x^3}$`]),
          hints: ["Dividing by a fraction is multiplying by its reciprocal.", `Factor x² − ${p * p}, then cancel.`],
          solution: [
            step("Flip and multiply.", r`\frac{(${linear(1, -p)})(${linear(1, p)})}{x}\cdot\frac{x^2}{${linear(1, p)}}`),
            step("Cancel the common factors.", `x(${linear(1, -p)})`),
          ],
        };
      },
    },
    {
      id: "rational-functions",
      title: "Rational Functions & Asymptotes",
      summary: "Where a graph shoots off to infinity, levels out, or has a hole.",
      prerequisites: ["rational-operations", "transformations"],
      estimatedMinutes: 12,
      expectedSeconds: 60,
      keyIdeas: [
        "Cancel common factors first: each one leaves a **hole**.",
        "Zeros of what's left in the denominator are **vertical asymptotes**.",
        "Horizontal asymptote: compare degrees. Lower on top gives $y = 0$; equal degrees give the ratio of the leading coefficients.",
      ],
      lesson: [
        text("A **rational function** is one polynomial divided by another, like $f(x) = \\frac{1}{x - 2}$. Its graph can do three things a polynomial's can't: shoot off to infinity, level out, or have a single missing point."),
        visual(
          { type: "functionPlot", functions: [{ fn: (x) => (Math.abs(x - 2) < 0.04 ? NaN : 1 / (x - 2) + 1) }, { fn: () => 1, tone: "muted", dashed: true }], viewBox: { x: [-4, 8], y: [-5, 7] } },
          "$f(x) = \\frac{1}{x - 2} + 1$ has a vertical asymptote at $x = 2$ and a horizontal asymptote at $y = 1$.",
        ),
        rule("Vertical asymptotes", r`q(a) = 0 \text{ after cancelling} \;\Rightarrow\; x = a`, "Near $x = a$ the denominator is tiny, so $f(x)$ is huge."),
        rule("Horizontal asymptotes", r`\frac{3x^2 + 1}{x^2 - 5} \to 3 \;\text{ as }\; x \to \pm\infty`, "For large $x$ only the leading terms matter. If the top's degree is lower, the asymptote is $y = 0$; if it's higher, there's no horizontal asymptote."),
        example("Find the hole and the vertical asymptote of $f(x) = \\dfrac{x - 3}{x^2 - x - 6}$.", [
          ["Factor the denominator.", r`\frac{x - 3}{(x - 3)(x + 2)}`],
          ["$(x - 3)$ cancels, leaving a **hole** at $x = 3$.", r`f(x) = \frac{1}{x + 2}, \quad x \ne 3`],
          ["What's left in the denominator gives the vertical asymptote.", r`x = -2`],
        ]),
        key("Asymptotes are limits in disguise: $\\lim_{x\\to\\infty} f(x) = 1$, and $f(x) \\to \\pm\\infty$ as $x \\to 2$. That's exactly how you'll write them in calculus."),
      ],
      generate: (rng, level) => {
        if (level === 1) {
          const p = rng.nonZero(-6, 6), k = rng.int(-5, 5), a = rng.nonZero(-4, 4), vertical = rng.chance(0.5);
          return {
            prompt: vertical ? "The graph has a vertical asymptote $x = a$. Find $a$." : "The graph has a horizontal asymptote $y = b$. Find $b$.",
            tex: r`f(x) = \frac{${a}}{${linear(1, -p)}}${k === 0 ? "" : signed(k)}`,
            answer: numberAnswer(vertical ? p : k),
            hints: vertical ? ["Where is the denominator zero?"] : ["As x gets huge, what does the fraction shrink towards?", "Whatever is added to it stays."],
            solution: [vertical ? step("The denominator is zero here.", r`${linear(1, -p)} = 0 \;\Rightarrow\; x = ${p}`) : step("The fraction tends to 0, leaving the constant.", `y = ${k}`)],
            solutionVisual: {
              type: "functionPlot",
              functions: [{ fn: (x) => (Math.abs(x - p) < 0.04 ? NaN : a / (x - p) + k) }, { fn: () => k, tone: "muted", dashed: true }],
              viewBox: { x: [p - 8, p + 8], y: [k - 8, k + 8] },
            },
          };
        }
        if (level === 2) {
          const r0 = rng.nonZero(-5, 5);
          let s = rng.nonZero(-5, 5);
          while (s === r0) s = rng.nonZero(-5, 5);
          const hole = rng.chance(0.5);
          return {
            prompt: hole ? "The graph has a hole at $x = a$. Find $a$." : "The graph has one vertical asymptote, $x = a$. Find $a$.",
            tex: r`f(x) = \frac{${linear(1, -r0)}}{${quadratic(1, -(r0 + s), r0 * s)}}`,
            answer: numberAnswer(hole ? r0 : s),
            hints: ["Factor the denominator first.", hole ? "A factor that cancels leaves a hole, not an asymptote." : "A factor that cancels leaves a hole; the one that's left is the asymptote."],
            solution: [
              step("Factor.", r`\frac{${linear(1, -r0)}}{${factor(r0)}${factor(s)}} = \frac{1}{${linear(1, -s)}}, \quad x \ne ${r0}`),
              step(hole ? "The cancelled factor gives the hole." : "The remaining factor gives the asymptote.", `x = ${hole ? r0 : s}`),
            ],
          };
        }
        const a = rng.nonZero(-6, 6), d = rng.int(1, 5), b = rng.int(-5, 5), e = rng.int(-5, 5), c = rng.int(-9, 9), f = rng.int(1, 9);
        const lower = rng.chance(0.3);
        const top = lower ? linear(a, c) : quadratic(a, b, c);
        return {
          prompt: "The graph has a horizontal asymptote $y = b$. Find $b$.",
          tex: r`f(x) = \frac{${top}}{${quadratic(d, e, f)}}`,
          answer: numberAnswer(lower ? 0 : a / d),
          inputHint: "e.g. 3/2",
          hints: ["Compare the degrees of the top and the bottom.", lower ? "The top grows more slowly than the bottom." : "With equal degrees, divide the leading coefficients."],
          solution: [lower ? step("The top has the lower degree, so the fraction tends to 0.", "y = 0") : step("Equal degrees: divide the leading coefficients.", r`y = \frac{${a}}{${d}}`)],
        };
      },
    },
  ],
};
