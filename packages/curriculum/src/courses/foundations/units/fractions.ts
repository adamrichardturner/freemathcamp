import { example, key, math, multipleChoice, numberAnswer, rule, step, text, tip, visual, warn } from "../../../core/builders";
import { gcd, lcm, reduce, texFrac, textFrac } from "../../../core/math";
import type { Rng } from "../../../core/rng";
import type { Level, Unit } from "../../../core/types";

const r = String.raw;

const properFraction = (rng: Rng, level: Level): [number, number] => {
  const d = rng.int(2, level === 1 ? 8 : level === 2 ? 12 : 20);
  return [rng.int(1, d - 1), d];
};

const fracHint = "Type a fraction like 3/4";

export const fractions: Unit = {
  id: "fractions",
  title: "Fractions",
  icon: "PieChart",
  description: "Parts of a whole: equivalence, comparison and all four operations.",
  exercises: [
    {
      id: "fraction-basics",
      title: "What Is a Fraction?",
      summary: "Numerators, denominators and parts of a whole.",
      prerequisites: ["division"],
      estimatedMinutes: 6,
      expectedSeconds: 20,
      keyIdeas: ["The denominator says how many equal parts; the numerator says how many you take.", "$\\frac{a}{b}$ also means $a \\div b$."],
      lesson: [
        text("A fraction $\\frac{a}{b}$ describes $a$ parts of a whole cut into $b$ **equal** parts. The bottom number is the **denominator**, the top is the **numerator**."),
        visual({ type: "fractionCircle", numerator: 3, denominator: 8 }, "$\\frac{3}{8}$ — three of eight equal slices."),
        visual({ type: "numberLine", min: 0, max: 1, step: 0.125, points: [{ value: 0.375, label: "3/8", tone: "primary" }] }, "Fractions are numbers, so they live on the number line too."),
        key("A fraction is also a division: $\\frac{3}{4} = 3 \\div 4 = 0.75$."),
      ],
      generate: (rng, level) => {
        const [n, d] = properFraction(rng, level);
        if (rng.chance(0.5))
          return {
            prompt: "What fraction of the circle is shaded?",
            visual: { type: "fractionCircle", numerator: n, denominator: d },
            answer: numberAnswer(n / d),
            inputHint: fracHint,
            hints: ["Count the total number of equal slices — that's the denominator.", "Count the shaded slices — that's the numerator."],
            solution: [step(`${n} of ${d} slices are shaded.`, r`\frac{${n}}{${d}}`)],
          };
        return {
          prompt: `Which point on the number line shows $\\frac{${n}}{${d}}$? Enter its decimal value (to 2 d.p.).`,
          visual: { type: "numberLine", min: 0, max: 1, step: 1 / d },
          answer: numberAnswer(n / d, { tolerance: 0.006 }),
          inputHint: "e.g. 0.38 or 3/8",
          hints: [`The interval 0–1 is cut into ${d} equal parts.`, `Divide: ${n} ÷ ${d}.`],
          solution: [step("Divide numerator by denominator.", r`\frac{${n}}{${d}} = ${n} \div ${d} \approx ${(n / d).toFixed(2)}`)],
        };
      },
    },
    {
      id: "equivalent-fractions",
      title: "Equivalent Fractions & Simplifying",
      summary: "Different names for the same amount.",
      prerequisites: ["fraction-basics", "gcf-lcm"],
      estimatedMinutes: 7,
      expectedSeconds: 30,
      keyIdeas: ["Multiply or divide top and bottom by the same number.", "Simplest form: divide both by their GCF."],
      lesson: [
        text("$\\frac{1}{2}$, $\\frac{2}{4}$ and $\\frac{4}{8}$ all describe the same amount. Cutting each piece into more pieces doesn't change how much you have."),
        visual({ type: "fractionBars", fractions: [[1, 2], [2, 4], [4, 8]] }, "Three names, one amount."),
        rule("Equivalent fractions", r`\frac{a}{b} = \frac{a\times k}{b\times k} \quad (k \neq 0)`),
        example("Simplify $\\frac{18}{24}$.", ["$\\gcd(18, 24) = 6$.", ["Divide top and bottom by 6.", r`\frac{18 \div 6}{24 \div 6} = \frac{3}{4}`]]),
        tip("A fraction is in **simplest form** when the numerator and denominator share no common factor other than 1."),
      ],
      generate: (rng, level) => {
        const [n0, d0] = properFraction(rng, level);
        const [n, d] = reduce(n0, d0);
        const k = rng.int(2, level === 3 ? 12 : 6);
        if (rng.chance(0.6))
          return {
            prompt: "Simplify fully.",
            tex: r`\frac{${n * k}}{${d * k}}`,
            answer: numberAnswer(n / d, { requireSimplest: true }),
            inputHint: fracHint,
            hints: [`Find the GCF of ${n * k} and ${d * k}.`, `Both are divisible by ${k}.`],
            solution: [step(`$\\gcd(${n * k}, ${d * k}) = ${gcd(n * k, d * k)}$.`), step("Divide top and bottom by it.", r`\frac{${n * k}}{${d * k}} = ${texFrac(n, d)}`)],
          };
        return {
          prompt: `Find the missing numerator: $\\frac{${n}}{${d}} = \\frac{?}{${d * k}}$`,
          answer: numberAnswer(n * k),
          hints: [`What was ${d} multiplied by to get ${d * k}?`, `Multiply ${n} by the same number.`],
          solution: [step(`${d} × ${k} = ${d * k}, so multiply the numerator by ${k}.`, r`\frac{${n}\times${k}}{${d}\times${k}} = \frac{${n * k}}{${d * k}}`)],
        };
      },
    },
    {
      id: "comparing-fractions",
      title: "Comparing Fractions",
      summary: "Which is bigger? Use a common denominator.",
      prerequisites: ["equivalent-fractions"],
      estimatedMinutes: 6,
      expectedSeconds: 30,
      keyIdeas: ["Rewrite with a common denominator, then compare numerators.", "Or cross-multiply."],
      lesson: [
        text("Comparing $\\frac{2}{3}$ and $\\frac{3}{5}$ is hard because the pieces are different sizes. Rewrite them with the **same denominator** and the pieces match."),
        math(r`\frac{2}{3} = \frac{10}{15} \qquad \frac{3}{5} = \frac{9}{15} \qquad\Rightarrow\qquad \frac{2}{3} > \frac{3}{5}`),
        visual({ type: "fractionBars", fractions: [[2, 3], [3, 5]] }),
        tip("**Cross-multiplication shortcut**: compare $a \\times d$ with $c \\times b$ to compare $\\frac{a}{b}$ and $\\frac{c}{d}$."),
      ],
      generate: (rng, level) => {
        let [a, b] = properFraction(rng, level), [c, d] = properFraction(rng, level);
        while (a * d === b * c) [c, d] = properFraction(rng, level);
        const bigger = a * d > c * b ? r`\frac{${a}}{${b}}` : r`\frac{${c}}{${d}}`;
        const smaller = a * d > c * b ? r`\frac{${c}}{${d}}` : r`\frac{${a}}{${b}}`;
        return {
          prompt: `Which fraction is **larger**?`,
          ...multipleChoice(rng, `$${bigger}$`, [`$${smaller}$`]),
          visual: level === 1 ? { type: "fractionBars", fractions: [[a, b], [c, d]] } : undefined,
          hints: [`Use common denominator ${lcm(b, d)}.`, `Or cross-multiply: ${a}×${d} vs ${c}×${b}.`],
          solution: [step(`Cross-multiply: ${a}×${d} = ${a * d} and ${c}×${b} = ${c * b}.`), step(`The larger product belongs to $${bigger}$.`)],
        };
      },
    },
    {
      id: "add-subtract-fractions",
      title: "Adding & Subtracting Fractions",
      summary: "Common denominators make pieces the same size.",
      prerequisites: ["equivalent-fractions", "gcf-lcm"],
      estimatedMinutes: 10,
      expectedSeconds: 60,
      keyIdeas: ["You can only add pieces of the same size.", "Use the LCM of the denominators."],
      lesson: [
        text("You can add $\\frac{1}{5} + \\frac{2}{5} = \\frac{3}{5}$ directly — the pieces are the same size. For different denominators, first convert to a **common denominator**."),
        visual({ type: "fractionBars", fractions: [[1, 3], [1, 4], [7, 12]] }, "$\\frac13 + \\frac14 = \\frac{4}{12} + \\frac{3}{12} = \\frac{7}{12}$"),
        rule("Adding fractions", r`\frac{a}{b} + \frac{c}{d} = \frac{ad + bc}{bd}`, "Using the LCM instead of $bd$ keeps numbers smaller."),
        example("Compute $\\frac{5}{6} - \\frac{1}{4}$.", ["$\\operatorname{lcm}(6,4) = 12$.", ["Convert both.", r`\frac{10}{12} - \frac{3}{12}`], ["Subtract numerators.", r`= \frac{7}{12}`]]),
        warn("Never add denominators: $\\frac{1}{2} + \\frac{1}{3} \\neq \\frac{2}{5}$."),
      ],
      generate: (rng, level) => {
        const [a, b] = properFraction(rng, level), [c, d] = properFraction(rng, level);
        const sub = rng.chance(0.4);
        const L = lcm(b, d);
        const top = sub ? a * (L / b) - c * (L / d) : a * (L / b) + c * (L / d);
        return {
          prompt: "Compute and simplify.",
          tex: r`\frac{${a}}{${b}} ${sub ? "-" : "+"} \frac{${c}}{${d}}`,
          answer: numberAnswer(top / L, { requireSimplest: true }),
          inputHint: fracHint,
          hints: [`The LCM of ${b} and ${d} is ${L}.`, `Rewrite: $\\frac{${a * (L / b)}}{${L}} ${sub ? "-" : "+"} \\frac{${c * (L / d)}}{${L}}$`],
          solution: [step(`Common denominator ${L}.`, r`\frac{${a * (L / b)}}{${L}} ${sub ? "-" : "+"} \frac{${c * (L / d)}}{${L}} = \frac{${top}}{${L}}`), step("Simplify.", texFrac(top, L))],
        };
      },
    },
    {
      id: "multiply-fractions",
      title: "Multiplying Fractions",
      summary: "Tops times tops, bottoms times bottoms.",
      prerequisites: ["equivalent-fractions", "multiplication"],
      estimatedMinutes: 6,
      expectedSeconds: 40,
      keyIdeas: ["$\\frac{a}{b}\\cdot\\frac{c}{d} = \\frac{ac}{bd}$", "\"Of\" means multiply: $\\frac12$ of $\\frac34$ is $\\frac38$."],
      lesson: [
        text("Multiplying fractions is the easiest operation: multiply the numerators, multiply the denominators. Taking $\\frac{1}{2}$ **of** $\\frac{3}{4}$ means $\\frac12 \\times \\frac34$."),
        rule("Multiplying fractions", r`\frac{a}{b}\times\frac{c}{d} = \frac{a\times c}{b\times d}`),
        example("Compute $\\frac{4}{9} \\times \\frac{3}{8}$.", [["Cancel common factors first: 4 with 8, 3 with 9.", r`\frac{1}{3}\times\frac{1}{2}`], ["Multiply.", r`= \frac{1}{6}`]]),
        tip("Cancel before multiplying — it keeps the numbers small."),
      ],
      generate: (rng, level) => {
        const [a, b] = properFraction(rng, level), [c, d] = properFraction(rng, level);
        if (level === 3 && rng.chance(0.5)) {
          const w = rng.int(2, 9) * d;
          return {
            prompt: `What is $\\frac{${c}}{${d}}$ of $${w}$?`,
            answer: numberAnswer((c * w) / d),
            hints: ['"Of" means multiply.', `Divide ${w} by ${d}, then multiply by ${c}.`],
            solution: [step("Multiply.", r`\frac{${c}}{${d}}\times${w} = ${(c * w) / d}`)],
          };
        }
        return {
          prompt: "Compute and simplify.",
          tex: r`\frac{${a}}{${b}} \times \frac{${c}}{${d}}`,
          answer: numberAnswer((a * c) / (b * d), { requireSimplest: true }),
          inputHint: fracHint,
          hints: ["Multiply numerators together and denominators together.", "Simplify at the end (or cancel first)."],
          solution: [step("Multiply across.", r`\frac{${a * c}}{${b * d}} = ${texFrac(a * c, b * d)}`)],
        };
      },
    },
    {
      id: "divide-fractions",
      title: "Dividing Fractions",
      summary: "Multiply by the reciprocal.",
      prerequisites: ["multiply-fractions"],
      estimatedMinutes: 7,
      expectedSeconds: 45,
      keyIdeas: ["Dividing by $\\frac{c}{d}$ = multiplying by $\\frac{d}{c}$.", "How many halves fit in 3? Six: $3 \\div \\frac12 = 6$."],
      lesson: [
        text("$3 \\div \\frac{1}{2}$ asks: **how many halves fit into 3?** There are 6. Dividing by a fraction is the same as multiplying by its **reciprocal** (flip it)."),
        visual({ type: "fractionBars", fractions: [[1, 2], [1, 2], [1, 2], [1, 2], [1, 2], [1, 2]], labels: false }, "Six halves make three wholes."),
        rule("Keep, change, flip", r`\frac{a}{b} \div \frac{c}{d} = \frac{a}{b}\times\frac{d}{c}`),
        example("Compute $\\frac{2}{3} \\div \\frac{4}{5}$.", [["Flip the divisor and multiply.", r`\frac{2}{3}\times\frac{5}{4}`], ["Multiply and simplify.", r`\frac{10}{12} = \frac{5}{6}`]]),
      ],
      generate: (rng, level) => {
        const [a, b] = properFraction(rng, level), [c, d] = properFraction(rng, level);
        return {
          prompt: "Compute and simplify.",
          tex: r`\frac{${a}}{${b}} \div \frac{${c}}{${d}}`,
          answer: numberAnswer((a * d) / (b * c), { requireSimplest: true }),
          inputHint: fracHint,
          hints: [`Flip the second fraction: $\\frac{${d}}{${c}}$.`, "Then multiply across."],
          solution: [step("Multiply by the reciprocal.", r`\frac{${a}}{${b}}\times\frac{${d}}{${c}} = \frac{${a * d}}{${b * c}} = ${texFrac(a * d, b * c)}`)],
        };
      },
    },
    {
      id: "mixed-numbers",
      title: "Mixed Numbers",
      summary: "Converting between $2\\frac{1}{3}$ and $\\frac{7}{3}$.",
      prerequisites: ["fraction-basics", "division"],
      estimatedMinutes: 6,
      expectedSeconds: 35,
      keyIdeas: ["$w\\frac{n}{d} = \\frac{wd + n}{d}$", "Convert to improper fractions before multiplying or dividing."],
      lesson: [
        text("A **mixed number** like $2\\frac{1}{3}$ means $2 + \\frac{1}{3}$. An **improper fraction** has a numerator at least as big as its denominator, like $\\frac{7}{3}$. They're two ways to write the same number."),
        visual({ type: "fractionBars", fractions: [[3, 3], [3, 3], [1, 3]], labels: false }, "$2\\frac13 = \\frac{3}{3}+\\frac{3}{3}+\\frac{1}{3} = \\frac{7}{3}$"),
        rule("Mixed → improper", r`w\tfrac{n}{d} = \frac{w\times d + n}{d}`),
        example("Write $\\frac{17}{5}$ as a mixed number.", ["$17 \\div 5 = 3$ remainder $2$.", ["The quotient is the whole part, the remainder the new numerator.", r`3\tfrac{2}{5}`]]),
      ],
      generate: (rng, level) => {
        const d = rng.int(2, level === 1 ? 6 : 12), n = rng.int(1, d - 1), w = rng.int(1, level === 3 ? 12 : 5);
        if (level === 3 && rng.chance(0.5)) {
          const d2 = rng.int(2, 6), n2 = rng.int(1, d2 - 1), w2 = rng.int(1, 4);
          const val = (w + n / d) * (w2 + n2 / d2);
          const [p, q] = reduce((w * d + n) * (w2 * d2 + n2), d * d2);
          return {
            prompt: "Multiply. Give your answer as an improper fraction or mixed number.",
            tex: r`${w}\tfrac{${n}}{${d}} \times ${w2}\tfrac{${n2}}{${d2}}`,
            answer: numberAnswer(val),
            inputHint: "e.g. 23/6 or 3 5/6",
            hints: ["Convert both to improper fractions first."],
            solution: [step("Convert.", r`\frac{${w * d + n}}{${d}}\times\frac{${w2 * d2 + n2}}{${d2}}`), step("Multiply and simplify.", texFrac(p, q))],
          };
        }
        return rng.chance(0.5)
          ? {
              prompt: "Write as an improper fraction.",
              tex: r`${w}\tfrac{${n}}{${d}}`,
              answer: numberAnswer((w * d + n) / d),
              inputHint: fracHint,
              hints: [`Multiply the whole number by the denominator: ${w} × ${d}.`, `Add the numerator ${n}.`],
              solution: [step("Whole × denominator + numerator, over the denominator.", r`\frac{${w}\times${d}+${n}}{${d}} = \frac{${w * d + n}}{${d}}`)],
            }
          : {
              prompt: "Write as a mixed number (e.g. 2 1/3).",
              tex: r`\frac{${w * d + n}}{${d}}`,
              answer: numberAnswer((w * d + n) / d),
              inputHint: "e.g. 2 1/3",
              hints: [`How many times does ${d} go into ${w * d + n}?`, "The remainder becomes the numerator."],
              solution: [step(`${w * d + n} ÷ ${d} = ${w} remainder ${n}.`, r`${w}\tfrac{${n}}{${d}}`)],
            };
      },
    },
  ],
};

export { textFrac };
