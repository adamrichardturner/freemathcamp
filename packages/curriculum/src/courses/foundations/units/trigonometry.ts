import { example, key, multipleChoice, numberAnswer, rule, step, text, tip, visual, warn } from "../../../core/builders";
import { DEG, gcd, round } from "../../../core/math";
import type { Unit } from "../../../core/types";

const r = String.raw;

const special: Record<number, { sin: string; cos: string; tan: string }> = {
  0: { sin: "0", cos: "1", tan: "0" },
  30: { sin: r`\frac{1}{2}`, cos: r`\frac{\sqrt3}{2}`, tan: r`\frac{\sqrt3}{3}` },
  45: { sin: r`\frac{\sqrt2}{2}`, cos: r`\frac{\sqrt2}{2}`, tan: "1" },
  60: { sin: r`\frac{\sqrt3}{2}`, cos: r`\frac{1}{2}`, tan: r`\sqrt3` },
  90: { sin: "1", cos: "0", tan: r`\text{undefined}` },
};

const radTex = (deg: number) => {
  const g = gcd(deg, 180);
  const n = deg / g, d = 180 / g;
  if (n === 0) return "0";
  return d === 1 ? `${n === 1 ? "" : n}\\pi` : `\\frac{${n === 1 ? "" : n}\\pi}{${d}}`;
};

export const trigonometry: Unit = {
  id: "trigonometry",
  title: "Trigonometry",
  icon: "Compass",
  description: "Right-triangle ratios, radians, the unit circle, trig graphs and identities.",
  exercises: [
    {
      id: "right-triangle-trig",
      title: "SOH CAH TOA",
      summary: "Sine, cosine and tangent in right triangles.",
      prerequisites: ["pythagorean-theorem", "proportions"],
      estimatedMinutes: 12,
      expectedSeconds: 60,
      keyIdeas: ["$\\sin = \\frac{O}{H},\\ \\cos = \\frac{A}{H},\\ \\tan = \\frac{O}{A}$", "Use inverse trig to find angles."],
      lesson: [
        text("In similar right triangles, the **ratios** of sides depend only on the angle. These ratios have names: sine, cosine and tangent."),
        visual({ type: "rightTriangle", a: 4, b: 3, labels: { a: "opposite", b: "adjacent", c: "hypotenuse", angle: "θ" } }),
        rule("SOH CAH TOA", r`\sin\theta = \frac{\text{opp}}{\text{hyp}} \qquad \cos\theta = \frac{\text{adj}}{\text{hyp}} \qquad \tan\theta = \frac{\text{opp}}{\text{adj}}`),
        example("A ramp makes a $20°$ angle and is 5 m long. How high does it rise?", [["We want the opposite; we know the hypotenuse → sine.", r`\sin 20^\circ = \frac{h}{5}`], ["Solve.", r`h = 5\sin20^\circ \approx 1.71\text{ m}`]]),
        tip("Labels are relative to the angle: \"opposite\" is across from $\\theta$, \"adjacent\" is next to it (but not the hypotenuse)."),
      ],
      generate: (rng, level) => {
        const theta = rng.int(15, 75), hyp = rng.int(5, 20);
        const fn = rng.pick(["sin", "cos", "tan"] as const);
        if (level === 3) {
          const opp = rng.int(2, 12), adj = rng.int(2, 12);
          const ang = round(Math.atan(opp / adj) / DEG, 1);
          return {
            prompt: `A right triangle has opposite side $${opp}$ and adjacent side $${adj}$. Find the angle $\\theta$ in degrees (1 d.p.).`,
            answer: numberAnswer(ang, { tolerance: 0.002 }),
            visual: { type: "rightTriangle", a: opp, b: adj, labels: { a: `${opp}`, b: `${adj}`, angle: "θ" } },
            inputHint: "degrees",
            hints: ["Opposite and adjacent → tangent.", "Use the inverse: θ = tan⁻¹(opp/adj)."],
            solution: [step("Inverse tangent.", r`\theta = \tan^{-1}\!\left(\frac{${opp}}{${adj}}\right) \approx ${ang}^\circ`)],
          };
        }
        if (level === 1) {
          const [o, a, h] = rng.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17]] as [number, number, number][]);
          const ratio = fn === "sin" ? [o, h] : fn === "cos" ? [a, h] : [o, a];
          return {
            prompt: `In the triangle, find $\\${fn}\\theta$ as a fraction.`,
            visual: { type: "rightTriangle", a: o, b: a, labels: { a: `${o}`, b: `${a}`, c: `${h}`, angle: "θ" } },
            answer: numberAnswer(ratio[0]! / ratio[1]!),
            inputHint: "e.g. 3/5",
            hints: ["SOH CAH TOA.", fn === "sin" ? "Opposite over hypotenuse." : fn === "cos" ? "Adjacent over hypotenuse." : "Opposite over adjacent."],
            solution: [step("Apply the ratio.", r`\${fn}\theta = \frac{${ratio[0]}}{${ratio[1]}}`)],
          };
        }
        const side = fn === "sin" ? hyp * Math.sin(theta * DEG) : fn === "cos" ? hyp * Math.cos(theta * DEG) : hyp * Math.tan(theta * DEG);
        const label = fn === "sin" ? "opposite" : fn === "cos" ? "adjacent" : "opposite";
        return {
          prompt: `A right triangle has angle $${theta}°$ and ${fn === "tan" ? "adjacent side" : "hypotenuse"} $${hyp}$. Find the ${label} side (2 d.p.).`,
          answer: numberAnswer(round(side, 2), { tolerance: 0.003 }),
          hints: [`You know the ${fn === "tan" ? "adjacent" : "hypotenuse"} and want the ${label}: use ${fn}.`],
          solution: [step("Rearrange the ratio.", r`${label === "opposite" ? "opp" : "adj"} = ${hyp}\${fn}${theta}^\circ \approx ${round(side, 2)}`)],
        };
      },
    },
    {
      id: "radians",
      title: "Radians",
      summary: "Measuring angles by arc length.",
      prerequisites: ["circles", "angles"],
      estimatedMinutes: 8,
      expectedSeconds: 40,
      keyIdeas: ["$180° = \\pi$ radians.", "One radian: the arc equals the radius."],
      lesson: [
        text("A **radian** is the angle where the arc length equals the radius. A full circle has circumference $2\\pi r$, so a full turn is $2\\pi$ radians."),
        rule("Conversion", r`180^\circ = \pi \text{ rad} \qquad \text{deg} \to \text{rad}: \times\frac{\pi}{180}`),
        example("Convert $135°$ to radians.", [["Multiply by $\\frac{\\pi}{180}$.", r`135\cdot\frac{\pi}{180} = \frac{3\pi}{4}`]]),
        key("Calculus uses radians exclusively — the derivative of $\\sin x$ is $\\cos x$ **only** in radians."),
      ],
      generate: (rng, level) => {
        const deg = rng.pick(level === 1 ? [90, 180, 360, 45, 60, 30] : [120, 135, 150, 210, 225, 240, 270, 300, 315, 330]);
        if (rng.chance(0.5))
          return {
            prompt: `Convert $${radTex(deg)}$ radians to degrees.`,
            answer: numberAnswer(deg),
            inputHint: "degrees",
            hints: ["Replace π with 180°."],
            solution: [step("Substitute π = 180°.", `${deg}^\\circ`)],
          };
        return {
          prompt: `Convert $${deg}°$ to radians.`,
          ...multipleChoice(rng, `$${radTex(deg)}$`, [`$${radTex((deg * 2) % 360 || 90)}$`, `$${radTex(180 - (deg % 180) || 45)}$`, `$${radTex(deg + 30)}$`]),
          hints: ["Multiply by π/180 and simplify."],
          solution: [step("Multiply by π/180.", radTex(deg))],
        };
      },
    },
    {
      id: "unit-circle",
      title: "The Unit Circle",
      summary: "Trig for every angle: $(\\cos\\theta, \\sin\\theta)$.",
      prerequisites: ["right-triangle-trig", "radians"],
      estimatedMinutes: 12,
      expectedSeconds: 45,
      keyIdeas: ["The point at angle $\\theta$ is $(\\cos\\theta, \\sin\\theta)$.", "Signs by quadrant: All, Sin, Tan, Cos."],
      lesson: [
        text("Put a right triangle inside a circle of radius 1. With hypotenuse 1, the legs **are** $\\cos\\theta$ and $\\sin\\theta$. This lets us define trig for **any** angle — even beyond $90°$. Drag the point:"),
        visual({ type: "unitCircle", angle: 40 }),
        rule("Unit circle definition", r`P(\theta) = (\cos\theta,\ \sin\theta) \qquad \tan\theta = \frac{\sin\theta}{\cos\theta}`),
        visual({ type: "rightTriangle", a: 1, b: 1.732, labels: { a: "1", b: "√3", c: "2", angle: "30°" } }, "The 30-60-90 triangle gives $\\sin30° = \\frac12$, $\\cos30° = \\frac{\\sqrt3}{2}$."),
        tip("Memorise the first quadrant: $\\sin$ of $0°, 30°, 45°, 60°, 90°$ is $\\frac{\\sqrt0}{2}, \\frac{\\sqrt1}{2}, \\frac{\\sqrt2}{2}, \\frac{\\sqrt3}{2}, \\frac{\\sqrt4}{2}$."),
      ],
      generate: (rng, level) => {
        const base = rng.pick([30, 45, 60] as const);
        const quadrant = level === 1 ? 0 : rng.int(0, 3);
        const deg = [base, 180 - base, 180 + base, 360 - base][quadrant]!;
        const fn = rng.pick(["sin", "cos"] as const);
        const value = fn === "sin" ? Math.sin(deg * DEG) : Math.cos(deg * DEG);
        const mag = special[base]![fn];
        const correct = `$${value < 0 ? "-" : ""}${mag}$`;
        const other = special[base]![fn === "sin" ? "cos" : "sin"];
        return {
          prompt: `Find the exact value of $\\${fn}(${level === 3 ? radTex(deg) : `${deg}^\\circ`})$.`,
          ...multipleChoice(rng, correct, [`$${value < 0 ? "" : "-"}${mag}$`, `$${value < 0 ? "-" : ""}${other}$`, `$${value < 0 ? "" : "-"}${other}$`]),
          visual: level === 1 ? { type: "unitCircle", angle: deg } : undefined,
          hints: [`The reference angle is ${base}°.`, `In quadrant ${["I", "II", "III", "IV"][quadrant]}, ${fn} is ${value < 0 ? "negative" : "positive"}.`],
          solution: [step(`Reference angle ${base}°, sign from the quadrant.`, `${value < 0 ? "-" : ""}${mag}`)],
        };
      },
    },
    {
      id: "trig-graphs",
      title: "Graphs of Sine & Cosine",
      summary: "Waves: amplitude, period and shifts.",
      prerequisites: ["unit-circle", "transformations"],
      estimatedMinutes: 10,
      expectedSeconds: 45,
      keyIdeas: ["$y = A\\sin(Bx)$: amplitude $|A|$, period $\\frac{2\\pi}{B}$.", "$\\cos$ is $\\sin$ shifted left by $\\frac{\\pi}{2}$."],
      lesson: [
        text("Unroll the unit circle: track the $y$-coordinate as the angle grows and you trace the **sine wave**. Track $x$ and you get cosine."),
        visual({ type: "functionPlot", functions: [{ fn: Math.sin, label: "sin x" }, { fn: Math.cos, tone: "accent", label: "cos x" }], viewBox: { x: [-1, 7], y: [-2, 2] } }),
        rule("Sinusoidal parameters", r`y = A\sin\big(B(x - h)\big) + k \qquad \text{amplitude } |A|,\ \text{period } \frac{2\pi}{|B|}`),
        visual({ type: "transformExplorer", base: "sin" }),
      ],
      generate: (rng, level) => {
        const A = rng.nonZero(-5, 5), B = rng.int(1, 4);
        const askAmp = level === 1 || rng.chance(0.5);
        const fn = rng.pick(["sin", "cos"]);
        return askAmp
          ? {
              prompt: `What is the amplitude of $y = ${A}\\${fn}(${B === 1 ? "" : B}x)$?`,
              answer: numberAnswer(Math.abs(A)),
              hints: ["Amplitude is the size of the coefficient in front — always positive."],
              solution: [step("Amplitude = |A|.", `${Math.abs(A)}`)],
            }
          : {
              prompt: `What is the period of $y = ${A}\\${fn}(${B}x)$? (Answer in terms of π, e.g. pi/2.)`,
              answer: numberAnswer((2 * Math.PI) / B),
              inputHint: "e.g. pi/2",
              hints: ["Period = 2π ÷ B."],
              solution: [step("Divide 2π by B.", r`\frac{2\pi}{${B}}`)],
            };
      },
    },
    {
      id: "trig-identities",
      title: "Trig Identities",
      summary: "$\\sin^2\\theta + \\cos^2\\theta = 1$ and friends.",
      prerequisites: ["unit-circle", "pythagorean-theorem"],
      estimatedMinutes: 10,
      expectedSeconds: 55,
      keyIdeas: ["$\\sin^2\\theta + \\cos^2\\theta = 1$ is Pythagoras on the unit circle.", "$\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}$"],
      lesson: [
        text("On the unit circle the point $(\\cos\\theta, \\sin\\theta)$ is distance 1 from the origin. Pythagoras immediately gives the most important identity in trigonometry."),
        rule("Pythagorean identity", r`\sin^2\theta + \cos^2\theta = 1`),
        rule("Quotient identity", r`\tan\theta = \frac{\sin\theta}{\cos\theta}`),
        example("If $\\sin\\theta = \\frac35$ and $\\theta$ is acute, find $\\cos\\theta$.", [["Use the identity.", r`\cos^2\theta = 1 - \frac{9}{25} = \frac{16}{25}`], ["Acute → positive.", r`\cos\theta = \frac45`]]),
        warn("$\\sin^2\\theta$ means $(\\sin\\theta)^2$, not $\\sin(\\theta^2)$."),
      ],
      generate: (rng, level) => {
        const [o, a, h] = rng.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]] as [number, number, number][]);
        const givenSin = rng.chance(0.5);
        if (level === 3)
          return {
            prompt: `If $\\${givenSin ? "sin" : "cos"}\\theta = \\frac{${givenSin ? o : a}}{${h}}$ and $\\theta$ is acute, find $\\tan\\theta$.`,
            answer: numberAnswer(o / a),
            inputHint: "e.g. 3/4",
            hints: ["Find the other ratio with the Pythagorean identity.", "Then tan = sin / cos."],
            solution: [step("The other ratio.", givenSin ? r`\cos\theta = \frac{${a}}{${h}}` : r`\sin\theta = \frac{${o}}{${h}}`), step("Divide.", r`\tan\theta = \frac{${o}}{${a}}`)],
          };
        return {
          prompt: `If $\\${givenSin ? "sin" : "cos"}\\theta = \\frac{${givenSin ? o : a}}{${h}}$ and $\\theta$ is acute, find $\\${givenSin ? "cos" : "sin"}\\theta$.`,
          answer: numberAnswer((givenSin ? a : o) / h),
          inputHint: "e.g. 4/5",
          hints: ["Use sin²θ + cos²θ = 1.", "Acute angle → positive value."],
          solution: [step("Identity.", r`1 - \left(\frac{${givenSin ? o : a}}{${h}}\right)^2 = \frac{${(givenSin ? a : o) ** 2}}{${h * h}}`), step("Square root.", r`\frac{${givenSin ? a : o}}{${h}}`)],
        };
      },
    },
  ],
};
