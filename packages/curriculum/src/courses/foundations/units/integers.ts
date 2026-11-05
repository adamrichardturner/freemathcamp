import { example, key, multipleChoice, numberAnswer, rule, step, text, tip, visual, warn } from "../../../core/builders";
import { paren } from "../../../core/math";
import type { Unit } from "../../../core/types";
import { addSigned } from "../../../core/working";

const r = String.raw;

/** Same signs give a positive result; different signs give a negative one. */
const signRule = (x: number, y: number, op: "×" | "÷") =>
  step(
    (x < 0) === (y < 0)
      ? `The signs are the same (both ${x < 0 ? "negative" : "positive"}), so the answer is **positive**.`
      : `The signs are different (one negative, one positive), so the answer is **negative**.`,
    op === "×" ? r`${x < 0 ? "-" : "+"} \times ${y < 0 ? "-" : "+"} = ${(x < 0) === (y < 0) ? "+" : "-"}` : r`${x < 0 ? "-" : "+"} \div ${y < 0 ? "-" : "+"} = ${(x < 0) === (y < 0) ? "+" : "-"}`,
  );

export const integers: Unit = {
  id: "integers",
  title: "Integers & Negative Numbers",
  icon: "ArrowLeftRight",
  description: "Numbers below zero, how to combine them, and distance from zero.",
  exercises: [
    {
      id: "negative-numbers",
      title: "The Number Line & Negatives",
      summary: "Extending numbers to the left of zero and ordering them.",
      prerequisites: ["add-subtract"],
      estimatedMinutes: 5,
      expectedSeconds: 20,
      keyIdeas: ["Further right means greater.", "$-7 < -2$ because $-7$ is further left."],
      lesson: [
        text("Negative numbers measure things below a starting point — temperatures below freezing, debts, depths below sea level. On the number line they sit to the **left** of zero."),
        visual({ type: "numberLine", min: -10, max: 10, step: 1, points: [{ value: -7, label: "-7", tone: "danger" }, { value: -2, label: "-2", tone: "warning" }, { value: 4, label: "4", tone: "success" }] }),
        key("A number is **greater** than every number to its left. So $-2 > -7$, even though $7 > 2$."),
        text("Each number has an **opposite** the same distance from zero on the other side: the opposite of $5$ is $-5$, and the opposite of $-5$ is $5$."),
      ],
      generate: (rng, level) => {
        const spread = level === 1 ? 10 : level === 2 ? 30 : 100;
        const nums = rng.shuffle(Array.from(new Set(Array.from({ length: 6 }, () => rng.int(-spread, spread))))).slice(0, 4);
        while (nums.length < 4) nums.push(-nums.length - 1);
        const askMin = rng.chance(0.5);
        const target = askMin ? Math.min(...nums) : Math.max(...nums);
        const choices = nums.map((n) => `$${n}$`);
        return {
          prompt: `Which number is the **${askMin ? "smallest" : "largest"}**?`,
          ...multipleChoice(rng, `$${target}$`, choices),
          visual: level === 1 ? { type: "numberLine", min: -spread, max: spread, step: spread / 10 } : undefined,
          hints: ["Picture the numbers on a number line.", askMin ? "The smallest is furthest left." : "The largest is furthest right."],
          solution: [
            step("On a number line, numbers get bigger as you move right. Every negative number sits left of zero, and the bigger its size, the further left it is."),
            step("Put them in order from left (smallest) to right (largest).", [...nums].sort((a, b) => a - b).join(" < ")),
            step(`So the ${askMin ? "smallest is the one furthest left" : "largest is the one furthest right"}: $${target}$.`),
          ],
        };
      },
    },
    {
      id: "add-subtract-integers",
      title: "Adding & Subtracting Integers",
      summary: "Moving left and right across zero.",
      prerequisites: ["negative-numbers"],
      estimatedMinutes: 8,
      expectedSeconds: 25,
      keyIdeas: ["Adding a negative moves left.", "Subtracting a negative is adding: $a - (-b) = a + b$."],
      lesson: [
        text("Think of the number line as a road. **Adding** a positive moves right, adding a negative moves left."),
        visual({ type: "numberLine", min: -8, max: 8, step: 1, jumps: [{ from: 3, to: -5, label: "+(-8)", tone: "danger" }], points: [{ value: 3, label: "3" }, { value: -5, label: "-5", tone: "danger" }] }, "$3 + (-8) = -5$"),
        rule("Subtracting is adding the opposite", r`a - b = a + (-b) \qquad a - (-b) = a + b`),
        example("Compute $-4 - (-9)$.", [["Rewrite subtraction as adding the opposite.", r`-4 + 9`], ["Move 9 right from $-4$.", r`= 5`]]),
        tip("Same signs: add the sizes, keep the sign. Different signs: subtract the sizes, take the sign of the bigger one."),
      ],
      generate: (rng, level) => {
        const m = level === 1 ? 10 : level === 2 ? 25 : 80;
        const a = rng.nonZero(-m, m), b = rng.nonZero(-m, m);
        const sub = rng.chance(level === 1 ? 0.3 : 0.5);
        const tex = `${a} ${sub ? "-" : "+"} ${paren(b)}`;
        const ans = sub ? a - b : a + b;
        return {
          prompt: "Compute.",
          tex,
          answer: numberAnswer(ans),
          visual: level === 1 ? { type: "numberLine", min: -20, max: 20, step: 2 } : undefined,
          hints: sub ? ["Subtracting is the same as adding the opposite.", `Rewrite as $${a} + ${paren(-b)}$.`] : ["Start at the first number and move along the number line."],
          solution: sub
            ? [step(`Subtracting a number is the same as adding its opposite. The opposite of $${b}$ is $${-b}$.`, r`${tex} = ${a} + ${paren(-b)}`), addSigned(a, -b), step("So", `${tex} = ${ans}`)]
            : [step(`Start at $${a}$ and move $${Math.abs(b)}$ to the ${b > 0 ? "right" : "left"}. To work it out:`), addSigned(a, b)],
        };
      },
    },
    {
      id: "multiply-divide-integers",
      title: "Multiplying & Dividing Integers",
      summary: "The sign rules, and why negative × negative is positive.",
      prerequisites: ["add-subtract-integers", "multiplication"],
      estimatedMinutes: 7,
      expectedSeconds: 25,
      keyIdeas: ["Same signs → positive.", "Different signs → negative."],
      lesson: [
        text("Multiplying by a negative **flips** a number to the other side of zero. Flip twice and you're back where you started — that is why a negative times a negative is positive."),
        rule("Sign rules", r`(+)(+) = + \quad (-)(-) = + \quad (+)(-) = - \quad (-)(+) = -`, "Division follows exactly the same rules."),
        text("Look at the pattern: $3\\times(-2) = -6,\\ 2\\times(-2) = -4,\\ 1\\times(-2) = -2,\\ 0\\times(-2) = 0$. Each step adds $2$, so $-1 \\times (-2) = 2$."),
        example("Compute $(-6)(-4) \\div (-3)$.", [["Negative × negative is positive.", r`24 \div (-3)`], ["Different signs give a negative.", r`= -8`]]),
        tip("Count the negatives: an **even** count gives a positive result, an **odd** count gives a negative."),
      ],
      generate: (rng, level) => {
        const a = rng.nonZero(-12, 12), b = rng.nonZero(-12, 12);
        if (level === 3) {
          const c = rng.nonZero(-5, 5);
          const negs = [a, b, c].filter((x) => x < 0).length;
          return {
            prompt: "Compute.",
            tex: r`${paren(a)} \times ${paren(b)} \times ${paren(c)}`,
            answer: numberAnswer(a * b * c),
            hints: ["Multiply the sizes, then count the negative signs."],
            solution: [
              step("Multiply the sizes, ignoring the signs for now.", r`${Math.abs(a)}\times${Math.abs(b)}\times${Math.abs(c)} = ${Math.abs(a * b)}\times${Math.abs(c)} = ${Math.abs(a * b * c)}`),
              step(`Count the negative signs: there ${negs === 1 ? "is" : "are"} $${negs}$. Each pair of negatives makes a positive, so ${negs % 2 ? "an odd number leaves the answer **negative**" : "an even number leaves the answer **positive**"}.`),
              step("Put the sign on the size.", r`${paren(a)} \times ${paren(b)} \times ${paren(c)} = ${a * b * c}`),
            ],
          };
        }
        const div = rng.chance(0.5);
        return div
          ? {
              prompt: "Compute.",
              tex: r`${paren(a * b)} \div ${paren(b)}`,
              answer: numberAnswer(a),
              hints: ["Divide the sizes, then apply the sign rule."],
              solution: [
                step("Divide the sizes, ignoring the signs.", r`${Math.abs(a * b)}\div${Math.abs(b)} = ${Math.abs(a)}`),
                signRule(a * b, b, "÷"),
                step("Put the sign on the size.", r`${paren(a * b)} \div ${paren(b)} = ${a}`),
              ],
            }
          : {
              prompt: "Compute.",
              tex: r`${paren(a)} \times ${paren(b)}`,
              answer: numberAnswer(a * b),
              hints: ["Multiply the sizes, then apply the sign rule."],
              solution: [
                step("Multiply the sizes, ignoring the signs.", r`${Math.abs(a)}\times${Math.abs(b)} = ${Math.abs(a * b)}`),
                signRule(a, b, "×"),
                step("Put the sign on the size.", r`${paren(a)} \times ${paren(b)} = ${a * b}`),
              ],
            };
      },
    },
    {
      id: "absolute-value",
      title: "Absolute Value",
      summary: "Distance from zero, always non-negative.",
      prerequisites: ["negative-numbers"],
      estimatedMinutes: 5,
      expectedSeconds: 25,
      keyIdeas: ["$|x|$ is the distance from $x$ to $0$.", "$|a - b|$ is the distance between $a$ and $b$."],
      lesson: [
        text("The **absolute value** $|x|$ is how far $x$ is from zero, ignoring direction. Distances are never negative, so $|x| \\ge 0$."),
        visual({ type: "numberLine", min: -6, max: 6, step: 1, highlight: { from: -4, to: 0, tone: "accent" }, points: [{ value: -4, label: "-4", tone: "accent" }] }, "$|-4| = 4$: four steps from zero."),
        rule("Distance between two numbers", r`\text{dist}(a,b) = |a - b|`),
        example("Evaluate $|3 - 10| - |-2|$.", [["Inside the bars first.", r`|-7| - |-2|`], ["Take distances from zero.", r`7 - 2 = 5`]]),
        warn("$-|5| = -5$. The minus sign outside the bars still applies."),
      ],
      generate: (rng, level) => {
        const a = rng.int(-15, 15), b = rng.int(-15, 15);
        if (level === 1)
          return {
            prompt: "Evaluate.",
            tex: `|${a}|`,
            answer: numberAnswer(Math.abs(a)),
            hints: ["How far is it from 0?"],
            solution: [
              step("The absolute value of a number is its distance from $0$ on the number line, and a distance is never negative."),
              step(`$${a}$ is $${Math.abs(a)}$ step${Math.abs(a) === 1 ? "" : "s"} from $0$${a < 0 ? ", so drop the minus sign" : ""}.`, `|${a}| = ${Math.abs(a)}`),
            ],
          };
        if (level === 2)
          return {
            prompt: `What is the distance between $${a}$ and $${b}$ on the number line?`,
            answer: numberAnswer(Math.abs(a - b)),
            visual: { type: "numberLine", min: -16, max: 16, step: 2, points: [{ value: a, label: `${a}` }, { value: b, label: `${b}`, tone: "accent" }] },
            hints: ["Distance = |a − b|."],
            solution: [
              step("The distance between two numbers is the absolute value of their difference.", r`|${a} - ${paren(b)}|`),
              step("Work out the inside first.", r`${a} - ${paren(b)} = ${a - b}`),
              step("Take the absolute value: distances are never negative.", r`|${a - b}| = ${Math.abs(a - b)}`),
            ],
          };
        const c = rng.nonZero(-9, 9);
        return {
          prompt: "Evaluate.",
          tex: r`|${a} - ${paren(b)}| - |${c}|`,
          answer: numberAnswer(Math.abs(a - b) - Math.abs(c)),
          hints: ["Simplify inside each pair of bars first."],
          solution: [
            step("Work out the inside of the first bars.", r`${a} - ${paren(b)} = ${a - b}`),
            step("Take each absolute value: the distance from 0.", r`|${a - b}| = ${Math.abs(a - b)}, \quad |${c}| = ${Math.abs(c)}`),
            step("Subtract.", `${Math.abs(a - b)} - ${Math.abs(c)} = ${Math.abs(a - b) - Math.abs(c)}`),
          ],
        };
      },
    },
  ],
};
