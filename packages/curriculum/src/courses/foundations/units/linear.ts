import { example, key, multipleChoice, numberAnswer, rule, step, text, tip, visual } from "../../../core/builders";
import { gcd, lcm, linear, paren, poly, texFrac } from "../../../core/math";
import type { Unit } from "../../../core/types";
import { fracTex, lines, times, type Step } from "../../../core/working";

/** px + qy, as written in a system. */
const eqTex = (p: number, q: number) => poly([[p, "x"], [q, "y"]]);

/** Solves ax + by = e, cx + dy = f by eliminating y, then substitutes back. */
const eliminate = (a: number, b: number, e: number, c: number, d: number, f: number, x: number, y: number): Step[] => {
  const L = lcm(Math.abs(b), Math.abs(d)), m1 = L / Math.abs(b), m2 = L / Math.abs(d);
  const same = b * m1 === d * m2;
  const [A, B, E, C, D, F] = [a * m1, b * m1, e * m1, c * m2, d * m2, f * m2];
  const scaled = m1 === 1 && m2 === 1 ? [] : [
    step(
      `Make the $y$ terms the same size so they can cancel: multiply ${[m1 > 1 ? `the first equation by $${m1}$` : "", m2 > 1 ? `the second by $${m2}$` : ""].filter(Boolean).join(" and ")}.`,
      lines(r`${eqTex(A, B)} &= ${E}`, r`${eqTex(C, D)} &= ${F}`),
    ),
  ];
  const k = same ? A - C : A + C, rhs = same ? E - F : E + F;
  return [
    ...scaled,
    step(
      same ? "The $y$ terms match, so **subtract** the second equation from the first: $y$ disappears." : "The $y$ terms are opposites, so **add** the equations: $y$ disappears.",
      lines(r`${k === 1 ? "" : k === -1 ? "-" : k}x &= ${rhs}`, r`x &= ${x}`),
    ),
    step(`Put $x = ${x}$ back into the first equation and solve for $y$.`, lines(r`${times(a, x)} ${b < 0 ? "-" : "+"} ${Math.abs(b) === 1 ? "" : Math.abs(b)}y &= ${e}`, r`${b === 1 ? "" : b === -1 ? "-" : b}y &= ${e} - ${paren(a * x)} = ${e - a * x}`, r`y &= ${y}`)),
    step(`Check in the second equation: $${times(c, x)} ${d < 0 ? "-" : "+"} ${times(Math.abs(d), y)} = ${f}$ ✓. So the solution is`, `(x, y) = (${x}, ${y})`),
  ];
};

const r = String.raw;

export const linearUnit: Unit = {
  id: "linear",
  title: "Graphs & Linear Equations",
  icon: "TrendingUp",
  description: "The coordinate plane, slope, equations of lines and systems.",
  exercises: [
    {
      id: "coordinate-plane",
      title: "The Coordinate Plane",
      summary: "Locating points with $(x, y)$ pairs.",
      prerequisites: ["negative-numbers"],
      estimatedMinutes: 5,
      expectedSeconds: 25,
      keyIdeas: ["$(x, y)$: across first, then up/down.", "Four quadrants, numbered anticlockwise."],
      lesson: [
        text("Two perpendicular number lines — the $x$-axis (horizontal) and $y$-axis (vertical) — create a grid where every point has an **address** $(x, y)$."),
        visual({ type: "functionPlot", functions: [], points: [{ x: 3, y: 2, label: "(3, 2)", tone: "primary" }, { x: -4, y: 1, label: "(-4, 1)", tone: "accent" }, { x: -2, y: -3, label: "(-2, -3)", tone: "warning" }, { x: 2, y: -4, label: "(2, -4)", tone: "success" }], viewBox: { x: [-6, 6], y: [-5, 5] } }),
        key("Read $x$ first (left/right), then $y$ (up/down) — *along the corridor, then up the stairs*."),
        tip("Quadrant I: $(+,+)$, II: $(-,+)$, III: $(-,-)$, IV: $(+,-)$."),
      ],
      generate: (rng, level) => {
        const x = rng.nonZero(-6, 6), y = rng.nonZero(-5, 5);
        if (level === 1 || rng.chance(0.5))
          return {
            prompt: "What are the coordinates of the point? Enter as $(x, y)$.",
            visual: { type: "functionPlot", functions: [], points: [{ x, y, tone: "primary" }], viewBox: { x: [-7, 7], y: [-6, 6] } },
            answer: { kind: "tuple", values: [x, y] },
            inputHint: "e.g. (3, -2)",
            hints: ["Count across from the origin for x.", "Then count up or down for y."],
            solution: [
              step(`Start at the origin and read across first. The point is $${Math.abs(x)}$ to the ${x > 0 ? "right, so $x$ is positive" : "left, so $x$ is negative"}: $x = ${x}$.`),
              step(`Then read up or down. It's $${Math.abs(y)}$ ${y > 0 ? "up, so $y$ is positive" : "down, so $y$ is negative"}: $y = ${y}$.`),
              step("Write $x$ first, then $y$.", `(${x}, ${y})`),
            ],
          };
        const q = x > 0 ? (y > 0 ? "I" : "IV") : y > 0 ? "II" : "III";
        return {
          prompt: `In which quadrant is $(${x}, ${y})$?`,
          ...multipleChoice(rng, q, ["I", "II", "III", "IV"]),
          hints: ["Check the signs of x and y.", "Quadrants go anticlockwise from the top-right."],
          solution: [
            step(`$x = ${x}$ is ${x > 0 ? "positive (right of the $y$-axis)" : "negative (left of the $y$-axis)"}, and $y = ${y}$ is ${y > 0 ? "positive (above the $x$-axis)" : "negative (below the $x$-axis)"}.`),
            step("The quadrants are numbered anticlockwise from the top right: I is $(+, +)$, II is $(-, +)$, III is $(-, -)$, IV is $(+, -)$."),
            step(`Signs $(${x > 0 ? "+" : "-"}, ${y > 0 ? "+" : "-"})$ put it in quadrant ${q}.`),
          ],
        };
      },
    },
    {
      id: "slope",
      title: "Slope",
      summary: "Rise over run — how steep a line is.",
      prerequisites: ["coordinate-plane", "fraction-basics", "add-subtract-integers"],
      estimatedMinutes: 9,
      expectedSeconds: 45,
      keyIdeas: ["$m = \\frac{\\text{rise}}{\\text{run}} = \\frac{y_2 - y_1}{x_2 - x_1}$", "Positive slopes rise, negative slopes fall."],
      lesson: [
        text("The **slope** $m$ measures steepness: how much $y$ changes for each step of $1$ in $x$. Drag the points below and watch the slope triangle."),
        visual({ type: "slopeExplorer", a: [-2, -1], b: [3, 2] }),
        rule("Slope formula", r`m = \frac{\text{rise}}{\text{run}} = \frac{y_2 - y_1}{x_2 - x_1}`),
        example("Find the slope through $(1, 3)$ and $(4, -3)$.", [["Rise and run.", r`\frac{-3 - 3}{4 - 1} = \frac{-6}{3}`], ["Simplify.", r`m = -2`]]),
        tip("Horizontal lines have slope $0$. Vertical lines have **undefined** slope (run = 0)."),
      ],
      generate: (rng, level) => {
        const x1 = rng.int(-5, 3), y1 = rng.int(-5, 5);
        const run = rng.nonZero(level === 1 ? 1 : -5, 5), rise = rng.int(-6, 6);
        const x2 = x1 + run, y2 = y1 + rise;
        return {
          prompt: `Find the slope of the line through $(${x1}, ${y1})$ and $(${x2}, ${y2})$.`,
          visual: level < 3 ? { type: "functionPlot", functions: [{ fn: (x) => y1 + (rise / run) * (x - x1), dashed: true, tone: "muted" }], points: [{ x: x1, y: y1, label: `(${x1}, ${y1})` }, { x: x2, y: y2, label: `(${x2}, ${y2})`, tone: "accent" }], viewBox: { x: [-8, 8], y: [-8, 8] } } : undefined,
          answer: numberAnswer(rise / run),
          inputHint: "e.g. -2 or 3/4",
          hints: ["Subtract the y's, subtract the x's (same order!).", "Divide rise by run."],
          solution: [
            step("Slope is rise over run: the change in $y$ divided by the change in $x$, subtracting in the same order.", r`m = \frac{y_2 - y_1}{x_2 - x_1}`),
            step("Find the rise and the run.", lines(r`\text{rise} &= ${y2} - ${paren(y1)} = ${rise}`, r`\text{run} &= ${x2} - ${paren(x1)} = ${run}`)),
            step(
              rise === 0 ? "The rise is $0$: the line is flat, so its slope is $0$." : `Divide${gcd(rise, run) > 1 || run < 0 ? " and simplify" : ""}.`,
              r`m = \frac{${rise}}{${run}}${texFrac(rise, run) === r`\frac{${rise}}{${run}}` ? "" : ` = ${texFrac(rise, run)}`}`,
            ),
          ],
        };
      },
    },
    {
      id: "slope-intercept",
      title: "Slope-Intercept Form",
      summary: "$y = mx + b$: reading slope and intercept from an equation.",
      prerequisites: ["slope", "literal-equations"],
      estimatedMinutes: 9,
      expectedSeconds: 40,
      keyIdeas: ["$m$ is the slope, $b$ is where the line crosses the $y$-axis.", "Rearrange to $y = \\dots$ to read them."],
      lesson: [
        text("Every non-vertical line can be written $y = mx + b$. The **slope** is $m$ and the **$y$-intercept** is $b$ — the line passes through $(0, b)$. Play with the sliders:"),
        visual({ type: "lineExplorer", m: 0.5, b: 1 }),
        example("Find the slope and $y$-intercept of $6x + 2y = 8$.", [["Solve for $y$.", r`2y = -6x + 8`], ["Divide by 2.", r`y = -3x + 4`], "Slope $-3$, $y$-intercept $4$."]),
        key("To graph $y = mx + b$: plot $(0, b)$, then step **run 1, rise $m$** to find more points."),
      ],
      generate: (rng, level) => {
        const m = rng.nonZero(-5, 5), b = rng.int(-8, 8);
        if (level === 1) {
          const askSlope = rng.chance(0.5);
          return {
            prompt: `What is the ${askSlope ? "slope" : "$y$-intercept"} of $y = ${linear(m, b)}$?`,
            answer: numberAnswer(askSlope ? m : b),
            hints: ["Compare with $y = mx + b$."],
            solution: [
              step("In $y = mx + b$, the number multiplying $x$ is the slope $m$, and the number on its own is the $y$-intercept $b$."),
              step(`Matching $y = ${linear(m, b)}$ against it:`, r`m = ${m}, \quad b = ${b}`),
              step(`So the ${askSlope ? "slope" : "$y$-intercept"} is $${askSlope ? m : b}$.`),
            ],
          };
        }
        if (level === 2) {
          return {
            prompt: "Which equation matches this line?",
            visual: { type: "functionPlot", functions: [{ fn: (x) => m * x + b }], points: [{ x: 0, y: b, label: `(0, ${b})` }], viewBox: { x: [-8, 8], y: [-10, 10] } },
            ...multipleChoice(rng, `$y = ${linear(m, b)}$`, [`$y = ${linear(-m, b)}$`, `$y = ${linear(m, -b || 1)}$`, `$y = ${linear(b || 1, m)}$`]),
            hints: ["Where does the line cross the y-axis?", "From that point, how far up/down for one step right?"],
            solution: [
              step(`The line crosses the $y$-axis at $(0, ${b})$, so the intercept is $b = ${b}$.`),
              step(`From there, move $1$ to the right: the line ${m > 0 ? "rises" : "falls"} by $${Math.abs(m)}$ to $(1, ${m + b})$. So the slope is $m = ${m}$.`),
              step("Put them into $y = mx + b$.", `y = ${linear(m, b)}`),
            ],
          };
        }
        const A = rng.nonZero(-4, 4), B = rng.pick([2, 3, 4, -2]);
        const C = rng.int(-12, 12);
        return {
          prompt: `Find the slope of the line $${linear(A, 0)} + ${B}y = ${C}$.`.replace("+ -", "- "),
          answer: numberAnswer(-A / B),
          inputHint: "e.g. -3/2",
          hints: ["Solve for y.", "The coefficient of x is the slope."],
          solution: [
            step(`Get the $y$ term on its own: ${A > 0 ? "subtract" : "add"} $${linear(Math.abs(A), 0)}$ ${A > 0 ? "from" : "to"} both sides.`, `${B}y = ${linear(-A, C)}`),
            step(`Divide every term by $${B}$ to get $y$ on its own.`, r`y = ${fracTex(-A, B)}x${C === 0 ? "" : fracTex(C, B).startsWith("-") ? ` - ${fracTex(-C, B)}` : ` + ${fracTex(C, B)}`}`),
            step("Now it's in the form $y = mx + b$. The slope is the coefficient of $x$.", `m = ${texFrac(-A, B)}`),
          ],
        };
      },
    },
    {
      id: "line-equations",
      title: "Writing Equations of Lines",
      summary: "From a point and slope, or from two points.",
      prerequisites: ["slope-intercept"],
      estimatedMinutes: 10,
      expectedSeconds: 70,
      keyIdeas: ["Point-slope: $y - y_1 = m(x - x_1)$", "Parallel lines share a slope; perpendicular slopes multiply to $-1$."],
      lesson: [
        rule("Point-slope form", r`y - y_1 = m(x - x_1)`, "Use it whenever you know a slope and one point."),
        example("Find the line through $(2, 5)$ and $(4, 11)$.", [["Slope.", r`m = \frac{11 - 5}{4 - 2} = 3`], ["Point-slope with $(2, 5)$.", r`y - 5 = 3(x - 2)`], ["Simplify.", r`y = 3x - 1`]]),
        rule("Parallel & perpendicular", r`m_1 = m_2 \qquad\qquad m_1 \cdot m_2 = -1`),
        visual({ type: "functionPlot", functions: [{ fn: (x) => 0.5 * x + 1, label: "m = 1/2" }, { fn: (x) => 0.5 * x - 2, tone: "accent", label: "parallel" }, { fn: (x) => -2 * x + 1, tone: "warning", label: "perpendicular" }], viewBox: { x: [-6, 6], y: [-6, 6] } }),
      ],
      generate: (rng, level) => {
        const m = rng.nonZero(-4, 4), b = rng.int(-6, 6);
        const x1 = rng.int(-4, 4), x2 = x1 + rng.int(1, 4);
        if (level === 3) {
          const px = rng.int(-4, 4), py = rng.int(-5, 5);
          const mp = -1 / m;
          const bp = py - mp * px;
          return {
            prompt: `A line is perpendicular to $y = ${linear(m, b)}$ and passes through $(${px}, ${py})$. What is its $y$-intercept?`,
            answer: numberAnswer(bp),
            inputHint: "e.g. 7/2",
            hints: [`The perpendicular slope is $${texFrac(-1, m)}$.`, "Substitute the point into y = mx + b and solve for b."],
            solution: [
              step(`The given line has slope $${m}$. Perpendicular slopes multiply to $-1$, so flip it and change its sign.`, m === 1 || m === -1 || m < 0 ? r`m = -\frac{1}{${paren(m)}} = ${texFrac(-1, m)}` : r`m = -\frac{1}{${m}}`),
              step(`Put the point $(${px}, ${py})$ into $y = mx + b$.`, r`${py} = ${texFrac(-1, m)}\cdot${paren(px)} + b`),
              step(
                "Work out the product, then solve for $b$.",
                lines(r`${py} &= ${texFrac(-px, m)} + b`, r`b &= ${py} - ${-px / m < 0 ? r`\left(${texFrac(-px, m)}\right)` : texFrac(-px, m)} = ${texFrac(py * m + px, m)}`),
              ),
            ],
          };
        }
        return {
          prompt: `Find the equation $y = mx + b$ of the line through $(${x1}, ${m * x1 + b})$ and $(${x2}, ${m * x2 + b})$. Enter $m, b$.`,
          answer: { kind: "tuple", values: [m, b] },
          inputHint: "e.g. 3, -1",
          hints: ["Find the slope first.", "Substitute one point to find b."],
          solution: [
            step("Find the slope: rise over run between the two points.", r`m = \frac{${m * x2 + b} - ${paren(m * x1 + b)}}{${x2} - ${paren(x1)}} = \frac{${m * (x2 - x1)}}{${x2 - x1}} = ${m}`),
            step(`Put the first point $(${x1}, ${m * x1 + b})$ into $y = ${m === 1 ? "" : m === -1 ? "-" : m}x + b$ and solve for $b$.`, lines(r`${m * x1 + b} &= ${times(m, x1)} + b`, r`${m * x1 + b} &= ${m * x1} + b`, r`b &= ${m * x1 + b} - ${paren(m * x1)} = ${b}`)),
            step(`So $m = ${m}$ and $b = ${b}$: the line is $y = ${linear(m, b)}$.`),
          ],
        };
      },
    },
    {
      id: "systems-of-equations",
      title: "Systems of Linear Equations",
      summary: "Where two lines meet: substitution and elimination.",
      prerequisites: ["line-equations", "multi-step-equations"],
      estimatedMinutes: 12,
      expectedSeconds: 90,
      keyIdeas: ["The solution is the intersection point.", "Elimination: add equations to cancel a variable."],
      lesson: [
        text("A **system** is two equations that must both be true. Graphically, the solution is where the lines **intersect**. Adjust the lines below:"),
        visual({ type: "systemExplorer", lines: [{ m: 1, b: 1 }, { m: -0.5, b: 4 }] }),
        example("Solve $x + y = 10$ and $x - y = 4$ by elimination.", [["Add the equations — $y$ cancels.", r`2x = 14 \Rightarrow x = 7`], ["Substitute back.", r`7 + y = 10 \Rightarrow y = 3`], "Solution: $(7, 3)$."]),
        example("Solve $y = 2x - 1$ and $3x + y = 14$ by substitution.", [["Replace $y$.", r`3x + 2x - 1 = 14`], ["Solve.", r`5x = 15 \Rightarrow x = 3,\; y = 5`]]),
        key("Parallel lines never meet — **no solution**. Identical lines meet everywhere — **infinitely many**."),
      ],
      generate: (rng, level) => {
        const x = rng.int(-5, 6), y = rng.int(-5, 6);
        const a = rng.nonZero(-3, 4), b = rng.nonZero(-3, 4);
        let c = rng.nonZero(-3, 4), d = rng.nonZero(-3, 4);
        while (a * d - b * c === 0) d = rng.nonZero(-4, 4);
        const eq = (p: number, q: number) => `${linear(p, 0)} ${q < 0 ? "-" : "+"} ${Math.abs(q) === 1 ? "" : Math.abs(q)}y`;
        const sys = level === 1 ? r`\begin{cases} x + y = ${x + y} \\ x - y = ${x - y} \end{cases}` : r`\begin{cases} ${eq(a, b)} = ${a * x + b * y} \\ ${eq(c, d)} = ${c * x + d * y} \end{cases}`;
        return {
          prompt: "Solve the system. Enter $(x, y)$.",
          tex: sys,
          answer: { kind: "tuple", values: [x, y] },
          inputHint: "e.g. (7, 3)",
          hints: ["Multiply one equation so a variable has matching coefficients.", "Add or subtract to eliminate it, then back-substitute."],
          solution:
            level === 1
              ? [
                  step("Add the two equations. The $+y$ and $-y$ cancel, leaving only $x$.", lines(r`2x &= ${x + y} + ${paren(x - y)} = ${2 * x}`, r`x &= ${x}`)),
                  step(`Put $x = ${x}$ into $x + y = ${x + y}$.`, r`y = ${x + y} - ${paren(x)} = ${y}`),
                  step(`Check in the second equation: $${x} - ${paren(y)} = ${x - y}$ ✓. So the solution is`, `(x, y) = (${x}, ${y})`),
                ]
              : eliminate(a, b, a * x + b * y, c, d, c * x + d * y, x, y),
        };
      },
    },
  ],
};
