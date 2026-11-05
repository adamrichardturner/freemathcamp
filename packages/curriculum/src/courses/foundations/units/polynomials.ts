import { example, key, math, multipleChoice, numberAnswer, rule, step, text, tip, visual, warn } from "../../../core/builders";
import { factor, gcd, linear, paren, poly, quadratic, round, signed, simplifyRoot, texFrac, texRoot } from "../../../core/math";
import type { Unit } from "../../../core/types";
import { joinSigned, lines, substitute, times } from "../../../core/working";

/** Factor pairs of |n|: 12 → 1 × 12, 2 × 6, 3 × 4. */
const factorPairs = (n: number) =>
  Array.from({ length: Math.floor(Math.sqrt(Math.abs(n))) }, (_, i) => i + 1)
    .filter((f) => Math.abs(n) % f === 0)
    .map((f) => r`${f}\times${Math.abs(n) / f}`)
    .join(r`,\ `);

/** The working for x^2 + (p+q)x + pq = (x + p)(x + q): find two numbers, then write the brackets. */
const productSum = (p: number, q: number) => [
  step(
    `Find two numbers that **multiply** to $${p * q}$ (the number on its own) and **add** to $${p + q}$ (the coefficient of $x$). ${p * q > 0 ? "The product is positive, so they have the same sign" : "The product is negative, so one is positive and one negative"}. Factor pairs of $${Math.abs(p * q)}$:`,
    factorPairs(p * q),
  ),
  step(`$${p}$ and $${q}$ work.`, r`${paren(p)}\times${paren(q)} = ${p * q}, \qquad ${p} + ${paren(q)} = ${p + q}`),
];

const r = String.raw;

/** lim (√(x + c²) − c)/x as x → 0, by rationalising the numerator. */
export const rationalisedLimit = (c: number) => [
  step("Putting in $x = 0$ gives $\\frac{0}{0}$, which tells you nothing. Multiply the top and bottom by the conjugate of the top."),
  step(
    "The top becomes a difference of two squares, and the numbers cancel.",
    r`\frac{(\sqrt{x + ${c * c}} - ${c})(\sqrt{x + ${c * c}} + ${c})}{x(\sqrt{x + ${c * c}} + ${c})} = \frac{(x + ${c * c}) - ${c * c}}{x(\sqrt{x + ${c * c}} + ${c})} = \frac{x}{x(\sqrt{x + ${c * c}} + ${c})}`,
  ),
  step("Cancel the $x$.", r`\frac{1}{\sqrt{x + ${c * c}} + ${c}}`),
  step("Now $x = 0$ is safe to substitute.", r`\frac{1}{\sqrt{${c * c}} + ${c}} = \frac{1}{${c} + ${c}} = \frac{1}{${2 * c}}`),
];

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
          solution: [
            step(
              sub ? "Remove the brackets. The minus sign in front of the second bracket changes the sign of **every** term inside it." : "Remove the brackets: adding doesn't change any signs.",
              poly([[p[0]!, "x^2"], [p[1]!, "x"], [p[2]!, ""], [sub ? -q[0]! : q[0]!, "x^2"], [sub ? -q[1]! : q[1]!, "x"], [sub ? -q[2]! : q[2]!, ""]]),
            ),
            step(
              "Combine like terms: add the coefficients of each power of $x$.",
              lines(...[0, 1, 2].map((i) => r`${["x^2", "x", r`\text{numbers}`][i]}\text{: } & ${p[i]} + ${paren(sub ? -q[i]! : q[i]!)} = ${res[i]}`)),
            ),
            step(`So the result is $${quadratic(res[0]!, res[1]!, res[2]!)}$, and the coefficient of the ${which === 2 ? "constant term" : `$${names[which]}$ term`} is $${res[which]}$.`),
          ],
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
          solution: [
            step(
              "Multiply each term in the first bracket by each term in the second: First, Outer, Inner, Last.",
              lines(
                r`\text{First: } & ${a === 1 ? "" : a}x \cdot ${c === 1 ? "" : c}x = ${poly([[A, "x^2"]])}`,
                r`\text{Outer: } & ${a === 1 ? "" : a}x \cdot ${paren(d)} = ${poly([[a * d, "x"]])}`,
                r`\text{Inner: } & ${paren(b)} \cdot ${c === 1 ? "" : c}x = ${poly([[b * c, "x"]])}`,
                r`\text{Last: } & ${paren(b)} \cdot ${paren(d)} = ${C}`,
              ),
            ),
            step("Add the four products.", poly([[A, "x^2"], [a * d, "x"], [b * c, "x"], [C, ""]])),
            step(`Combine the two middle terms: $${a * d} + ${paren(b * c)} = ${B}$.`, quadratic(A, B, C)),
            step(`So $a = ${A}$, $b = ${B}$ and $c = ${C}$.`),
          ],
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
          solution: [
            step(`Find the biggest number that divides both coefficients: $${Math.abs(g * m)} = ${g}\\times${Math.abs(m)}$ and $${Math.abs(g * n)} = ${g}\\times${Math.abs(n)}$, so it's $${g}$.`),
            ...(power ? [step(`Both terms also contain $x$. The lowest power is $${power === 1 ? "x" : `x^{${power}}`}$, so take that out too.`, r`\text{GCF} = ${gcfTex}`)] : []),
            step(
              `Divide each term by $${gcfTex}$.`,
              lines(r`${poly([[g * m, power ? `x^{${power + 1}}` : "x"]])} \div ${gcfTex} &= ${poly([[m, "x"]])}`, r`${g * n} ${power ? (power === 1 ? "x" : `x^{${power}}`) : ""} \div ${gcfTex} &= ${n}`),
            ),
            step("Write the GCF outside a bracket holding what's left.", `${gcfTex}(${inner})`),
          ],
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
            solution: [
              step(`Both terms are perfect squares with a minus between them: a **difference of two squares**.`, `x^2 - ${k * k} = x^2 - ${k}^2`),
              step(`Use $a^2 - b^2 = (a - b)(a + b)$ with $a = x$ and $b = ${k}$.`, `(x - ${k})(x + ${k})`),
            ],
          };
        }
        const correct = `$${factor(-p)}${factor(-q)}$`;
        return {
          prompt: "Factor.",
          tex: quadratic(1, p + q, p * q),
          ...multipleChoice(rng, correct, [`$${factor(p)}${factor(q)}$`, `$${factor(-p)}${factor(q)}$`, `$${factor(p)}${factor(-q)}$`, `$${factor(-p * q === 0 ? 1 : -(p * q))}${factor(-1)}$`]),
          hints: [`Find two numbers with product ${p * q} and sum ${p + q}.`],
          solution: [...productSum(p, q), step("Each number goes in a bracket with $x$.", `${quadratic(1, p + q, p * q)} = ${factor(-p)}${factor(-q)}`)],
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
          solution: [
            ...(lead > 1 ? [step(`Divide both sides by $${lead}$ to make the $x^2$ coefficient $1$.`, `${quadratic(1, -(p + q), p * q)} = 0`)] : []),
            step(
              p * q === 0
                ? `There's no number on its own, so $x$ is a common factor: take it out.`
                : `Factor: find two numbers that multiply to $${p * q}$ and add to $${-(p + q)}$. $${-p}$ and $${-q}$ work.`,
              `${p === q ? `${factor(p)}^2` : `${factor(p)}${factor(q)}`} = 0`,
            ),
            step(
              "A product is zero only when one of its factors is zero. Set each factor to zero.",
              p === q
                ? r`${factor(p).replace(/[()]/g, "")} = 0 \;\Rightarrow\; x = ${p}`
                : lines(r`${factor(p).replace(/[()]/g, "")} = 0 &\;\Rightarrow\; x = ${p}`, r`${factor(q).replace(/[()]/g, "")} = 0 &\;\Rightarrow\; x = ${q}`),
            ),
            step(p === q ? "Both factors are the same, so there's one repeated solution." : "So the solutions are", p === q ? `x = ${p}` : r`x = ${p} \text{ or } x = ${q}`),
          ],
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
          solution:
            h === 0
              ? [
                  step(`There's no $x$ term, so this is already in vertex form $y = a(x - h)^2 + k$ with $h = 0$.`, `y = ${a === 1 ? "" : a === -1 ? "-" : a}x^2${k === 0 ? "" : signed(k)}`),
                  step("The vertex is at", `(0, ${k})`),
                ]
              : [
                  ...(a === 1
                    ? []
                    : [step(`Factor $${a}$ out of the two $x$ terms.`, `y = ${a === -1 ? "-" : a}(${quadratic(1, -2 * h, 0)})${signed(a * h * h + k)}`.replace(" + 0", ""))]),
                  step(
                    `Complete the square: half of $${-2 * h}$ is $${-h}$, and $${factor(h)}^2 = ${quadratic(1, -2 * h, h * h)}$. So $${quadratic(1, -2 * h, 0)}$ is that square minus $${h * h}$.`,
                    `${quadratic(1, -2 * h, 0)} = ${factor(h)}^2 - ${h * h}`,
                  ),
                  step(
                    a === 1 ? "Substitute it back and combine the numbers." : `Substitute it back, multiply out the $${a}$, and combine the numbers.`,
                    lines(
                      a === 1 ? `y &= ${factor(h)}^2 - ${h * h}${signed(h * h + k)}` : `y &= ${a === -1 ? "-" : a}\\left(${factor(h)}^2 - ${h * h}\\right)${signed(a * h * h + k)}`,
                      ...(a === 1 ? [] : [`&= ${a === -1 ? "-" : a}${factor(h)}^2${signed(-a * h * h)}${signed(a * h * h + k)}`]),
                      `&= ${a === 1 ? "" : a === -1 ? "-" : a}${factor(h)}^2${k === 0 ? "" : signed(k)}`,
                    ),
                  ),
                  step(`In vertex form $y = a(x - h)^2 + k$ the vertex is $(h, k)$. Careful with the sign: $${factor(h)}$ means $h = ${h}$.`, `(${h}, ${k})`),
                ],
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
            solution: [
              step("Read off the coefficients.", r`a = ${a}, \quad b = ${b}, \quad c = ${c}`),
              step("Substitute into the discriminant.", r`b^2 - 4ac = ${paren(b)}^2 - 4${times(1, a, c)} = ${b * b} - ${paren(4 * a * c)} = ${disc}`),
              step(
                disc > 0
                  ? `It's positive, so $\\pm\\sqrt{${disc}}$ gives two different values: there are $2$ real solutions.`
                  : disc === 0
                    ? "It's zero, so $\\pm\\sqrt{0}$ adds nothing: there is $1$ (repeated) real solution."
                    : "It's negative, and a negative number has no real square root: there are $0$ real solutions.",
              ),
            ],
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
          solution: [
            step("Read off the coefficients and write down the formula.", r`a = ${A},\ b = ${B},\ c = ${C} \qquad x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`),
            step("Work out the discriminant first.", r`b^2 - 4ac = ${paren(B)}^2 - 4${times(1, A, C)} = ${B * B} - ${paren(4 * A * C)} = ${D}`),
            step(`Substitute everything.${i !== D && D !== 0 ? ` (You can simplify $\\sqrt{${D}} = ${texRoot(o, i)}$.)` : ""}`, r`x = \frac{${-B} \pm ${D === 0 ? "0" : texRoot(o, i)}}{${2 * A}}`),
            D === 0
              ? step("The square root is $0$, so there's just one solution.", r`x = \frac{${-B}}{${2 * A}} = ${roots[0]}`)
              : Number.isInteger(Math.sqrt(D))
                ? step(
                    `$\\sqrt{${D}} = ${Math.sqrt(D)}$ exactly. Take the $+$ and the $-$ in turn.`,
                    lines(
                      r`x &= \frac{${-B} + ${Math.sqrt(D)}}{${2 * A}} = ${texFrac(-B + Math.sqrt(D), 2 * A)}${Number.isInteger((-B + Math.sqrt(D)) / (2 * A)) ? "" : r` \approx ${roots[0]}`}`,
                      r`x &= \frac{${-B} - ${Math.sqrt(D)}}{${2 * A}} = ${texFrac(-B - Math.sqrt(D), 2 * A)}${Number.isInteger((-B - Math.sqrt(D)) / (2 * A)) ? "" : r` \approx ${roots[1]}`}`,
                    ),
                  )
                : step(
                    `Use $\\sqrt{${D}} \\approx ${round(Math.sqrt(D), 4)}$ and take the $+$ and the $-$ in turn.`,
                    lines(
                      r`x &= \frac{${-B} + ${round(Math.sqrt(D), 4)}}{${2 * A}} \approx ${roots[0]}`,
                      r`x &= \frac{${-B} - ${round(Math.sqrt(D), 4)}}{${2 * A}} \approx ${roots[1]}`,
                    ),
                  ),
          ],
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
            solution: [
              step(`Multiply the top and bottom by $\\sqrt{${n}}$. That's multiplying by $1$, so the value doesn't change, and $\\sqrt{${n}}\\times\\sqrt{${n}} = ${n}$ clears the root from the bottom.`, r`\frac{${k}}{\sqrt{${n}}}\cdot\frac{\sqrt{${n}}}{\sqrt{${n}}} = \frac{${k}\sqrt{${n}}}{${n}}`),
              step(`Simplify the numbers: $${k}\\div${n} = ${m}$.`, r`\frac{${k}\sqrt{${n}}}{${n}} = ${root(m, n)}`),
            ],
          };
        }
        if (level === 2) {
          const a = rng.int(3, 5), plus = rng.chance(0.5), den = a * a - n;
          const over = (top: string, bottom: number) => (bottom === 1 ? top : `\\frac{${top}}{${bottom}}`);
          const conj = `${a} ${plus ? "-" : "+"} \\sqrt{${n}}`;
          return {
            prompt: "Rationalise the denominator.",
            tex: r`\frac{1}{${a} ${plus ? "+" : "-"} \sqrt{${n}}}`,
            ...multipleChoice(rng, `$${over(conj, den)}$`, [`$${over(`${a} ${plus ? "+" : "-"} \\sqrt{${n}}`, den)}$`, `$${over(conj, a * a + n)}$`, `$${over(conj, a - n || a)}$`]),
            hints: [`Multiply the top and bottom by the conjugate, ${conj.replace("\\sqrt", "√").replace(/[{}]/g, "")}.`, "The bottom becomes a² − b."],
            solution: [
              step(`Multiply the top and bottom by the **conjugate** $${conj}$: the same two terms with the opposite sign.`, r`\frac{1}{${a} ${plus ? "+" : "-"} \sqrt{${n}}}\cdot\frac{${conj}}{${conj}}`),
              step("The bottom is a difference of two squares, so the root disappears.", r`(${a} ${plus ? "+" : "-"} \sqrt{${n}})(${conj}) = ${a}^2 - (\sqrt{${n}})^2 = ${a * a} - ${n} = ${den}`),
              step("Put it together.", over(conj, den)),
            ],
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
            solution: [
              step("This is $(p + q)(p - q)$, which always equals $p^2 - q^2$: the middle terms cancel.", r`(${a} + \sqrt{${n}})(${a} - \sqrt{${n}}) = ${a}^2 - (\sqrt{${n}})^2`),
              step(`Squaring a square root undoes it: $(\\sqrt{${n}})^2 = ${n}$.`, r`${a * a} - ${n} = ${a * a - n}`),
            ],
          };
        }
        return {
          prompt: `Rationalise the numerator, then find the value the expression approaches as $x \\to 0$.`,
          tex: r`\frac{\sqrt{x + ${c * c}} - ${c}}{x}`,
          answer: numberAnswer(1 / (2 * c)),
          inputHint: "e.g. 1/6",
          hints: [`Multiply the top and bottom by √(x + ${c * c}) + ${c}.`, "The x on top cancels with the x on the bottom."],
          solution: rationalisedLimit(c),
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
            solution: [
              step(`By the remainder theorem, the remainder on dividing by $${factor(k)}$ is $p(${k})$: the divisor is zero at $x = ${k}$.`),
              step(`Substitute $x = ${k}$.`, substitute(`p(${k})`, cs.map((c, i) => [c, 3 - i] as [number, number]), k).tex),
              step(`So the remainder is $${value}$.`),
            ],
          };
        }
        if (level === 2) {
          const [r1, r2, r3] = rng.shuffle([-5, -4, -3, -2, -1, 1, 2, 3, 4, 5]) as [number, number, number];
          const cs = [1, -(r1 + r2 + r3), r1 * r2 + r1 * r3 + r2 * r3, -r1 * r2 * r3];
          // Synthetic division by (x - r1): each entry is the next coefficient plus r1 times the last entry.
          const q = cs.reduce<number[]>((acc, c, i) => [...acc, i === 0 ? c : c + r1 * acc[i - 1]!], []);
          return {
            prompt: `Given that $${factor(r1)}$ is a factor of $p(x) = ${cubic(cs)}$, solve $p(x) = 0$. Enter every solution.`,
            answer: { kind: "set", values: [r1, r2, r3] },
            inputHint: "e.g. -2, 1, 3",
            hints: [`Divide p(x) by ${factor(r1)} to get a quadratic.`, "Factor the quadratic and set each factor equal to zero."],
            solution: [
              step(
                `Divide by $${factor(r1)}$ with synthetic division: write $${r1}$ and the coefficients, bring down the first, then multiply by $${r1}$ and add, column by column.`,
                r`\begin{array}{r|rrrr} ${r1} & ${cs.join(" & ")} \\ & & ${q.slice(0, 3).map((v) => v * r1).join(" & ")} \\ \hline & ${q.join(" & ")} \end{array}`,
              ),
              step("The last number is the remainder, $0$, as expected. The others are the coefficients of the quotient.", `p(x) = ${factor(r1)}(${quadratic(1, -(r2 + r3), r2 * r3)})`),
              step(`Factor the quadratic: $${-r2}$ and $${-r3}$ multiply to $${r2 * r3}$ and add to $${-(r2 + r3)}$.`, `p(x) = ${factor(r1)}${factor(r2)}${factor(r3)}`),
              step("Set each factor to zero.", r`x = ${r1}, \; ${r2}, \; ${r3}`),
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
          solution: [
            step(`By the factor theorem, $${factor(a)}$ is a factor exactly when $p(${a}) = 0$. Substitute $x = ${a}$.`, `p(${a}) = (${a})^3${b === 0 ? "" : ` ${b < 0 ? "-" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}(${a})^2`} + k(${a})${c === 0 ? "" : signed(c)}`),
            step("Work out the numbers.", `p(${a}) = ${joinSigned([a ** 3, b * a * a, ...(c === 0 ? [] : [c])])} ${a < 0 ? "-" : "+"} ${ka} = ${known} ${a < 0 ? "-" : "+"} ${ka}`),
            step("Set it equal to zero and solve for $k$.", lines(`${known} ${a < 0 ? "-" : "+"} ${ka} &= 0`, `${a === 1 ? "" : a === -1 ? "-" : a}k &= ${-known}`, `k &= ${k}`)),
          ],
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
          solution: [
            step(`Factor the top: $${p}$ and $${q}$ multiply to $${p * q}$ and add to $${p + q}$.`, `${quadratic(1, p + q, p * q)} = ${factor(-p)}${factor(-q)}`),
            step(`Factor the bottom: $${p}$ and $${s}$ multiply to $${p * s}$ and add to $${p + s}$.`, `${quadratic(1, p + s, p * s)} = ${factor(-p)}${factor(-s)}`),
            step(`Both share the factor $${factor(-p)}$, so cancel it (this is valid as long as $x \\ne ${-p}$).`, r`\frac{${factor(-p)}${factor(-q)}}{${factor(-p)}${factor(-s)}} = \frac{${factor(-q).replace(/^\(|\)$/g, "")}}{${factor(-s).replace(/^\(|\)$/g, "")}}`),
          ],
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
            solution: [
              step(`Factor $x^2 - ${p * p}$ as a difference of two squares.`, r`\frac{(${linear(1, -p)})(${linear(1, p)})}{${linear(1, q)}}\cdot\frac{${linear(1, q)}}{${linear(1, -p)}}`),
              step(`Cancel factors that appear on both the top and the bottom: $(${linear(1, -p)})$ and $(${linear(1, q)})$.`, linear(1, p)),
            ],
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
            solution: [
              step(`The common denominator is $${den}$. Multiply the first fraction top and bottom by $(${linear(1, c)})$, and the second by $x$.`, r`\frac{${a}(${linear(1, c)})}{${den}} + \frac{${b}x}{${den}}`),
              step("Add the numerators over the common denominator.", r`\frac{${a}(${linear(1, c)}) + ${b}x}{${den}}`),
              step("Expand the top and collect like terms.", r`\frac{${poly([[a, "x"], [a * c, ""], [b, "x"]])}}{${den}} = \frac{${linear(a + b, a * c)}}{${den}}`),
            ],
          };
        if (rng.chance(0.5))
          return {
            prompt: "Write as a single fraction.",
            tex: r`\frac{${a}}{x} - \frac{${a}}{${linear(1, c)}}`,
            ...multipleChoice(rng, `$\\frac{${a * c}}{${den}}$`, [`$\\frac{${-a * c}}{${den}}$`, `$\\frac{${a * c}}{${linear(1, c)}}$`, "$0$"]),
            hints: ["Use the common denominator x(x + c).", "Be careful with the minus sign in front of the second fraction."],
            solution: [
              step(`The common denominator is $${den}$. Rewrite both fractions over it.`, r`\frac{${a}(${linear(1, c)})}{${den}} - \frac{${a}x}{${den}}`),
              step("Subtract the numerators. The minus applies to the whole second numerator.", r`\frac{${a}(${linear(1, c)}) - ${a}x}{${den}} = \frac{${poly([[a, "x"], [a * c, ""], [-a, "x"]])}}{${den}}`),
              step("The $x$ terms cancel.", r`\frac{${a * c}}{${den}}`),
            ],
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
            solution: vertical
              ? [
                  step("A vertical asymptote is where the denominator is zero but the top isn't: the fraction blows up there."),
                  step(`Set the denominator to zero (the top, $${a}$, is never zero).`, r`${linear(1, -p)} = 0 \;\Rightarrow\; x = ${p}`),
                ]
              : [
                  step(`As $x$ gets huge (positive or negative), the bottom $${linear(1, -p)}$ gets huge, so $\\frac{${a}}{${linear(1, -p)}}$ shrinks towards $0$.`),
                  step(`That leaves just the constant${k === 0 ? " (here $0$)" : ""}, so the graph levels off at`, `y = ${k}`),
                ],
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
              step(`Factor the denominator: $${-r0}$ and $${-s}$ multiply to $${r0 * s}$ and add to $${-(r0 + s)}$.`, `${quadratic(1, -(r0 + s), r0 * s)} = ${factor(r0)}${factor(s)}`),
              step(`Cancel the factor $${factor(r0)}$ that's also on top.`, r`\frac{${linear(1, -r0)}}{${factor(r0)}${factor(s)}} = \frac{1}{${linear(1, -s)}}, \quad x \ne ${r0}`),
              step(
                hole
                  ? `The cancelled factor $${factor(r0)}$ leaves a gap in the graph (a hole), not an asymptote: $f$ just isn't defined at $x = ${r0}$.`
                  : `The factor $${factor(s)}$ is still on the bottom, so the graph shoots off to infinity there: that's the asymptote.`,
                `x = ${hole ? r0 : s}`,
              ),
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
          solution: [
            step(`For huge $x$, only the highest power on the top and on the bottom matters. Here that's $${lower ? linear(a, 0) : poly([[a, "x^2"]])}$ on top and $${poly([[d, "x^2"]])}$ on the bottom.`),
            lower
              ? step(`So $f(x)$ behaves like $\\frac{${linear(a, 0)}}{${poly([[d, "x^2"]])}} = \\frac{${a}}{${d === 1 ? "" : d}x}$, which shrinks to $0$ as $x$ grows.`, "y = 0")
              : step(`So $f(x)$ behaves like $\\frac{${poly([[a, "x^2"]])}}{${poly([[d, "x^2"]])}}$: the $x^2$ cancels, leaving the ratio of the leading coefficients.`, r`y = \frac{${a}}{${d}}${texFrac(a, d) === r`\frac{${a}}{${d}}` ? "" : ` = ${texFrac(a, d)}`}`),
          ],
        };
      },
    },
  ],
};
