import { example, key, math, multipleChoice, numberAnswer, rule, step, text, tip, visual, warn } from "../../../core/builders";
import { linear, paren, quadratic, round } from "../../../core/math";
import type { Unit } from "../../../core/types";

const r = String.raw;

export const functionsUnit: Unit = {
  id: "functions",
  title: "Functions",
  icon: "FunctionSquare",
  description: "Inputs and outputs, notation, domain, composition, inverses and transformations.",
  exercises: [
    {
      id: "functions-intro",
      title: "What Is a Function?",
      summary: "A rule giving exactly one output for each input.",
      prerequisites: ["coordinate-plane", "evaluating-expressions"],
      estimatedMinutes: 7,
      expectedSeconds: 35,
      keyIdeas: ["Each input has exactly one output.", "Vertical line test: no vertical line hits the graph twice."],
      lesson: [
        text("A **function** is a machine: feed it an input, get **exactly one** output. \"Double it and add 1\" is a function: $3 \\mapsto 7$, $-2 \\mapsto -3$."),
        key("A graph is a function if every **vertical line** crosses it at most once — otherwise one input would have two outputs."),
        visual({ type: "functionPlot", functions: [{ fn: (x) => x * x - 2, label: "function ✓" }, { fn: (x) => (x >= 0 ? Math.sqrt(x) + 1 : NaN), tone: "accent" }, { fn: (x) => (x >= 0 ? -Math.sqrt(x) + 1 : NaN), tone: "accent", label: "x = (y−1)²  ✗" }], viewBox: { x: [-5, 6], y: [-4, 6] } }, "The parabola passes; the sideways parabola fails the vertical line test."),
        tip("Mapping $x \\to y$: inputs can share an output (like $x^2$: $2 \\to 4$ and $-2 \\to 4$), but one input can't have two outputs."),
      ],
      generate: (rng) => {
        const isFn = rng.chance(0.5);
        const xs = rng.shuffle([-2, -1, 0, 1, 2, 3, 4]).slice(0, 4);
        const pairs = xs.map((x) => [x, rng.int(-5, 5)] as [number, number]);
        if (!isFn) pairs.push([pairs[0]![0], pairs[0]![1] + rng.nonZero(1, 3)]);
        const shown = rng.shuffle(pairs).map(([x, y]) => `(${x}, ${y})`).join(r`,\ `);
        return {
          prompt: "Does this set of ordered pairs describe a function?",
          tex: r`\{${shown}\}`,
          ...multipleChoice(rng, isFn ? "Yes — each input has one output" : "No — an input has two outputs", [isFn ? "No — an input has two outputs" : "Yes — each input has one output"]),
          hints: ["Look for a repeated x-value with different y-values."],
          solution: [step(isFn ? "Every x-value appears once." : `x = ${pairs[0]![0]} is paired with two different outputs.`)],
        };
      },
    },
    {
      id: "function-notation",
      title: "Function Notation",
      summary: "Reading and evaluating $f(x)$.",
      prerequisites: ["functions-intro"],
      estimatedMinutes: 6,
      expectedSeconds: 35,
      keyIdeas: ["$f(3)$ means: replace $x$ with $3$.", "$f(x) = 5$ asks which input gives output 5."],
      lesson: [
        text("$f(x)$ is read \"$f$ of $x$\" — it's the output of function $f$ at input $x$. It does **not** mean $f \\times x$."),
        example("If $f(x) = x^2 - 3x$, find $f(-2)$.", [["Substitute with brackets.", r`f(-2) = (-2)^2 - 3(-2)`], ["Evaluate.", r`= 4 + 6 = 10`]]),
        example("If $g(x) = 2x + 1$, find $x$ when $g(x) = 9$.", [["Set up an equation.", r`2x + 1 = 9`], ["Solve.", r`x = 4`]]),
        tip("You can substitute expressions too: $g(a + 1) = 2(a + 1) + 1 = 2a + 3$."),
      ],
      generate: (rng, level) => {
        const a = rng.nonZero(-4, 4), b = rng.int(-6, 6), c = rng.int(-8, 8), x = rng.int(-4, 4);
        if (level === 3) {
          const target = rng.int(-6, 8);
          const m = rng.nonZero(-5, 5);
          return {
            prompt: `If $f(x) = ${linear(m, b)}$, for what $x$ is $f(x) = ${m * target + b}$?`,
            answer: numberAnswer(target),
            hints: ["Set the expression equal to the output and solve."],
            solution: [step("Solve.", r`${linear(m, b)} = ${m * target + b} \Rightarrow x = ${target}`)],
          };
        }
        const f = level === 1 ? linear(a, c) : quadratic(a, b, c);
        const val = level === 1 ? a * x + c : a * x * x + b * x + c;
        return {
          prompt: `If $f(x) = ${f}$, find $f(${x})$.`,
          answer: numberAnswer(val),
          hints: ["Replace every x with the input, in brackets."],
          solution: [step("Substitute and evaluate.", r`f(${x}) = ${val}`)],
        };
      },
    },
    {
      id: "domain-range",
      title: "Domain & Range",
      summary: "Which inputs are allowed, and which outputs occur.",
      prerequisites: ["function-notation", "inequalities", "square-roots"],
      estimatedMinutes: 8,
      expectedSeconds: 45,
      keyIdeas: ["Domain: allowed inputs. Range: resulting outputs.", "No dividing by 0; no square roots of negatives."],
      lesson: [
        text("The **domain** is the set of inputs a function accepts. The **range** is the set of outputs it actually produces."),
        rule("Usual restrictions", r`\frac{1}{x - a}:\; x \neq a \qquad \sqrt{x - a}:\; x \ge a`),
        visual({ type: "functionPlot", functions: [{ fn: (x) => (x >= 1 ? Math.sqrt(x - 1) : NaN), label: "y = √(x − 1)" }], points: [{ x: 1, y: 0, label: "(1, 0)" }], viewBox: { x: [-2, 10], y: [-1, 4] } }, "Domain $x \\ge 1$, range $y \\ge 0$."),
        example("Find the domain of $f(x) = \\dfrac{3}{x + 4}$.", ["The denominator can't be zero: $x + 4 \\neq 0$.", "Domain: all real numbers except $x = -4$."]),
      ],
      generate: (rng, level) => {
        const a = rng.int(-8, 8);
        if (level <= 2 && rng.chance(0.5))
          return {
            prompt: `Which value of $x$ is **excluded** from the domain of $f(x) = \\dfrac{5}{x ${a < 0 ? "+" : "-"} ${Math.abs(a)}}$?`,
            answer: numberAnswer(a),
            hints: ["The denominator cannot be zero."],
            solution: [step("Set the denominator to 0.", `x = ${a}`)],
          };
        const k = rng.int(-5, 5);
        return {
          prompt: `The domain of $f(x) = \\sqrt{x ${a < 0 ? "+" : "-"} ${Math.abs(a)}} ${k < 0 ? "-" : "+"} ${Math.abs(k)}$ is $x \\ge a$ and the range is $y \\ge b$. Enter $a, b$.`,
          answer: { kind: "tuple", values: [a, k] },
          inputHint: "e.g. 3, -2",
          hints: ["The inside of a square root must be ≥ 0.", "The smallest output of √ is 0 — then add the constant."],
          solution: [step("Domain.", `x \\ge ${a}`), step("Range.", `y \\ge ${k}`)],
        };
      },
    },
    {
      id: "piecewise-functions",
      title: "Piecewise Functions",
      summary: "Different rules on different parts of the domain.",
      prerequisites: ["function-notation", "interval-notation"],
      estimatedMinutes: 10,
      expectedSeconds: 55,
      keyIdeas: [
        "To evaluate, first find the piece whose condition the input satisfies.",
        "$|x|$ is piecewise: $x$ when $x \\ge 0$, and $-x$ when $x < 0$.",
        "A graph is **continuous** at a boundary when the pieces meet there.",
      ],
      lesson: [
        text("A **piecewise function** uses different formulas on different intervals. Taxi fares, tax bands and phone plans all work this way, and calculus uses them to study what happens at a join."),
        math(r`f(x) = \begin{cases} x + 2 & x < 1 \\ 4 - x & x \ge 1 \end{cases}`),
        visual(
          { type: "functionPlot", functions: [{ fn: (x) => (x < 1 ? x + 2 : NaN) }, { fn: (x) => (x >= 1 ? 4 - x : NaN), tone: "accent" }], points: [{ x: 1, y: 3, label: "(1, 3)" }], viewBox: { x: [-4, 6], y: [-2, 6] } },
          "The two pieces meet at $x = 1$, so the graph has no jump.",
        ),
        example("Using $f$ above, find $f(-2)$ and $f(3)$.", [["$-2 < 1$, so use the first piece.", r`f(-2) = -2 + 2 = 0`], ["$3 \\ge 1$, so use the second.", r`f(3) = 4 - 3 = 1`]]),
        rule("Absolute value", r`|x| = \begin{cases} x & x \ge 0 \\ -x & x < 0 \end{cases}`),
        key("At a boundary, compare where each piece is heading with the function's value there. If they all agree, the graph joins up: it's **continuous** there. That becomes the definition of continuity in calculus."),
      ],
      generate: (rng, level) => {
        const c = rng.int(-2, 3);
        const a1 = rng.nonZero(-3, 3), b1 = rng.int(-5, 5), a2 = rng.nonZero(-3, 3), b2 = rng.int(-5, 5);
        const cases = (rows: [string, string][]) => r`f(x) = \begin{cases} ${rows.map(([e, cond]) => `${e} & ${cond}`).join(r` \\ `)} \end{cases}`;
        const at = (expr: string, v: number) => expr.replace(/x/g, `(${v})`);
        if (level === 3) {
          // k makes the right piece start where the left piece ends.
          const left = a1 * c + b1, k = left - c * c;
          return {
            prompt: `Find the value of $k$ that makes $f$ continuous at $x = ${c}$.`,
            tex: cases([[linear(a1, b1), `x < ${c}`], ["x^2 + k", r`x \ge ${c}`]]),
            answer: numberAnswer(k),
            hints: [`For the graph to join up, both pieces must give the same value at x = ${c}.`, "Work out the left piece at the boundary, then solve for k."],
            solution: [step("The left piece at the boundary.", `${at(linear(a1, b1), c)} = ${left}`), step("Make the right piece match.", r`${paren(c)}^2 + k = ${left} \;\Rightarrow\; k = ${k}`)],
          };
        }
        const rows: [string, string][] =
          level === 1
            ? [[linear(a1, b1), `x < ${c}`], [linear(a2, b2), r`x \ge ${c}`]]
            : [[linear(a1, b1), `x < ${c}`], [String(b2), `x = ${c}`], [quadratic(1, 0, a2), `x > ${c}`]];
        const t = rng.chance(0.3) ? c : c + rng.nonZero(-4, 4);
        const piece = t < c ? 0 : level === 1 ? 1 : t === c ? 1 : 2;
        const value = piece === 0 ? a1 * t + b1 : level === 1 ? a2 * t + b2 : piece === 1 ? b2 : t * t + a2;
        return {
          prompt: `Find $f(${t})$.`,
          tex: cases(rows),
          answer: numberAnswer(value),
          hints: [`First decide which condition x = ${t} satisfies.`, t === c ? "Careful: which piece includes the boundary point itself?" : "Then substitute into that piece only."],
          solution: [step(`$${t}$ satisfies $${rows[piece]![1]}$, so use that piece.`), step("Substitute.", `f(${t}) = ${at(rows[piece]![0], t)} = ${value}`)],
        };
      },
    },
    {
      id: "composition",
      title: "Composite Functions",
      summary: "Feeding one function into another: $f(g(x))$.",
      prerequisites: ["function-notation"],
      estimatedMinutes: 8,
      expectedSeconds: 50,
      keyIdeas: ["$f(g(x))$: apply $g$ first, then $f$.", "Usually $f(g(x)) \\neq g(f(x))$."],
      lesson: [
        text("A **composite** function chains machines: the output of $g$ becomes the input of $f$. We write $(f \\circ g)(x) = f(g(x))$."),
        example("$f(x) = x^2,\\ g(x) = x + 3$. Find $f(g(2))$ and $g(f(2))$.", [["Inside first.", r`g(2) = 5 \Rightarrow f(5) = 25`], ["The other order.", r`f(2) = 4 \Rightarrow g(4) = 7`]]),
        warn("Order matters: work from the **inside out**."),
      ],
      generate: (rng, level) => {
        const a = rng.nonZero(-4, 4), b = rng.int(-5, 5), c = rng.nonZero(-3, 3), d = rng.int(-5, 5), x = rng.int(-3, 3);
        const g = (t: number) => c * t + d;
        if (level === 3) {
          return {
            prompt: `If $f(x) = ${linear(a, b)}$ and $g(x) = ${linear(c, d)}$, then $f(g(x)) = mx + k$. Enter $m, k$.`,
            answer: { kind: "tuple", values: [a * c, a * d + b] },
            inputHint: "e.g. 6, -1",
            hints: ["Substitute the whole expression g(x) wherever f has an x."],
            solution: [step("Substitute.", r`${a}(${linear(c, d)})${b < 0 ? "-" : "+"}${Math.abs(b)} = ${linear(a * c, a * d + b)}`)],
          };
        }
        const fsq = level === 2;
        const f = (t: number) => (fsq ? t * t + b : a * t + b);
        return {
          prompt: `If $f(x) = ${fsq ? quadratic(1, 0, b) : linear(a, b)}$ and $g(x) = ${linear(c, d)}$, find $f(g(${x}))$.`,
          answer: numberAnswer(f(g(x))),
          hints: [`Compute g(${x}) first.`, "Feed that result into f."],
          solution: [step("Inside first.", `g(${x}) = ${g(x)}`), step("Then f.", `f(${g(x)}) = ${f(g(x))}`)],
        };
      },
    },
    {
      id: "inverse-functions",
      title: "Inverse Functions",
      summary: "Undoing a function: $f^{-1}$.",
      prerequisites: ["composition", "literal-equations"],
      estimatedMinutes: 9,
      expectedSeconds: 55,
      keyIdeas: ["$f^{-1}$ reverses $f$: if $f(a) = b$ then $f^{-1}(b) = a$.", "Swap $x$ and $y$, then solve for $y$."],
      lesson: [
        text("An **inverse** function runs the machine backwards. If $f$ turns $2$ into $7$, then $f^{-1}$ turns $7$ back into $2$."),
        rule("Finding an inverse", r`y = f(x) \;\xrightarrow{\text{swap } x,y}\; x = f(y) \;\xrightarrow{\text{solve}}\; y = f^{-1}(x)`),
        example("Find the inverse of $f(x) = 3x - 6$.", [["Swap.", r`x = 3y - 6`], ["Solve for $y$.", r`f^{-1}(x) = \frac{x + 6}{3}`]]),
        visual({ type: "functionPlot", functions: [{ fn: (x) => 3 * x - 6, label: "f" }, { fn: (x) => (x + 6) / 3, tone: "accent", label: "f⁻¹" }, { fn: (x) => x, tone: "muted", dashed: true, label: "y = x" }], viewBox: { x: [-6, 8], y: [-6, 8] } }, "An inverse is the mirror image in the line $y = x$."),
        warn("$f^{-1}(x)$ is **not** $\\frac{1}{f(x)}$."),
      ],
      generate: (rng, level) => {
        const a = rng.nonZero(-5, 5), b = rng.int(-9, 9);
        const y = rng.int(-5, 5);
        const out = a * y + b;
        if (level === 3)
          return {
            prompt: `For $f(x) = ${linear(a, b)}$, the inverse is $f^{-1}(x) = \\dfrac{x - p}{q}$. Enter $p, q$.`,
            answer: { kind: "tuple", values: [b, a] },
            inputHint: "e.g. -6, 3",
            hints: ["Swap x and y, then solve for y."],
            solution: [step("Swap and solve.", r`f^{-1}(x) = \frac{x - ${paren(b)}}{${a}}`)],
          };
        return {
          prompt: `If $f(x) = ${linear(a, b)}$, find $f^{-1}(${out})$.`,
          answer: numberAnswer(y),
          hints: [`Ask: which input makes f(x) = ${out}?`],
          solution: [step("Solve f(x) = output.", r`${linear(a, b)} = ${out} \Rightarrow x = ${y}`)],
        };
      },
    },
    {
      id: "transformations",
      title: "Transforming Graphs",
      summary: "Shifts, stretches and reflections of $y = f(x)$.",
      prerequisites: ["function-notation", "slope-intercept"],
      estimatedMinutes: 10,
      expectedSeconds: 45,
      keyIdeas: ["$f(x) + k$: up $k$. $f(x - h)$: right $h$.", "$a f(x)$: vertical stretch; $-f(x)$: reflect in the $x$-axis."],
      lesson: [
        text("Knowing one graph lets you draw a whole family. Use the sliders to see how $y = a\\,f(x - h) + k$ moves the parent graph."),
        visual({ type: "transformExplorer", base: "square" }),
        rule("Transformations", r`y = a\,f(x - h) + k`, "$h$ shifts right, $k$ shifts up, $|a|$ stretches, and $a < 0$ reflects."),
        warn("Inside the bracket feels backwards: $f(x - 3)$ moves the graph **right** by 3."),
        tip("Try the other parent functions in the explorer: $|x|$, $\\sqrt{x}$, $\\sin x$, $e^x$."),
      ],
      generate: (rng, level) => {
        const h = rng.int(-5, 5), k = rng.int(-5, 5);
        if (level === 1) {
          const vertical = rng.chance(0.5);
          const amt = vertical ? k || 3 : h || 2;
          const correct = vertical ? (amt > 0 ? `Up ${amt}` : `Down ${-amt}`) : amt > 0 ? `Right ${amt}` : `Left ${-amt}`;
          const tex = vertical ? `y = x^2 ${amt < 0 ? "-" : "+"} ${Math.abs(amt)}` : `y = (x ${amt < 0 ? "+" : "-"} ${Math.abs(amt)})^2`;
          return {
            prompt: `How is $${tex}$ moved compared with $y = x^2$?`,
            ...multipleChoice(rng, correct, vertical ? [amt > 0 ? `Down ${amt}` : `Up ${-amt}`, `Right ${Math.abs(amt)}`, `Left ${Math.abs(amt)}`] : [amt > 0 ? `Left ${amt}` : `Right ${-amt}`, `Up ${Math.abs(amt)}`, `Down ${Math.abs(amt)}`]),
            hints: [vertical ? "Adding outside shifts vertically." : "Changes inside the bracket shift horizontally — opposite to the sign."],
            solution: [step(`The graph moves ${correct.toLowerCase()}.`)],
          };
        }
        return {
          prompt: `The graph of $y = |x|$ is shifted ${h >= 0 ? "right" : "left"} $${Math.abs(h)}$ and ${k >= 0 ? "up" : "down"} $${Math.abs(k)}$. Where is the new vertex? Enter $(x, y)$.`,
          answer: { kind: "tuple", values: [h, k] },
          inputHint: "e.g. (2, -3)",
          hints: ["The vertex of |x| starts at (0, 0).", "Apply each shift to the vertex."],
          solution: [step("New function.", r`y = |x ${h < 0 ? "+" : "-"} ${Math.abs(h)}| ${k < 0 ? "-" : "+"} ${Math.abs(k)}`), step("Vertex.", `(${h}, ${k})`)],
        };
      },
    },
    {
      id: "average-rate-of-change",
      title: "Average Rate of Change",
      summary: "The slope between two points on a curve.",
      prerequisites: ["function-notation", "slope"],
      estimatedMinutes: 9,
      expectedSeconds: 50,
      keyIdeas: [
        "The average rate of change on $[a, b]$ is $\\dfrac{f(b) - f(a)}{b - a}$.",
        "It's the slope of the **secant line** through the two points.",
        "Shrink the interval and it approaches the instantaneous rate of change: the derivative.",
      ],
      lesson: [
        text("A line has the same slope everywhere. A curve doesn't, but we can still ask how fast it changes *on average* between two inputs: the change in output divided by the change in input."),
        rule("Average rate of change", r`\frac{\Delta y}{\Delta x} = \frac{f(b) - f(a)}{b - a}`),
        visual(
          {
            type: "functionPlot",
            functions: [{ fn: (x) => x * x }, { fn: (x) => 4 * x - 3, tone: "accent", dashed: true }],
            points: [{ x: 1, y: 1, label: "(1, 1)" }, { x: 3, y: 9, label: "(3, 9)" }],
            viewBox: { x: [-2, 5], y: [-2, 12] },
          },
          "The secant through $(1, 1)$ and $(3, 9)$ has slope 4: the average rate of change of $x^2$ on $[1, 3]$.",
        ),
        example("A ball's height is $h(t) = 20t - 5t^2$ metres. Find its average velocity from $t = 1$ to $t = 3$ seconds.", [
          ["Find both heights.", r`h(1) = 15, \quad h(3) = 15`],
          ["Divide the change in height by the change in time.", r`\frac{15 - 15}{3 - 1} = 0 \text{ m/s}`],
          "It went up and came back down to the same height, so on average it didn't move.",
        ]),
        key("Calculus asks what happens to this slope as $b$ slides closer and closer to $a$. The answer is the **instantaneous** rate of change: the derivative."),
      ],
      generate: (rng, level) => {
        if (level === 3) {
          const a = rng.int(-3, 4), h = rng.pick([0.1, 0.01, 0.001]);
          const b = round(a + h, 6), change = round(b * b - a * a, 8), rate = round(2 * a + h, 8);
          return {
            prompt: `Find the average rate of change of $f(x) = x^2$ on $[${a}, ${b}]$.`,
            answer: numberAnswer(rate),
            hints: ["Find f at both ends, subtract, and divide by the width of the interval.", `The width of the interval is ${h}.`],
            solution: [
              step("Change in output.", r`${paren(b)}^2 - ${paren(a)}^2 = ${change}`),
              step("Divide by the width.", r`\frac{${change}}{${h}} = ${rate}`),
              step(`As the interval shrinks, this heads towards $${2 * a}$: the slope of $x^2$ exactly at $x = ${a}$.`),
            ],
          };
        }
        const A = level === 1 ? 1 : rng.nonZero(-3, 3), B = level === 1 ? 0 : rng.int(-5, 5), C = rng.int(-6, 6);
        const a = rng.int(-4, 3), b = a + rng.int(1, 4);
        const f = (x: number) => A * x * x + B * x + C;
        const rate = (f(b) - f(a)) / (b - a);
        const ys = [a - 1, a, b, b + 1].map(f);
        return {
          prompt: `Find the average rate of change of $f(x) = ${quadratic(A, B, C)}$ on $[${a}, ${b}]$.`,
          answer: numberAnswer(rate),
          hints: [`Find f(${b}) and f(${a}).`, "Subtract the outputs, then divide by the change in x."],
          solution: [step("Evaluate both ends.", r`f(${b}) = ${f(b)}, \quad f(${a}) = ${f(a)}`), step("Slope of the secant.", r`\frac{${f(b)} - ${paren(f(a))}}{${b} - ${paren(a)}} = ${rate}`)],
          solutionVisual: {
            type: "functionPlot",
            functions: [{ fn: f, tone: "muted" }, { fn: (x) => f(a) + rate * (x - a), tone: "accent", dashed: true }],
            points: [{ x: a, y: f(a) }, { x: b, y: f(b) }],
            viewBox: { x: [a - 2, b + 2], y: [Math.min(...ys) - 3, Math.max(...ys) + 3] },
          },
        };
      },
    },
  ],
};
