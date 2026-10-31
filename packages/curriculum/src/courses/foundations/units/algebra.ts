import { example, key, math, multipleChoice, numberAnswer, rule, step, text, tip, visual, warn } from "../../../core/builders";
import { linear, paren, poly, signed } from "../../../core/math";
import type { Unit } from "../../../core/types";

const r = String.raw;

export const algebra: Unit = {
  id: "algebra",
  title: "Algebra Foundations",
  icon: "Variable",
  description: "Variables, expressions, and solving equations and inequalities.",
  exercises: [
    {
      id: "expressions",
      title: "Variables & Expressions",
      summary: "Letters that stand for numbers, and translating words into algebra.",
      prerequisites: ["order-of-operations"],
      estimatedMinutes: 6,
      expectedSeconds: 35,
      keyIdeas: ["A variable is a placeholder for a number.", "$3x$ means $3 \\times x$."],
      lesson: [
        text("A **variable** is a letter standing in for a number we don't know yet, or one that can change. An **expression** combines numbers and variables with operations, like $3x + 5$."),
        text("Algebra has shorthand: $3x$ means $3 \\times x$, $\\frac{x}{2}$ means $x \\div 2$, and $x^2$ means $x \\times x$."),
        example("Write an expression: *five less than twice a number $n$*.", ["\"Twice a number\" is $2n$.", ["\"Five less than\" subtracts 5 from it.", r`2n - 5`]]),
        warn("\"5 less than $x$\" is $x - 5$, not $5 - x$. Order matters for subtraction."),
      ],
      generate: (rng, level) => {
        const a = rng.int(2, 9), b = rng.int(2, 12);
        const options: [string, string, string[]][] = [
          [`${b} more than ${a} times a number $x$`, `$${a}x + ${b}$`, [`$${b}x + ${a}$`, `$${a}(x + ${b})$`, `$${a} + ${b}x$`]],
          [`${b} less than ${a} times a number $x$`, `$${a}x - ${b}$`, [`$${b} - ${a}x$`, `$${a}(x - ${b})$`, `$${b}x - ${a}$`]],
          [`${a} times the sum of a number $x$ and ${b}`, `$${a}(x + ${b})$`, [`$${a}x + ${b}$`, `$${a} + x + ${b}$`, `$x + ${a * b}$`]],
          [`the square of a number $x$, decreased by ${b}`, `$x^2 - ${b}$`, [`$(x - ${b})^2$`, `$2x - ${b}$`, `$${b} - x^2$`]],
        ];
        if (level >= 2) options.push([`the quotient of a number $x$ and ${a}, increased by ${b}`, `$\\frac{x}{${a}} + ${b}$`, [`$\\frac{x + ${b}}{${a}}$`, `$\\frac{${a}}{x} + ${b}$`, `$${a}x + ${b}$`]]);
        const [words, correct, wrong] = rng.pick(options);
        return {
          prompt: `Which expression means: *${words}*?`,
          ...multipleChoice(rng, correct, wrong),
          hints: ["Translate piece by piece.", "Watch for \"less than\" — it reverses the order."],
          solution: [step(`The expression is ${correct}.`)],
        };
      },
    },
    {
      id: "evaluating-expressions",
      title: "Evaluating Expressions",
      summary: "Substituting values into expressions.",
      prerequisites: ["expressions", "multiply-divide-integers"],
      estimatedMinutes: 6,
      expectedSeconds: 40,
      keyIdeas: ["Replace each variable with its value, in brackets.", "Then follow the order of operations."],
      lesson: [
        text("To **evaluate** an expression, substitute each variable's value and calculate. Always wrap substituted values in brackets — it prevents sign mistakes."),
        example("Evaluate $2x^2 - 3y$ when $x = -3,\\ y = 4$.", [["Substitute with brackets.", r`2(-3)^2 - 3(4)`], ["Exponent first.", r`2(9) - 12`], ["Finish.", r`18 - 12 = 6`]]),
        tip("$(-3)^2 = 9$ but $-3^2 = -9$. Brackets protect you."),
      ],
      generate: (rng, level) => {
        const x = rng.nonZero(level === 1 ? 1 : -6, 6), y = rng.nonZero(-5, 5);
        const a = rng.int(2, 6), b = rng.nonZero(-7, 7), c = rng.int(1, 5);
        const forms: [string, number, string][] = [[linear(a, b), a * x + b, r`${a}${paren(x)}${signed(b)}`]];
        if (level >= 2) forms.push([r`${a}x^2 ${b < 0 ? "-" : "+"} ${Math.abs(b)}x`, a * x * x + b * x, r`${a}${paren(x)}^2 ${b < 0 ? "-" : "+"} ${Math.abs(b)}${paren(x)}`]);
        if (level === 3) forms.push([r`x^2 + ${c}xy - y^2`, x * x + c * x * y - y * y, r`${paren(x)}^2 + ${c}${paren(x)}${paren(y)} - ${paren(y)}^2`]);
        const [tex, ans, sub] = rng.pick(forms);
        return {
          prompt: `Evaluate when $x = ${x}${level === 3 ? `,\\ y = ${y}` : ""}$.`,
          tex,
          answer: numberAnswer(ans),
          hints: ["Substitute with brackets.", "Follow the order of operations."],
          solution: [step("Substitute.", sub), step("Calculate.", `${ans}`)],
        };
      },
    },
    {
      id: "like-terms",
      title: "Combining Like Terms",
      summary: "Simplifying by grouping terms with the same variable part.",
      prerequisites: ["evaluating-expressions", "add-subtract-integers"],
      estimatedMinutes: 7,
      expectedSeconds: 40,
      keyIdeas: ["Like terms have identical variable parts.", "Add their coefficients; keep the variable part."],
      lesson: [
        text("**Like terms** have exactly the same variable part: $3x$ and $-5x$ are like terms; $3x$ and $3x^2$ are not. Combine like terms by adding their **coefficients**."),
        math(r`4x + 7 - 2x + 3 \;=\; (4 - 2)x + (7 + 3) \;=\; 2x + 10`),
        tip("Think of $x$ as a unit, like apples: 4 apples − 2 apples = 2 apples. You can't merge apples and pears ($x$ and $x^2$)."),
        example("Simplify $3a^2 - 2a + 5a^2 + 7a$.", [["Group like terms.", r`(3a^2 + 5a^2) + (-2a + 7a)`], ["Combine.", r`8a^2 + 5a`]]),
      ],
      generate: (rng, level) => {
        const a = rng.nonZero(-9, 9), b = rng.nonZero(-9, 9), c = rng.nonZero(-9, 9), d = rng.nonZero(-9, 9);
        if (level === 3) {
          const e = rng.nonZero(-5, 5), f = rng.nonZero(-5, 5);
          const tex = poly([[a, "x^2"], [b, "x"], [c, "x^2"], [d, ""], [e, "x"], [f, ""]]);
          return {
            prompt: "Simplify. Enter the coefficient of $x$.",
            tex,
            answer: numberAnswer(b + e),
            hints: ["Group the $x$ terms only."],
            solution: [step("Combine like terms.", poly([[a + c, "x^2"], [b + e, "x"], [d + f, ""]]))],
          };
        }
        const tex = poly([[a, "x"], [c, ""], [b, "x"], [d, ""]]);
        const correct = `$${linear(a + b, c + d)}$`;
        return {
          prompt: "Simplify.",
          tex,
          ...multipleChoice(rng, correct, [`$${linear(a + b + c + d, 0)}$`, `$${linear(a - b, c + d)}$`, `$${linear(a + b, c - d)}$`, `$${linear(c + d, a + b)}$`]),
          hints: ["Collect the $x$ terms, then the constants."],
          solution: [step("Combine coefficients.", linear(a + b, c + d))],
        };
      },
    },
    {
      id: "distributive-property",
      title: "The Distributive Property",
      summary: "Expanding brackets: $a(b + c) = ab + ac$.",
      prerequisites: ["like-terms", "multiply-divide-integers"],
      estimatedMinutes: 7,
      expectedSeconds: 40,
      keyIdeas: ["Multiply the outside term by **every** term inside.", "A minus outside flips every sign inside."],
      lesson: [
        rule("Distributive property", r`a(b + c) = ab + ac`),
        visual({ type: "areaModel", a: 3, b: 7 }, "Area model: a rectangle $3$ by $(5 + 2)$ is $3\\cdot5 + 3\\cdot2$."),
        example("Expand and simplify $4(2x - 3) - 2(x - 5)$.", [["Distribute each bracket.", r`8x - 12 - 2x + 10`], ["Combine like terms.", r`6x - 2`]]),
        warn("$-2(x - 5) = -2x + 10$. The negative multiplies **both** terms."),
      ],
      generate: (rng, level) => {
        const a = rng.nonZero(-6, 6), b = rng.int(1, 6), c = rng.nonZero(-9, 9);
        if (level === 1)
          return {
            prompt: `Expand $${a}(${linear(b, c)})$. Enter the constant term.`,
            answer: numberAnswer(a * c),
            hints: [`Multiply ${a} by each term inside.`],
            solution: [step("Distribute.", linear(a * b, a * c))],
          };
        const d = rng.nonZero(-5, 5), e = rng.int(1, 4), f = rng.nonZero(-6, 6);
        const k = a * b + d * e, m = a * c + d * f;
        return {
          prompt: "Expand and simplify. Enter your answer as $ax + b$ by giving $(a, b)$.",
          tex: r`${a}(${linear(b, c)}) ${d < 0 ? "-" : "+"} ${Math.abs(d)}(${linear(e, f)})`,
          answer: { kind: "tuple", values: [k, m] },
          inputHint: "e.g. 6, -2",
          hints: ["Distribute each bracket separately.", "Then combine like terms."],
          solution: [step("Distribute.", poly([[a * b, "x"], [a * c, ""], [d * e, "x"], [d * f, ""]])), step("Combine.", linear(k, m))],
        };
      },
    },
    {
      id: "one-step-equations",
      title: "One-Step Equations",
      summary: "Undo one operation to find the unknown.",
      prerequisites: ["expressions"],
      estimatedMinutes: 6,
      expectedSeconds: 25,
      keyIdeas: ["An equation is a balance.", "Do the inverse operation to both sides."],
      lesson: [
        text("An equation says two things are **equal** — like a balanced scale. Whatever you do to one side, do to the other, and it stays balanced."),
        visual({ type: "balance", left: "x + 5", right: "12", note: "Subtract 5 from both pans" }),
        rule("Inverse operations", r`+ \leftrightarrow - \qquad \times \leftrightarrow \div`),
        example("Solve $x + 5 = 12$.", [["Subtract 5 from both sides.", r`x = 12 - 5 = 7`]]),
        tip("Always check by substituting back: $7 + 5 = 12$ ✓"),
      ],
      generate: (rng, level) => {
        const x = rng.int(level === 1 ? 1 : -15, 15), a = rng.int(2, 12);
        const forms: [string, string][] = [
          [`x + ${a} = ${x + a}`, `Subtract ${a} from both sides.`],
          [`x - ${a} = ${x - a}`, `Add ${a} to both sides.`],
          [`${a}x = ${a * x}`, `Divide both sides by ${a}.`],
          [r`\frac{x}{${a}} = ${x}`, `Multiply both sides by ${a}.`],
        ];
        const [tex, hint] = rng.pick(forms);
        const ans = tex.startsWith(r`\frac`) ? x * a : x;
        return {
          prompt: "Solve for $x$.",
          tex,
          visual: level === 1 ? { type: "balance", left: tex.split(" = ")[0]!, right: tex.split(" = ")[1]! } : undefined,
          answer: numberAnswer(ans),
          hints: ["What operation is being done to x? Undo it.", hint],
          solution: [step(hint, `x = ${ans}`)],
        };
      },
    },
    {
      id: "two-step-equations",
      title: "Two-Step Equations",
      summary: "Undo addition/subtraction first, then multiplication/division.",
      prerequisites: ["one-step-equations", "add-subtract-integers"],
      estimatedMinutes: 7,
      expectedSeconds: 40,
      keyIdeas: ["Undo operations in reverse order.", "Add/subtract first, then multiply/divide."],
      lesson: [
        text("To build $3x - 4$, you multiply by 3 then subtract 4. To **unbuild** it, reverse the steps: add 4, then divide by 3."),
        visual({ type: "balance", left: "3x − 4", right: "11" }),
        example("Solve $3x - 4 = 11$.", [["Add 4 to both sides.", r`3x = 15`], ["Divide by 3.", r`x = 5`]]),
        example("Solve $\\frac{x}{2} + 7 = 3$.", [["Subtract 7.", r`\frac{x}{2} = -4`], ["Multiply by 2.", r`x = -8`]]),
      ],
      generate: (rng, level) => {
        const x = rng.int(-10, 12), a = rng.nonZero(level === 1 ? 2 : -9, 9), b = rng.nonZero(-15, 15);
        if (level === 3 && rng.chance(0.5)) {
          const d = rng.int(2, 5);
          const xx = d * rng.int(-6, 6);
          return {
            prompt: "Solve for $x$.",
            tex: r`\frac{x${signed(b)}}{${d}} = ${(xx + b) / d}`,
            answer: numberAnswer(xx),
            hints: [`Multiply both sides by ${d} first.`],
            solution: [step(`Multiply by ${d}.`, r`x${signed(b)} = ${xx + b}`), step("Isolate x.", `x = ${xx}`)],
          };
        }
        return {
          prompt: "Solve for $x$.",
          tex: `${linear(a, b)} = ${a * x + b}`,
          answer: numberAnswer(x),
          hints: [`${b > 0 ? "Subtract" : "Add"} ${Math.abs(b)} on both sides.`, `Then divide by ${a}.`],
          solution: [step("Undo the constant.", r`${a}x = ${a * x}`), step(`Divide by ${a}.`, `x = ${x}`)],
        };
      },
    },
    {
      id: "multi-step-equations",
      title: "Multi-Step Equations",
      summary: "Brackets and variables on both sides.",
      prerequisites: ["two-step-equations", "distributive-property"],
      estimatedMinutes: 10,
      expectedSeconds: 70,
      keyIdeas: ["Expand brackets, collect $x$ terms on one side, constants on the other.", "Some equations have no solution or infinitely many."],
      lesson: [
        text("Strategy: **simplify each side**, then **gather** all $x$ terms on one side and numbers on the other, then **divide**."),
        example("Solve $5x - 3 = 2x + 9$.", [["Subtract $2x$ from both sides.", r`3x - 3 = 9`], ["Add 3.", r`3x = 12`], ["Divide.", r`x = 4`]]),
        example("Solve $2(x + 4) = 3(x - 1)$.", [["Expand.", r`2x + 8 = 3x - 3`], ["Gather.", r`11 = x`]]),
        key("If the $x$'s cancel and you get a false statement like $3 = 7$, there's **no solution**. A true statement like $3 = 3$ means **every** $x$ works."),
      ],
      generate: (rng, level) => {
        const x = rng.int(-8, 10);
        let a = rng.nonZero(-7, 9), c = rng.nonZero(-7, 9);
        while (a === c) c = rng.nonZero(-7, 9);
        const b = rng.int(-12, 12);
        const d = a * x + b - c * x;
        if (level >= 2) {
          const k = rng.int(2, 4);
          const p = rng.int(-6, 6);
          const rhsConst = k * (x + p) - c * x;
          return {
            prompt: "Solve for $x$.",
            tex: r`${k}(x${signed(p)}) = ${linear(c, rhsConst)}`,
            answer: numberAnswer(x),
            hints: ["Expand the bracket first.", "Move the x terms to one side."],
            solution: [step("Expand.", r`${linear(k, k * p)} = ${linear(c, rhsConst)}`), step("Collect and solve.", `x = ${x}`)],
          };
        }
        return {
          prompt: "Solve for $x$.",
          tex: `${linear(a, b)} = ${linear(c, d)}`,
          answer: numberAnswer(x),
          hints: [`Subtract ${c}x from both sides.`, "Then solve the two-step equation."],
          solution: [step("Gather x terms.", r`${linear(a - c, b)} = ${d}`), step("Solve.", `x = ${x}`)],
        };
      },
    },
    {
      id: "inequalities",
      title: "Linear Inequalities",
      summary: "Solving and graphing $<,\\ \\le,\\ >,\\ \\ge$.",
      prerequisites: ["two-step-equations", "negative-numbers"],
      estimatedMinutes: 9,
      expectedSeconds: 50,
      keyIdeas: ["Solve like an equation…", "…but **flip the sign** when multiplying or dividing by a negative."],
      lesson: [
        text("An inequality describes a **range** of values. $x > 2$ means every number greater than 2. On a number line an open circle means the endpoint is excluded; a filled circle means it's included."),
        visual({ type: "numberLine", min: -5, max: 8, step: 1, highlight: { from: 2, to: 8, tone: "primary", openStart: true } }, "$x > 2$"),
        rule("The flip rule", r`-2x < 6 \;\Rightarrow\; x > -3`, "Multiplying or dividing both sides by a **negative** reverses the inequality."),
        text("Why? $2 < 5$, but $-2 > -5$. Negation mirrors the number line, which reverses order."),
        example("Solve $4 - 3x \\ge 13$.", [["Subtract 4.", r`-3x \ge 9`], ["Divide by $-3$ and flip.", r`x \le -3`]]),
      ],
      generate: (rng, level) => {
        const x = rng.int(-6, 6), a = rng.nonZero(level === 1 ? 2 : -6, 6), b = rng.int(-10, 10);
        const sym = rng.pick(["<", ">", r`\le`, r`\ge`] as const);
        const flip = a < 0;
        const flipped = { "<": ">", ">": "<", [r`\le`]: r`\ge`, [r`\ge`]: r`\le` }[sym]!;
        const final = flip ? flipped : sym;
        const correct = `$x ${final} ${x}$`;
        return {
          prompt: "Solve the inequality.",
          tex: `${linear(a, b)} ${sym} ${a * x + b}`,
          ...multipleChoice(rng, correct, [`$x ${flip ? sym : flipped} ${x}$`, `$x ${final} ${-x}$`, `$x ${final} ${x + 1}$`]),
          hints: ["Solve it like an equation.", a < 0 ? "You'll divide by a negative — flip the sign!" : "Dividing by a positive keeps the sign."],
          solution: [step(`Isolate $${a}x$.`, r`${a}x ${sym} ${a * x}`), step(`Divide by ${a}${flip ? " and flip" : ""}.`, `x ${final} ${x}`)],
        };
      },
    },
    {
      id: "literal-equations",
      title: "Rearranging Formulas",
      summary: "Solving for one variable in terms of others.",
      prerequisites: ["multi-step-equations"],
      estimatedMinutes: 8,
      expectedSeconds: 55,
      keyIdeas: ["Treat the other letters as numbers.", "Use the same inverse operations."],
      lesson: [
        text("Formulas like $A = lw$ or $v = u + at$ can be rearranged to make any letter the **subject**. Treat every other letter as if it were a number."),
        example("Make $t$ the subject of $v = u + at$.", [["Subtract $u$.", r`v - u = at`], ["Divide by $a$.", r`t = \frac{v - u}{a}`]]),
        example("Make $r$ the subject of $A = \\pi r^2$.", [["Divide by $\\pi$.", r`\frac{A}{\pi} = r^2`], ["Square root.", r`r = \sqrt{\frac{A}{\pi}}`]]),
      ],
      generate: (rng) => {
        const options: [string, string, string, string[]][] = [
          ["v = u + at", "t", r`t = \frac{v - u}{a}`, [r`t = \frac{v + u}{a}`, r`t = v - \frac{u}{a}`, r`t = a(v - u)`]],
          ["P = 2l + 2w", "w", r`w = \frac{P - 2l}{2}`, [r`w = P - l`, r`w = \frac{P}{2} - 2l`, r`w = 2(P - l)`]],
          ["y = mx + c", "x", r`x = \frac{y - c}{m}`, [r`x = \frac{y}{m} - c`, r`x = m(y - c)`, r`x = \frac{y + c}{m}`]],
          ["A = \\tfrac{1}{2}bh", "h", r`h = \frac{2A}{b}`, [r`h = \frac{A}{2b}`, r`h = 2Ab`, r`h = \frac{b}{2A}`]],
          ["F = \\tfrac{9}{5}C + 32", "C", r`C = \frac{5}{9}(F - 32)`, [r`C = \frac{9}{5}(F - 32)`, r`C = \frac{5}{9}F - 32`, r`C = \frac{5F}{9} + 32`]],
        ];
        const [formula, v, correct, wrong] = rng.pick(options);
        return {
          prompt: `Make $${v}$ the subject of $${formula}$.`,
          ...multipleChoice(rng, `$${correct}$`, wrong.map((w) => `$${w}$`)),
          hints: [`Undo whatever is happening to ${v}, in reverse order.`],
          solution: [step("Apply inverse operations.", correct)],
        };
      },
    },
  ],
};
