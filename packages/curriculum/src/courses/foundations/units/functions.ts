import { example, key, multipleChoice, numberAnswer, rule, step, text, tip, visual, warn } from "../../../core/builders";
import { linear, paren, quadratic } from "../../../core/math";
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
  ],
};
