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
          solutionVisual: level === 1 ? { type: "unitCircle", angle: deg } : undefined,
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
      keyIdeas: [
        "$\\sin^2\\theta + \\cos^2\\theta = 1$ is Pythagoras on the unit circle.",
        "$\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}$",
        "Double angles: $\\sin 2\\theta = 2\\sin\\theta\\cos\\theta$ and $\\cos 2\\theta = \\cos^2\\theta - \\sin^2\\theta$.",
      ],
      lesson: [
        text("On the unit circle the point $(\\cos\\theta, \\sin\\theta)$ is distance 1 from the origin. Pythagoras immediately gives the most important identity in trigonometry."),
        rule("Pythagorean identity", r`\sin^2\theta + \cos^2\theta = 1`),
        rule("Quotient identity", r`\tan\theta = \frac{\sin\theta}{\cos\theta}`),
        example("If $\\sin\\theta = \\frac35$ and $\\theta$ is acute, find $\\cos\\theta$.", [["Use the identity.", r`\cos^2\theta = 1 - \frac{9}{25} = \frac{16}{25}`], ["Acute → positive.", r`\cos\theta = \frac45`]]),
        warn("$\\sin^2\\theta$ means $(\\sin\\theta)^2$, not $\\sin(\\theta^2)$."),
        rule("Double-angle identities", r`\sin 2\theta = 2\sin\theta\cos\theta \qquad \cos 2\theta = \cos^2\theta - \sin^2\theta = 1 - 2\sin^2\theta`, "Calculus leans on these to simplify integrals like $\\int \\sin^2 x\\,dx$."),
        example("If $\\sin\\theta = \\frac35$ and $\\theta$ is acute, find $\\sin 2\\theta$.", [["From the first example, $\\cos\\theta = \\frac45$.", r`\sin 2\theta = 2\cdot\frac35\cdot\frac45`], ["Multiply.", r`\sin 2\theta = \frac{24}{25}`]]),
      ],
      generate: (rng, level) => {
        const [o, a, h] = rng.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]] as [number, number, number][]);
        const givenSin = rng.chance(0.5);
        if (level === 3 && rng.chance(0.5)) {
          const sin2 = rng.chance(0.5);
          return {
            prompt: `If $\\${givenSin ? "sin" : "cos"}\\theta = \\frac{${givenSin ? o : a}}{${h}}$ and $\\theta$ is acute, find $\\${sin2 ? "sin" : "cos"} 2\\theta$.`,
            answer: numberAnswer(sin2 ? (2 * o * a) / (h * h) : (a * a - o * o) / (h * h)),
            inputHint: "e.g. 24/25",
            hints: ["Find the other ratio first with sin²θ + cos²θ = 1.", sin2 ? "sin 2θ = 2 sin θ cos θ" : "cos 2θ = cos²θ − sin²θ"],
            solution: [
              step("Both ratios.", r`\sin\theta = \frac{${o}}{${h}}, \quad \cos\theta = \frac{${a}}{${h}}`),
              sin2
                ? step("Double angle.", r`\sin 2\theta = 2\cdot\frac{${o}}{${h}}\cdot\frac{${a}}{${h}} = \frac{${2 * o * a}}{${h * h}}`)
                : step("Double angle.", r`\cos 2\theta = \frac{${a * a}}{${h * h}} - \frac{${o * o}}{${h * h}} = \frac{${a * a - o * o}}{${h * h}}`),
            ],
          };
        }
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
    {
      id: "trig-equations",
      title: "Solving Trig Equations",
      summary: "Inverse trig functions, and finding every angle that works.",
      prerequisites: ["unit-circle", "trig-identities"],
      estimatedMinutes: 12,
      expectedSeconds: 70,
      keyIdeas: [
        "$\\sin^{-1}$, $\\cos^{-1}$ and $\\tan^{-1}$ each return one **principal** angle.",
        "Use the reference angle and each quadrant's signs to find every solution in $[0°, 360°)$.",
        "Isolate the trig function first, just as you'd isolate $x$.",
      ],
      lesson: [
        text("$\\sin x = \\frac12$ has infinitely many solutions, because sine repeats every 360°. Usually we want every solution in one turn: $0° \\le x < 360°$."),
        rule(
          "Inverse trig functions",
          r`\sin^{-1}\!\left(\tfrac12\right) = 30^\circ, \quad \cos^{-1}\!\left(-\tfrac12\right) = 120^\circ, \quad \tan^{-1}(1) = 45^\circ`,
          "Each returns one **principal** value: $\\sin^{-1}$ in $[-90°, 90°]$, $\\cos^{-1}$ in $[0°, 180°]$ and $\\tan^{-1}$ in $(-90°, 90°)$.",
        ),
        visual({ type: "unitCircle", angle: 30 }, "$\\sin x = \\frac12$ at $30°$, and again at $150°$, its mirror image across the $y$-axis."),
        rule("Where each function is positive", r`\sin > 0:\ \text{QI, QII} \qquad \cos > 0:\ \text{QI, QIV} \qquad \tan > 0:\ \text{QI, QIII}`),
        example("Solve $2\\cos x + \\sqrt3 = 0$ for $0° \\le x < 360°$.", [
          ["Isolate cosine.", r`\cos x = -\frac{\sqrt3}{2}`],
          ["The reference angle is $30°$, and cosine is negative in quadrants II and III.", r`x = 180^\circ - 30^\circ = 150^\circ \;\text{ or }\; x = 180^\circ + 30^\circ = 210^\circ`],
        ]),
        key("Calculus finds turning points by solving $f'(x) = 0$. For trig functions, that means solving equations exactly like these."),
      ],
      generate: (rng, level) => {
        type Fn = "sin" | "cos" | "tan";
        const fns: Record<Fn, (d: number) => number> = { sin: (d) => Math.sin(d * DEG), cos: (d) => Math.cos(d * DEG), tan: (d) => Math.tan(d * DEG) };
        // Every solution in [0°, 360°) among the special angles.
        const solve = (fn: Fn, value: number) =>
          Array.from({ length: 24 }, (_, i) => i * 15).filter((d) => (fn !== "tan" || d % 180 !== 90) && Math.abs(fns[fn](d) - value) < 1e-9);
        const answerOf = (fn: Fn, value: number) => ({ kind: "set" as const, values: solve(fn, value) });
        const prompt = "Solve for $0^\\circ \\le x < 360^\\circ$. Enter every solution in degrees.";
        const quadrantHint = (fn: Fn, value: number) =>
          `${fn === "sin" ? "Sine" : fn === "cos" ? "Cosine" : "Tangent"} is ${value < 0 ? "negative" : "positive"} in quadrants ${
            { sin: value < 0 ? "III and IV" : "I and II", cos: value < 0 ? "II and III" : "I and IV", tan: value < 0 ? "II and IV" : "I and III" }[fn]
          }.`;
        if (level === 1) {
          const [tex, value] = rng.pick([[r`\frac12`, 0.5], [r`\frac{\sqrt2}{2}`, Math.SQRT1_2], [r`\frac{\sqrt3}{2}`, Math.sqrt(3) / 2]] as [string, number][]);
          const fn = rng.pick(["sin", "cos"] as const);
          if (rng.chance(0.3)) {
            const principal = solve(fn, value)[0]!;
            return {
              prompt: "Find the value in degrees.",
              tex: `\\${fn}^{-1}\\!\\left(${tex}\\right)`,
              answer: numberAnswer(principal),
              hints: [`Which special angle has ${fn} equal to this?`, "Inverse trig gives the principal value, here an acute angle."],
              solution: [step(`$\\${fn}(${principal}^\\circ) = ${tex}$.`, `${principal}^\\circ`)],
            };
          }
          const sols = solve(fn, value);
          return {
            prompt,
            tex: `\\${fn} x = ${tex}`,
            answer: answerOf(fn, value),
            inputHint: "e.g. 30, 150",
            hints: [`The reference angle is ${sols[0]}°.`, quadrantHint(fn, value)],
            solution: [step(`Reference angle ${sols[0]}°.`), step("Every solution in one turn.", sols.map((d) => `${d}^\\circ`).join(", "))],
          };
        }
        if (level === 2) {
          const fn = rng.pick(["sin", "cos", "tan"] as const);
          const options: [string, number][] =
            fn === "tan"
              ? [["1", 1], ["-1", -1], [r`\sqrt3`, Math.sqrt(3)], [r`-\sqrt3`, -Math.sqrt(3)], [r`\frac{\sqrt3}{3}`, Math.sqrt(3) / 3], [r`-\frac{\sqrt3}{3}`, -Math.sqrt(3) / 3]]
              : [[r`-\frac12`, -0.5], [r`-\frac{\sqrt2}{2}`, -Math.SQRT1_2], [r`-\frac{\sqrt3}{2}`, -Math.sqrt(3) / 2], ["0", 0], ["-1", -1]];
          const [tex, value] = rng.pick(options);
          const sols = solve(fn, value);
          return {
            prompt,
            tex: `\\${fn} x = ${tex}`,
            answer: answerOf(fn, value),
            inputHint: "e.g. 120, 240",
            hints: ["Find the reference angle from the value without its sign.", value === 0 || Math.abs(value) === 1 ? "Picture the unit circle: these values sit on the axes." : quadrantHint(fn, value)],
            solution: [step("Every solution in one turn.", sols.map((d) => `${d}^\\circ`).join(", "))],
          };
        }
        const [equation, fn, value, isolated] = rng.pick([
          [r`2\sin x - 1 = 0`, "sin", 0.5, r`\sin x = \frac12`],
          [r`2\sin x + \sqrt3 = 0`, "sin", -Math.sqrt(3) / 2, r`\sin x = -\frac{\sqrt3}{2}`],
          [r`2\sin x + \sqrt2 = 0`, "sin", -Math.SQRT1_2, r`\sin x = -\frac{\sqrt2}{2}`],
          [r`\sqrt2\cos x - 1 = 0`, "cos", Math.SQRT1_2, r`\cos x = \frac{\sqrt2}{2}`],
          [r`2\cos x + 1 = 0`, "cos", -0.5, r`\cos x = -\frac12`],
          [r`2\cos x - \sqrt3 = 0`, "cos", Math.sqrt(3) / 2, r`\cos x = \frac{\sqrt3}{2}`],
          [r`\tan x + 1 = 0`, "tan", -1, r`\tan x = -1`],
          [r`\sqrt3\tan x - 1 = 0`, "tan", Math.sqrt(3) / 3, r`\tan x = \frac{\sqrt3}{3}`],
          [r`4\sin^2 x = 3`, "sin2", Math.sqrt(3) / 2, r`\sin x = \pm\frac{\sqrt3}{2}`],
        ] as [string, Fn | "sin2", number, string][]);
        const sols = fn === "sin2" ? [...solve("sin", value), ...solve("sin", -value)].sort((a, b) => a - b) : solve(fn, value);
        return {
          prompt,
          tex: equation,
          answer: { kind: "set", values: sols },
          inputHint: "e.g. 30, 150",
          hints: ["Isolate the trig function first.", fn === "sin2" ? "Taking a square root gives both a positive and a negative value." : quadrantHint(fn, value)],
          solution: [step("Isolate it.", isolated), step("Every solution in one turn.", sols.map((d) => `${d}^\\circ`).join(", "))],
        };
      },
    },
  ],
};
