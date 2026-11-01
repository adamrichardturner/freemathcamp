import { example, math, multipleChoice, numberAnswer, rule, step, text, tip, visual, warn } from "../../../core/builders";
import { factor, gcd, poly, quadratic, round, simplifyRoot, texRoot } from "../../../core/math";
import type { Unit } from "../../../core/types";

const r = String.raw;

export const polynomials: Unit = {
  id: "polynomials",
  title: "Polynomials & Quadratics",
  icon: "Spline",
  description: "Expanding, factoring, and every method for solving quadratic equations.",
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
  ],
};
