import { example, math, numberAnswer, rule, step, text, tip, visual, warn } from "../../../core/builders";
import { num, round, texFrac } from "../../../core/math";
import type { Unit } from "../../../core/types";
import { chunkDivision, columnAddition, columnSubtraction, decimalPlaces, partialProducts, simplifyStep, type Step } from "../../../core/working";

const r = String.raw;

const PLACES = ["tenths", "hundredths", "thousandths", "ten-thousandths"];

/** The working for a decimal sum, difference or product, with the decimal points kept in line. */
const decimalWorking = (a: number, b: number, op: "+" | "-" | "×"): Step[] => {
  if (op === "+") return columnAddition(a, b);
  if (op === "-") {
    if (a >= b) return columnSubtraction(a, b);
    return [
      step(`$${b}$ is bigger than $${a}$, so the answer will be **negative**. Work out $${b} - ${a}$, then put a minus sign in front.`),
      ...columnSubtraction(b, a),
      step("Now make it negative.", r`${a} - ${b} = -(${b} - ${a}) = ${num(round(a - b, 6))}`),
    ];
  }
  const da = decimalPlaces(a), db = decimalPlaces(b);
  const A = Math.round(a * 10 ** da), B = Math.round(b * 10 ** db), t = da + db;
  const fixed = ((A * B) / 10 ** t).toFixed(t);
  return [
    step(`Ignore the decimal points for now and multiply $${A}\\times${B}$ as whole numbers.`),
    ...partialProducts(A, B),
    step(
      `Count the decimal places in the question: $${a}$ has $${da}$ and $${b}$ has $${db}$, so the answer needs $${t}$. Put the point back $${t}$ place${t > 1 ? "s" : ""} from the right.`,
      r`${a}\times${b} = ${fixed}${fixed !== num(round(a * b, 6)) ? ` = ${num(round(a * b, 6))}` : ""}`,
    ),
  ];
};

export const decimals: Unit = {
  id: "decimals-percents",
  title: "Decimals & Percentages",
  icon: "Percent",
  description: "Base-ten fractions, converting between forms, and percentages in the real world.",
  exercises: [
    {
      id: "decimals",
      title: "Decimals & Place Value",
      summary: "Tenths, hundredths and thousandths.",
      prerequisites: ["place-value", "fraction-basics"],
      estimatedMinutes: 6,
      expectedSeconds: 25,
      keyIdeas: ["Places right of the point are tenths, hundredths, thousandths…", "$0.5 > 0.45$ — compare place by place."],
      lesson: [
        text("Place value keeps going to the right of the decimal point. Each place is **one tenth** of the place to its left."),
        math(r`3.472 = 3 + \frac{4}{10} + \frac{7}{100} + \frac{2}{1000}`),
        visual({ type: "numberLine", min: 0, max: 1, step: 0.1, points: [{ value: 0.45, label: "0.45", tone: "accent" }, { value: 0.5, label: "0.5", tone: "primary" }] }),
        warn("More digits doesn't mean bigger: $0.5 > 0.45$ because $5$ tenths beats $4$ tenths."),
        tip("To compare decimals, pad with zeros so they have the same length: $0.50$ vs $0.45$."),
      ],
      generate: (rng, level) => {
        const dp = level === 1 ? 1 : level === 2 ? 2 : 3;
        const n = rng.int(1, 10 ** dp - 1);
        const value = n / 10 ** dp;
        if (rng.chance(0.5))
          return {
            prompt: `Write $${texFrac(n, 10 ** dp, false)}$ as a decimal.`,
            answer: numberAnswer(value),
            hints: [`The denominator ${10 ** dp} has ${dp} zero${dp > 1 ? "s" : ""}, so use ${dp} decimal place${dp > 1 ? "s" : ""}.`],
            solution: [
              step(`The denominator $${10 ** dp}$ has $${dp}$ zero${dp > 1 ? "s" : ""}, so the decimal has $${dp}$ digit${dp > 1 ? "s" : ""} after the point: its last digit sits in the **${PLACES[dp - 1]}** place.`),
              step(
                `Write $${n}$ so that it ends in the ${PLACES[dp - 1]} place${String(n).length < dp ? ", filling the empty places with zeros" : ""}.`,
                r`\frac{${n}}{${10 ** dp}} = ${(n / 10 ** dp).toFixed(dp)}${(n / 10 ** dp).toFixed(dp) !== `${value}` ? ` = ${value}` : ""}`,
              ),
            ],
          };
        const extra = rng.int(1, 9);
        const unrounded = (n * 10 + extra) / 10 ** (dp + 1);
        const rounded = (n + (extra >= 5 ? 1 : 0)) / 10 ** dp;
        return {
          prompt: `Round $${unrounded.toFixed(dp + 1)}$ to ${dp} decimal place${dp > 1 ? "s" : ""}.`,
          answer: numberAnswer(round(rounded, dp)),
          hints: [`Look at decimal place ${dp + 1}: the digit is ${extra}.`, "5 or more rounds up; 4 or less rounds down."],
          solution: [
            step(`To round to $${dp}$ decimal place${dp > 1 ? "s" : ""}, keep the digits up to the ${PLACES[dp - 1]} place and look at the next digit along: it's $${extra}$.`),
            step(
              extra >= 5
                ? `$${extra}$ is $5$ or more, so round **up**: add $1$ to the last digit you keep.`
                : `$${extra}$ is $4$ or less, so round **down**: the digits you keep stay as they are.`,
            ),
            step("Drop the extra digit.", r`${unrounded.toFixed(dp + 1)} \approx ${rounded.toFixed(dp)}`),
          ],
        };
      },
    },
    {
      id: "decimal-arithmetic",
      title: "Decimal Arithmetic",
      summary: "Adding, subtracting, multiplying and dividing decimals.",
      prerequisites: ["decimals", "multiplication"],
      estimatedMinutes: 8,
      expectedSeconds: 45,
      keyIdeas: ["Add/subtract: line up the decimal points.", "Multiply: count total decimal places.", "Divide: shift both points until the divisor is whole."],
      lesson: [
        text("For **addition and subtraction**, line up the decimal points so tenths add to tenths."),
        math(r`\begin{aligned} 12.40& \\ +\;3.75& \\ \hline 16.15& \end{aligned}`),
        text("For **multiplication**, ignore the points, multiply, then put back as many decimal places as the factors had in total."),
        example("Compute $0.3 \\times 0.12$.", ["$3 \\times 12 = 36$.", ["Total decimal places: $1 + 2 = 3$.", r`0.3\times0.12 = 0.036`]]),
        rule("Dividing by a decimal", r`\frac{4.8}{0.06} = \frac{480}{6} = 80`, "Multiply top and bottom by the same power of 10."),
      ],
      generate: (rng, level) => {
        const a = rng.int(11, level === 1 ? 99 : 999) / 10, b = rng.int(11, 99) / (level === 3 ? 100 : 10);
        const op = rng.pick(level === 1 ? (["+", "-"] as const) : (["+", "-", "×", "÷"] as const));
        if (op === "÷") {
          const q = rng.int(2, 40);
          return {
            prompt: "Compute.",
            tex: r`${round(b * q, 4)} \div ${b}`,
            answer: numberAnswer(q),
            hints: ["Multiply both numbers by 10 (or 100) until the divisor is a whole number."],
            solution: [
              step(
                `Dividing is easier by a whole number. Multiply both numbers by $${10 ** decimalPlaces(b)}$: the answer doesn't change, because both are scaled the same.`,
                r`${num(round(b * q, 4))} \div ${b} = ${num(round(b * q * 10 ** decimalPlaces(b), 4))} \div ${num(round(b * 10 ** decimalPlaces(b), 4))}`,
              ),
              ...chunkDivision(round(b * q * 10 ** decimalPlaces(b), 4), round(b * 10 ** decimalPlaces(b), 4)),
              step("So", r`${num(round(b * q, 4))} \div ${b} = ${q}`),
            ],
          };
        }
        const ans = op === "+" ? a + b : op === "-" ? a - b : a * b;
        return {
          prompt: "Compute.",
          tex: `${a} ${op === "×" ? r`\times` : op} ${b}`,
          answer: numberAnswer(round(ans, 6), { tolerance: 1e-6 }),
          hints: op === "×" ? ["Multiply as whole numbers.", "Count decimal places in both factors."] : ["Line up the decimal points."],
          solution: decimalWorking(a, b, op),
        };
      },
    },
    {
      id: "fraction-decimal-percent",
      title: "Fractions, Decimals & Percents",
      summary: "Three ways to write the same number.",
      prerequisites: ["decimals", "equivalent-fractions"],
      estimatedMinutes: 7,
      expectedSeconds: 35,
      keyIdeas: ["Percent means \"per hundred\".", "Decimal → percent: × 100. Fraction → decimal: divide."],
      lesson: [
        text("**Percent** means *per hundred*. So $35\\% = \\frac{35}{100} = 0.35$. Every percent is a fraction with denominator 100."),
        visual({ type: "percentGrid", percent: 35 }, "35 of 100 squares, which is also $0.35$, or $\\frac{7}{20}$."),
        rule("Conversions", r`\frac{a}{b} \xrightarrow{\;a\div b\;} \text{decimal} \xrightarrow{\;\times 100\;} \text{percent}`),
        example("Write $\\frac{3}{8}$ as a percent.", [["Divide.", r`3 \div 8 = 0.375`], ["Multiply by 100.", r`37.5\%`]]),
        tip("Memorise the classics: $\\frac12 = 50\\%$, $\\frac14 = 25\\%$, $\\frac15 = 20\\%$, $\\frac{1}{10} = 10\\%$, $\\frac13 \\approx 33.3\\%$."),
      ],
      generate: (rng, level) => {
        const pairs: [number, number][] = level === 1 ? [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [1, 10], [7, 10]] : level === 2 ? [[3, 20], [7, 25], [9, 50], [3, 8], [5, 8], [11, 20]] : [[1, 8], [7, 8], [13, 40], [17, 25], [1, 16], [3, 16]];
        const [n, d] = rng.pick(pairs);
        const pct = round((n / d) * 100, 4);
        const mode = rng.int(0, 2);
        // The smallest power of ten the denominator divides (every denominator here is made of 2s and 5s).
        const big = [100, 1000, 10000].find((p) => p % d === 0)!;
        if (mode === 0)
          return {
            prompt: `Write $\\frac{${n}}{${d}}$ as a percentage.`,
            answer: numberAnswer(pct, { unit: "%" }),
            solutionVisual: Number.isInteger(pct) ? { type: "percentGrid", percent: pct } : undefined,
            inputHint: "e.g. 35%",
            hints: [`Divide ${n} by ${d}.`, "Multiply the decimal by 100."],
            solution:
              100 % d === 0
                ? [
                    step(`Percent means "out of $100$". Multiply the top and bottom by $${100 / d}$ to make the denominator $100$.`, r`\frac{${n}}{${d}} = \frac{${n}\times${100 / d}}{${d}\times${100 / d}} = \frac{${pct}}{100}`),
                    step(`$${pct}$ out of $100$ is $${pct}\\%$.`, r`\frac{${pct}}{100} = ${pct}\%`),
                  ]
                : [
                    step(`$${d}$ doesn't go into $100$, but it goes into $${big}$. Multiply the top and bottom by $${big / d}$.`, r`\frac{${n}}{${d}} = \frac{${n * (big / d)}}{${big}} = ${n / d}`),
                    step("Turn the decimal into a percentage by multiplying by $100$ (move the point two places right).", r`${n / d}\times 100 = ${pct}\%`),
                  ],
          };
        if (mode === 1)
          return {
            prompt: `Write $${pct}\\%$ as a decimal.`,
            answer: numberAnswer(n / d),
            hints: ["Percent means per hundred: divide by 100."],
            solution: [
              step(`Percent means "per hundred", so $${pct}\\%$ is $${pct}$ divided by $100$.`, r`${pct}\% = \frac{${pct}}{100}`),
              step("Dividing by $100$ moves the decimal point two places to the left.", r`${pct}\div100 = ${n / d}`),
            ],
          };
        return {
          prompt: `Write $${pct}\\%$ as a fraction in simplest form.`,
          answer: numberAnswer(n / d, { requireSimplest: true }),
          inputHint: "e.g. 7/20",
          hints: [`Write it over 100: $\\frac{${pct}}{100}$.`, "Simplify (clear any decimals first)."],
          solution: [
            step(`Percent means "out of $100$", so write it over $100$.`, r`${pct}\% = \frac{${pct}}{100}`),
            ...(Number.isInteger(pct)
              ? []
              : [step(`Clear the decimal by multiplying the top and bottom by $${big / 100}$.`, r`\frac{${pct}}{100} = \frac{${round(pct * (big / 100), 4)}}{${big}}`)]),
            simplifyStep(round(pct * (big / 100), 4), big),
          ],
        };
      },
    },
    {
      id: "percent-of",
      title: "Percent of a Quantity",
      summary: "Finding 15% of 80, and working backwards.",
      prerequisites: ["fraction-decimal-percent", "multiply-fractions"],
      estimatedMinutes: 7,
      expectedSeconds: 40,
      keyIdeas: ["$p\\%$ of $x$ = $\\frac{p}{100} \\times x$", "Find 10% first, then scale."],
      lesson: [
        text("To find a percent **of** something, convert the percent to a decimal and multiply."),
        rule("Percent of a quantity", r`p\%\text{ of } x = \frac{p}{100}\times x`),
        visual({ type: "tapeDiagram", parts: [{ label: "15%", value: 15, tone: "primary" }, { label: "85%", value: 85, tone: "muted" }], totalLabel: "80" }),
        example("Find $15\\%$ of $80$.", [["$10\\%$ of 80 is 8; $5\\%$ is half of that, 4.", r`8 + 4 = 12`], ["Or directly:", r`0.15\times80 = 12`]]),
        example("$30\\%$ of a number is $24$. What's the number?", [["Set up the equation.", r`0.3x = 24`], ["Divide.", r`x = 80`]]),
      ],
      generate: (rng, level) => {
        const p = rng.pick(level === 1 ? [10, 20, 25, 50, 75] : [5, 15, 30, 35, 40, 60, 12, 45]);
        const x = rng.int(2, 20) * (level === 1 ? 4 : 20);
        const part = (p * x) / 100; // not (p / 100) * x, which leaves float noise like 28.799999999999997
        if (level === 3 && rng.chance(0.6))
          return {
            prompt: `$${p}\\%$ of a number is $${part}$. What is the number?`,
            answer: numberAnswer(x),
            hints: [`Write it as $${p / 100}x = ${part}$.`, `Divide ${part} by ${p / 100}.`],
            solution: [
              step(`Call the number $x$. $${p}\\%$ of it is $${part}$.`, r`\frac{${p}}{100}\times x = ${part}`),
              step(`So $${p}$ lots of $1\\%$ make $${part}$. Find $1\\%$ by dividing by $${p}$.`, r`1\% = ${part} \div ${p} = ${num(part / p)}`),
              step("The whole number is $100\\%$, so multiply by $100$.", r`x = ${num(part / p)}\times 100 = ${x}`),
            ],
          };
        return {
          prompt: `Find $${p}\\%$ of $${x}$.`,
          answer: numberAnswer(part),
          visual: { type: "tapeDiagram", parts: [{ label: `${p}%`, value: p, tone: "primary" }, { label: `${100 - p}%`, value: 100 - p, tone: "muted" }], totalLabel: `${x}` },
          hints: ["Find 10% first by dividing by 10.", `Or multiply ${x} by ${p / 100}.`],
          solution: [
            step(`$${p}\\%$ means $${p}$ out of every $100$, so multiply by $\\frac{${p}}{100}$.`, r`${p}\%\text{ of }${x} = \frac{${p}}{100}\times${x}`),
            step(`Multiply first, then divide by $100$.`, r`\frac{${p}\times${x}}{100} = \frac{${p * x}}{100} = ${part}`),
            ...(p % 10 === 0
              ? [step(`Check with $10\\%$: $10\\%$ of $${x}$ is $${x}\\div10 = ${num(x / 10)}$, and $${p}\\%$ is $${p / 10}$ of those.`, r`${p / 10}\times${num(x / 10)} = ${part}`)]
              : []),
          ],
        };
      },
    },
    {
      id: "percent-change",
      title: "Percent Increase & Decrease",
      summary: "Discounts, growth and multipliers.",
      prerequisites: ["percent-of"],
      estimatedMinutes: 8,
      expectedSeconds: 50,
      keyIdeas: ["Increase by $p\\%$: multiply by $1 + \\frac{p}{100}$.", "Percent change = change ÷ original × 100."],
      lesson: [
        text("A 20% increase means the new amount is the original **plus** 20% of it — that's $120\\%$ of the original. So multiply by $1.2$."),
        rule("Multipliers", r`\text{increase by } p\%: \times\left(1+\tfrac{p}{100}\right) \qquad \text{decrease by } p\%: \times\left(1-\tfrac{p}{100}\right)`),
        rule("Percent change", r`\%\,\text{change} = \frac{\text{new} - \text{original}}{\text{original}}\times100`),
        example("A £60 jacket is reduced by 35%. What's the sale price?", [["Multiplier for a 35% decrease.", r`1 - 0.35 = 0.65`], ["Apply it.", r`0.65 \times 60 = 39`]]),
        warn("A 50% rise followed by a 50% fall does **not** return to the start: $1.5 \\times 0.5 = 0.75$."),
      ],
      generate: (rng, level) => {
        const orig = rng.int(2, 30) * 10, p = rng.pick([5, 10, 15, 20, 25, 30, 40, 60]);
        const up = rng.chance(0.5);
        const next = round(orig * (1 + (up ? p : -p) / 100), 4);
        if (level >= 2 && rng.chance(0.5))
          return {
            prompt: `A value changes from $${orig}$ to $${next}$. What is the percent ${up ? "increase" : "decrease"}?`,
            answer: numberAnswer(p, { unit: "%" }),
            inputHint: "e.g. 15%",
            hints: ["Find the change first.", "Divide by the **original**, then × 100."],
            solution: [
              step(`Find the change: how much did it ${up ? "go up" : "go down"} by?`, r`${up ? `${next} - ${orig}` : `${orig} - ${next}`} = ${num(round(Math.abs(next - orig), 4))}`),
              step("Divide the change by the **original** value.", r`\frac{${num(round(Math.abs(next - orig), 4))}}{${orig}} = ${num(p / 100)}`),
              step("Multiply by $100$ to turn it into a percentage.", r`${num(p / 100)}\times100 = ${p}\%`),
            ],
          };
        return {
          prompt: `${up ? "Increase" : "Decrease"} $${orig}$ by $${p}\\%$.`,
          answer: numberAnswer(next),
          hints: [`The multiplier is ${up ? 1 + p / 100 : 1 - p / 100}.`],
          solution: [
            step(`Find $${p}\\%$ of $${orig}$.`, r`\frac{${p}}{100}\times${orig} = ${num((p * orig) / 100)}`),
            step(`${up ? "Add it on to" : "Take it away from"} the original.`, `${orig} ${up ? "+" : "-"} ${num((p * orig) / 100)} = ${next}`),
            step(
              `Or in one step: ${up ? "increasing" : "decreasing"} by $${p}\\%$ leaves $${up ? 100 + p : 100 - p}\\%$, so multiply by $${num(round(1 + (up ? p : -p) / 100, 2))}$.`,
              r`${orig}\times${num(round(1 + (up ? p : -p) / 100, 2))} = ${next}`,
            ),
          ],
        };
      },
    },
  ],
};
