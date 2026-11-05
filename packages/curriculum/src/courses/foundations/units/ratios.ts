import { example, key, numberAnswer, rule, step, text, tip, visual } from "../../../core/builders";
import { gcd } from "../../../core/math";
import type { Unit } from "../../../core/types";

const r = String.raw;

export const ratios: Unit = {
  id: "ratios",
  title: "Ratios & Proportions",
  icon: "Scale",
  description: "Comparing quantities, rates, and solving proportions.",
  exercises: [
    {
      id: "ratios",
      title: "Ratios",
      summary: "Comparing parts, simplifying, and sharing in a ratio.",
      prerequisites: ["equivalent-fractions"],
      estimatedMinutes: 7,
      expectedSeconds: 40,
      keyIdeas: ["$a : b$ compares two quantities.", "To share in a ratio, find the value of one part."],
      lesson: [
        text("A **ratio** compares quantities. If a recipe uses 2 cups of flour for every 3 cups of milk, the ratio of flour to milk is $2 : 3$. Like fractions, ratios simplify: $10 : 15 = 2 : 3$."),
        visual({ type: "tapeDiagram", parts: [{ label: "flour", value: 2, tone: "primary" }, { label: "milk", value: 3, tone: "accent" }] }, "Two parts to three parts."),
        example("Share £45 in the ratio $2 : 3$.", ["There are $2 + 3 = 5$ parts.", ["One part is worth", r`45 \div 5 = 9`], ["So the shares are", r`2\times9 = 18 \quad\text{and}\quad 3\times9 = 27`]]),
        tip("A ratio $a:b$ means the first quantity is $\\frac{a}{a+b}$ of the total."),
      ],
      generate: (rng, level) => {
        const a = rng.int(1, 7), b = rng.int(1, 7);
        const g = gcd(a, b);
        const [p, q] = [a / g, b / g];
        if (level === 1) {
          const k = rng.int(2, 8);
          return {
            prompt: `Simplify the ratio $${p * k} : ${q * k}$. Enter the **first** number of the simplified ratio.`,
            answer: numberAnswer(p),
            hints: [`Divide both sides by their GCF, ${k * gcd(p, q)}.`],
            solution: [
              step(`Find the greatest common factor of $${p * k}$ and $${q * k}$: it's $${k}$.`, r`${p * k} = ${k}\times${p}, \quad ${q * k} = ${k}\times${q}`),
              step(`Divide both parts by $${k}$. The ratio stays the same, just in smaller numbers.`, r`${p * k}:${q * k} = ${p}:${q}`),
              step(`$${p}$ and $${q}$ share no common factor, so it's fully simplified. The first number is $${p}$.`),
            ],
          };
        }
        const unit = rng.int(2, 15);
        const total = (p + q) * unit;
        return {
          prompt: `Share $${total}$ in the ratio $${p} : ${q}$. What is the **larger** share?`,
          answer: numberAnswer(Math.max(p, q) * unit),
          visual: { type: "tapeDiagram", parts: [{ label: `${p} parts`, value: p, tone: "primary" }, { label: `${q} parts`, value: q, tone: "accent" }], totalLabel: `${total}` },
          hints: [`Total parts: ${p} + ${q} = ${p + q}.`, `One part = ${total} ÷ ${p + q}.`],
          solution: [
            step("Add the parts of the ratio to find how many equal parts there are in total.", `${p} + ${q} = ${p + q}`),
            step(`Share $${total}$ equally between those $${p + q}$ parts to find one part.`, r`${total}\div${p + q} = ${unit}`),
            step(`The larger share has $${Math.max(p, q)}$ part${Math.max(p, q) > 1 ? "s" : ""}.`, r`${Math.max(p, q)}\times${unit} = ${Math.max(p, q) * unit}`),
            step(`Check: the other share is $${Math.min(p, q)}\\times${unit} = ${Math.min(p, q) * unit}$, and the shares add back up.`, `${Math.max(p, q) * unit} + ${Math.min(p, q) * unit} = ${total}`),
          ],
        };
      },
    },
    {
      id: "unit-rates",
      title: "Rates & Unit Rates",
      summary: "Per-one comparisons: speed, price per item.",
      prerequisites: ["ratios", "decimal-arithmetic"],
      estimatedMinutes: 6,
      expectedSeconds: 40,
      keyIdeas: ["A unit rate is \"per one\".", "speed = distance ÷ time"],
      lesson: [
        text("A **rate** compares quantities with different units, like $150$ km in $3$ hours. A **unit rate** scales it to one unit: $50$ km **per** hour."),
        rule("Speed, distance, time", r`\text{speed} = \frac{\text{distance}}{\text{time}}`),
        example("Which is the better deal: 6 apples for £2.40 or 10 apples for £3.80?", [["Price per apple, first offer.", r`2.40 \div 6 = 0.40`], ["Second offer.", r`3.80 \div 10 = 0.38`], "The 10-pack is cheaper per apple."]),
      ],
      generate: (rng, level) => {
        const rate = level === 1 ? rng.int(2, 12) : rng.int(15, 90);
        const t = rng.int(2, 9);
        const ctx = rng.pick([
          { what: "km", per: "hour", verb: "A car travels" },
          { what: "pages", per: "minute", verb: "A printer prints" },
          { what: "litres", per: "minute", verb: "A tap fills" },
        ]);
        if (level === 3) {
          const t2 = rng.int(2, 12);
          return {
            prompt: `${ctx.verb} $${rate * t}$ ${ctx.what} in $${t}$ ${ctx.per}s. At the same rate, how many ${ctx.what} in $${t2}$ ${ctx.per}s?`,
            answer: numberAnswer(rate * t2),
            hints: ["Find the unit rate first.", `Then multiply by ${t2}.`],
            solution: [
              step(`Find the unit rate: how many ${ctx.what} in **one** ${ctx.per}.`, r`${rate * t}\div${t} = ${rate}\text{ ${ctx.what} per ${ctx.per}}`),
              step(`Multiply by the number of ${ctx.per}s you want.`, r`${rate}\times${t2} = ${rate * t2}\text{ ${ctx.what}}`),
            ],
          };
        }
        return {
          prompt: `${ctx.verb} $${rate * t}$ ${ctx.what} in $${t}$ ${ctx.per}s. How many ${ctx.what} per ${ctx.per}?`,
          answer: numberAnswer(rate),
          hints: [`Divide ${rate * t} by ${t}.`],
          solution: [
            step(`A unit rate is the amount in **one** ${ctx.per}. Share the $${rate * t}$ ${ctx.what} equally over the $${t}$ ${ctx.per}s.`),
            step("Divide the total by the number of " + ctx.per + "s.", r`${rate * t}\div${t} = ${rate}\text{ ${ctx.what} per ${ctx.per}}`),
          ],
        };
      },
    },
    {
      id: "proportions",
      title: "Proportions",
      summary: "Equal ratios and cross-multiplication.",
      prerequisites: ["ratios", "multiply-fractions"],
      estimatedMinutes: 8,
      expectedSeconds: 50,
      keyIdeas: ["A proportion says two ratios are equal.", "Cross-multiply: $\\frac{a}{b}=\\frac{c}{d} \\Rightarrow ad = bc$."],
      lesson: [
        text("A **proportion** states that two ratios are equal. If 3 notebooks cost £7.50, then 5 notebooks cost $x$ where $\\frac{3}{7.50} = \\frac{5}{x}$."),
        rule("Cross-multiplication", r`\frac{a}{b} = \frac{c}{d} \;\Longleftrightarrow\; ad = bc`),
        example("Solve $\\frac{4}{x} = \\frac{10}{25}$.", [["Cross-multiply.", r`4\times25 = 10x`], ["Divide.", r`x = \frac{100}{10} = 10`]]),
        key("Two quantities are **directly proportional** when their ratio is constant: $y = kx$. Their graph is a straight line through the origin."),
        visual({ type: "functionPlot", functions: [{ fn: (x) => 1.5 * x, label: "y = 1.5x" }], viewBox: { x: [-1, 8], y: [-1, 12] } }),
      ],
      generate: (rng, level) => {
        const a = rng.int(2, 9), k = rng.int(2, level === 1 ? 5 : 12), b = a * k;
        const c = rng.int(2, 12), d = c * k;
        const which = rng.int(0, 3);
        const vals = [a, b, c, d];
        const shown = vals.map((v, i) => (i === which ? "x" : `${v}`));
        // a/b = c/d  ⇔  a·d = b·c; x sits in one of the four places.
        const [left, right] = [[shown[0]!, shown[3]!], [shown[1]!, shown[2]!]];
        const xSide = which === 0 || which === 3 ? left : right, otherSide = xSide === left ? right : left;
        const divisor = Number(xSide.find((v) => v !== "x")), known = Number(otherSide[0]) * Number(otherSide[1]);
        const cross = r`${left[0]} \times ${left[1]} = ${right[0]} \times ${right[1]}`;
        const crossed = xSide === left ? `${divisor}x = ${known}` : `${known} = ${divisor}x`;
        return {
          prompt: "Solve for $x$.",
          tex: r`\frac{${shown[0]}}{${shown[1]}} = \frac{${shown[2]}}{${shown[3]}}`,
          answer: numberAnswer(vals[which]!),
          hints: ["Cross-multiply.", "Divide to isolate x."],
          solution: [
            step("Cross-multiply: the top of each fraction times the bottom of the other.", cross),
            step("Work out the side you know.", crossed),
            step(`Divide both sides by $${divisor}$ to get $x$ on its own.`, r`x = ${known}\div${divisor} = ${vals[which]}`),
          ],
        };
      },
    },
  ],
};
