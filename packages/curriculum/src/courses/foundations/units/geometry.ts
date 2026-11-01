import { example, key, numberAnswer, rule, step, text, tip, visual, warn } from "../../../core/builders";
import { linear, paren, poly, round, simplifyRoot, texRoot } from "../../../core/math";
import type { Unit, Visual } from "../../../core/types";

const r = String.raw;

const triples: [number, number, number][] = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [6, 8, 10], [9, 12, 15], [20, 21, 29]];

export const geometry: Unit = {
  id: "geometry",
  title: "Geometry",
  icon: "Triangle",
  description: "Angles, triangles, Pythagoras, area, circles, volume and coordinate geometry.",
  exercises: [
    {
      id: "angles",
      title: "Angles",
      summary: "Measuring turns; angles on a line and around a point.",
      prerequisites: ["add-subtract"],
      estimatedMinutes: 7,
      expectedSeconds: 30,
      keyIdeas: ["Angles on a straight line sum to 180°.", "Angles around a point sum to 360°.", "Vertically opposite angles are equal."],
      lesson: [
        text("An **angle** measures a turn. A full turn is $360°$, a straight line $180°$, a right angle $90°$. Drag the slider to explore:"),
        visual({ type: "angleExplorer", angle: 130 }),
        rule("Angle facts", r`\text{line: } 180^\circ \qquad \text{point: } 360^\circ \qquad \text{vertically opposite: equal}`),
        tip("**Acute** < 90° < **obtuse** < 180° < **reflex** < 360°."),
      ],
      generate: (rng, level) => {
        const a = rng.int(15, 165);
        if (level === 1)
          return {
            prompt: `Two angles form a straight line. One is $${a}°$. Find the other.`,
            answer: numberAnswer(180 - a, { unit: "°" }),
            inputHint: "degrees",
            hints: ["Angles on a straight line add to 180°."],
            solution: [step("Subtract from 180°.", r`180^\circ - ${a}^\circ = ${180 - a}^\circ`)],
          };
        const b = rng.int(30, 120), c = rng.int(30, 360 - a - b - 10);
        return {
          prompt: `Angles of $${a}°$, $${b}°$, $${c}°$ and $x$ meet at a point. Find $x$.`,
          answer: numberAnswer(360 - a - b - c),
          inputHint: "degrees",
          hints: ["Angles around a point add to 360°."],
          solution: [step("Subtract the known angles from 360°.", r`360 - ${a} - ${b} - ${c} = ${360 - a - b - c}`)],
        };
      },
    },
    {
      id: "triangles",
      title: "Triangle Angles",
      summary: "Interior angles sum to 180°.",
      prerequisites: ["angles"],
      estimatedMinutes: 6,
      expectedSeconds: 35,
      keyIdeas: ["$A + B + C = 180°$", "Isosceles triangles have two equal base angles."],
      lesson: [
        text("Tear the corners off any paper triangle and line them up: they always form a straight line. The interior angles of a triangle sum to $180°$."),
        visual({ type: "triangleAngles", angles: [50, 60, 70] }),
        key("**Isosceles**: two equal sides and two equal angles. **Equilateral**: all sides equal, all angles $60°$."),
        example("An isosceles triangle has apex angle $40°$. Find each base angle.", [["The two base angles share what's left.", r`180 - 40 = 140`], ["Split equally.", r`140 \div 2 = 70^\circ`]]),
      ],
      generate: (rng, level) => {
        const A = rng.int(20, 100), B = rng.int(20, 160 - A - 10), C = 180 - A - B;
        if (level === 3) {
          const apex = rng.int(10, 80) * 2;
          return {
            prompt: `An isosceles triangle has an apex angle of $${apex}°$. Find one base angle.`,
            answer: numberAnswer((180 - apex) / 2),
            inputHint: "degrees",
            hints: ["The two base angles are equal.", "They share 180° minus the apex."],
            solution: [step("Split the remainder.", r`\frac{180 - ${apex}}{2} = ${(180 - apex) / 2}^\circ`)],
          };
        }
        return {
          prompt: "Find the missing angle.",
          visual: { type: "triangleAngles", angles: [A, B, C], hidden: 2 },
          answer: numberAnswer(C),
          inputHint: "degrees",
          hints: ["Angles in a triangle add to 180°."],
          solution: [step("Subtract the known angles.", r`180 - ${A} - ${B} = ${C}^\circ`)],
        };
      },
    },
    {
      id: "pythagorean-theorem",
      title: "Pythagorean Theorem",
      summary: "$a^2 + b^2 = c^2$ in right triangles.",
      prerequisites: ["square-roots", "triangles"],
      estimatedMinutes: 10,
      expectedSeconds: 50,
      keyIdeas: ["$a^2 + b^2 = c^2$, where $c$ is the hypotenuse.", "To find a leg, subtract: $a^2 = c^2 - b^2$."],
      lesson: [
        text("In a right triangle, the squares on the two shorter sides together have exactly the same area as the square on the longest side (the **hypotenuse**). Change the legs and watch the areas:"),
        visual({ type: "rightTriangle", a: 3, b: 4, showSquares: true }),
        rule("Pythagorean theorem", r`a^2 + b^2 = c^2`),
        example("A ladder 13 m long reaches 12 m up a wall. How far is its foot from the wall?", [["The ladder is the hypotenuse.", r`a^2 + 12^2 = 13^2`], ["Solve.", r`a^2 = 169 - 144 = 25 \Rightarrow a = 5\text{ m}`]]),
        warn("The hypotenuse is always opposite the right angle and always the **longest** side."),
      ],
      generate: (rng, level) => {
        const [a, b, c] = rng.pick(triples);
        if (level === 3) {
          const x = rng.int(2, 9), y = rng.int(2, 9);
          const [o, i] = simplifyRoot(x * x + y * y);
          return {
            prompt: `The legs of a right triangle are $${x}$ and $${y}$. Find the hypotenuse to 2 d.p.`,
            answer: numberAnswer(round(Math.sqrt(x * x + y * y), 2), { tolerance: 0.003 }),
            visual: { type: "rightTriangle", a: x, b: y, labels: { a: `${x}`, b: `${y}`, c: "c" } },
            hints: ["c² = a² + b²", "Take the square root at the end."],
            solution: [step("Apply Pythagoras.", r`c = \sqrt{${x * x} + ${y * y}} = ${texRoot(o, i)} \approx ${round(Math.sqrt(x * x + y * y), 2)}`)],
          };
        }
        const findHyp = level === 1 || rng.chance(0.5);
        return findHyp
          ? {
              prompt: "Find the hypotenuse $c$.",
              visual: { type: "rightTriangle", a, b, labels: { a: `${a}`, b: `${b}`, c: "c" } },
              answer: numberAnswer(c),
              hints: ["Square both legs and add them.", "Take the square root."],
              solution: [step("Pythagoras.", r`c = \sqrt{${a}^2 + ${b}^2} = \sqrt{${a * a + b * b}} = ${c}`)],
            }
          : {
              prompt: "Find the missing leg $a$.",
              visual: { type: "rightTriangle", a, b, labels: { a: "a", b: `${b}`, c: `${c}` } },
              answer: numberAnswer(a),
              hints: ["The hypotenuse is the longest side.", "a² = c² − b²"],
              solution: [step("Rearrange.", r`a = \sqrt{${c}^2 - ${b}^2} = \sqrt{${c * c - b * b}} = ${a}`)],
            };
      },
    },
    {
      id: "area-perimeter",
      title: "Area & Perimeter",
      summary: "Rectangles, triangles, parallelograms and trapezoids.",
      prerequisites: ["multiplication", "fraction-basics"],
      estimatedMinutes: 8,
      expectedSeconds: 40,
      keyIdeas: ["Perimeter: distance around. Area: space inside.", "Triangle = half a rectangle: $\\frac12 bh$."],
      lesson: [
        text("**Perimeter** is the distance around a shape (units). **Area** is the surface it covers (square units)."),
        visual({ type: "arrayGrid", rows: 4, cols: 7 }, "A 4 × 7 rectangle: area 28, perimeter 22."),
        rule("Area formulas", r`\text{rectangle } bh \quad \text{triangle } \tfrac12 bh \quad \text{parallelogram } bh \quad \text{trapezoid } \tfrac12(a + b)h`),
        tip("The height is always measured **perpendicular** to the base, not along a slanted side."),
      ],
      generate: (rng, level) => {
        const b = rng.int(3, 15), h = rng.int(2, 12);
        const shapes: [string, number, string][] = [
          [`a rectangle ${b} by ${h}. Find its **area**.`, b * h, r`${b}\times${h}`],
          [`a rectangle ${b} by ${h}. Find its **perimeter**.`, 2 * (b + h), r`2(${b} + ${h})`],
          [`a triangle with base ${b} and height ${h}. Find its **area**.`, (b * h) / 2, r`\tfrac12\times${b}\times${h}`],
        ];
        if (level >= 2) {
          const a2 = rng.int(2, 10);
          shapes.push([`a trapezoid with parallel sides ${a2} and ${b}, height ${h}. Find its **area**.`, ((a2 + b) * h) / 2, r`\tfrac12(${a2} + ${b})\times${h}`]);
        }
        const [desc, ans, work] = rng.pick(shapes);
        return {
          prompt: `Consider ${desc}`,
          answer: numberAnswer(ans),
          hints: ["Pick the right formula.", "Check: are you measuring around (perimeter) or inside (area)?"],
          solution: [step("Apply the formula.", `${work} = ${ans}`)],
        };
      },
    },
    {
      id: "circles",
      title: "Circles",
      summary: "Circumference, area, and the number $\\pi$.",
      prerequisites: ["area-perimeter", "exponent-basics"],
      estimatedMinutes: 8,
      expectedSeconds: 45,
      keyIdeas: ["$C = 2\\pi r$", "$A = \\pi r^2$"],
      lesson: [
        text("For every circle, circumference ÷ diameter is the same number: $\\pi \\approx 3.14159$. Drag the radius:"),
        visual({ type: "circleExplorer", r: 2 }),
        rule("Circle formulas", r`C = 2\pi r = \pi d \qquad A = \pi r^2`),
        warn("Area uses the **radius**. If you're given a diameter, halve it first."),
      ],
      generate: (rng, level) => {
        const rad = rng.int(1, 12);
        const useDiam = level >= 2 && rng.chance(0.5);
        const askArea = rng.chance(0.5);
        const ans = askArea ? Math.PI * rad * rad : 2 * Math.PI * rad;
        return {
          prompt: `A circle has ${useDiam ? `diameter $${2 * rad}$` : `radius $${rad}$`}. Find its ${askArea ? "area" : "circumference"} to 2 d.p. (or in terms of π, e.g. ${askArea ? rad * rad : 2 * rad}pi).`,
          answer: numberAnswer(ans, { tolerance: 0.0006 }),
          inputHint: "e.g. 12.57 or 4pi",
          hints: [useDiam ? `The radius is ${rad}.` : "Use the radius directly.", askArea ? "A = πr²" : "C = 2πr"],
          solution: [step("Apply the formula.", askArea ? r`\pi\cdot${rad}^2 = ${rad * rad}\pi \approx ${round(ans, 2)}` : r`2\pi\cdot${rad} = ${2 * rad}\pi \approx ${round(ans, 2)}`)],
        };
      },
    },
    {
      id: "volume",
      title: "Volume & Surface Area",
      summary: "Prisms, cylinders, cones and spheres.",
      prerequisites: ["circles"],
      estimatedMinutes: 9,
      expectedSeconds: 55,
      keyIdeas: ["Prism/cylinder: base area × height.", "Cone/pyramid: one third of that."],
      lesson: [
        text("The volume of any **prism** or **cylinder** is its cross-sectional area times its length. Pointed shapes (cones, pyramids) hold exactly **one third** as much."),
        rule("Volumes", r`\text{box } lwh \qquad \text{cylinder } \pi r^2 h \qquad \text{cone } \tfrac13\pi r^2 h \qquad \text{sphere } \tfrac43\pi r^3`),
        example("Find the volume of a cylinder with radius 3 and height 10.", [["Base area.", r`\pi\cdot3^2 = 9\pi`], ["Times height.", r`90\pi \approx 282.74`]]),
      ],
      generate: (rng, level) => {
        const l = rng.int(2, 10), w = rng.int(2, 10), h = rng.int(2, 12), rad = rng.int(1, 6);
        const shapes: [string, number, string][] = [[`a box ${l} × ${w} × ${h}`, l * w * h, r`${l}\cdot${w}\cdot${h}`]];
        if (level >= 2) shapes.push([`a cylinder with radius ${rad} and height ${h}`, Math.PI * rad * rad * h, r`\pi\cdot${rad}^2\cdot${h} = ${rad * rad * h}\pi`]);
        if (level === 3) shapes.push([`a cone with radius ${rad} and height ${h}`, (Math.PI * rad * rad * h) / 3, r`\tfrac13\pi\cdot${rad}^2\cdot${h}`], [`a sphere with radius ${rad}`, (4 / 3) * Math.PI * rad ** 3, r`\tfrac43\pi\cdot${rad}^3`]);
        const [desc, ans, work] = rng.pick(shapes);
        return {
          prompt: `Find the volume of ${desc} (2 d.p. if needed).`,
          answer: numberAnswer(ans, { tolerance: 0.0006 }),
          inputHint: "e.g. 282.74 or 90pi",
          hints: ["Find the area of the base, then multiply by the height.", "Cones and pyramids: divide by 3."],
          solution: [step("Apply the formula.", `${work} \\approx ${round(ans, 2)}`)],
        };
      },
    },
    {
      id: "distance-midpoint",
      title: "Distance & Midpoint",
      summary: "Pythagoras on the coordinate plane.",
      prerequisites: ["pythagorean-theorem", "coordinate-plane"],
      estimatedMinutes: 8,
      expectedSeconds: 50,
      keyIdeas: ["$d = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}$", "Midpoint: average the coordinates."],
      lesson: [
        text("The horizontal and vertical gaps between two points form the legs of a right triangle. Pythagoras gives the straight-line distance."),
        rule("Distance formula", r`d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}`),
        rule("Midpoint", r`M = \left(\frac{x_1 + x_2}{2},\; \frac{y_1 + y_2}{2}\right)`),
        visual({ type: "functionPlot", functions: [{ fn: (x) => (x >= -2 && x <= 4 ? -2 + ((x + 2) * 8) / 6 : NaN), tone: "primary" }], points: [{ x: -2, y: -2, label: "(-2, -2)" }, { x: 4, y: 6, label: "(4, 6)" }, { x: 1, y: 2, label: "M(1, 2)", tone: "accent" }], viewBox: { x: [-5, 7], y: [-4, 8] } }, "Gaps 6 and 8, so $d = 10$."),
      ],
      generate: (rng, level) => {
        const [a, b] = rng.pick(triples);
        const x1 = rng.int(-6, 4), y1 = rng.int(-6, 4);
        const sx = rng.sign(), sy = rng.sign();
        const x2 = x1 + sx * a, y2 = y1 + sy * b;
        if (level === 1 || rng.chance(0.4))
          return {
            prompt: `Find the midpoint of $(${x1}, ${y1})$ and $(${x2}, ${y2})$. Enter $(x, y)$.`,
            answer: { kind: "tuple", values: [(x1 + x2) / 2, (y1 + y2) / 2] },
            inputHint: "e.g. (1, 2.5)",
            hints: ["Average the x's, then average the y's."],
            solution: [step("Average.", r`\left(${(x1 + x2) / 2},\ ${(y1 + y2) / 2}\right)`)],
          };
        return {
          prompt: `Find the distance between $(${x1}, ${y1})$ and $(${x2}, ${y2})$.`,
          answer: numberAnswer(Math.hypot(a, b)),
          hints: [`Horizontal gap: ${a}. Vertical gap: ${b}.`, "Use Pythagoras."],
          solution: [step("Distance formula.", r`\sqrt{${a}^2 + ${b}^2} = ${Math.hypot(a, b)}`)],
        };
      },
    },
    {
      id: "circle-equations",
      title: "Equations of Circles",
      summary: "$(x - h)^2 + (y - k)^2 = r^2$, straight from the distance formula.",
      prerequisites: ["distance-midpoint", "completing-the-square"],
      estimatedMinutes: 10,
      expectedSeconds: 60,
      keyIdeas: [
        "A circle is every point at distance $r$ from its centre $(h, k)$.",
        "$(x - h)^2 + (y - k)^2 = r^2$. Watch the signs: $(x + 3)^2$ means $h = -3$.",
        "Given the expanded form, complete the square in $x$ and in $y$.",
      ],
      lesson: [
        text("Every point on a circle is the same distance $r$ from its centre $(h, k)$. Write that with the distance formula, square both sides, and you have the circle's equation."),
        rule("Circle", r`(x - h)^2 + (y - k)^2 = r^2`),
        visual(
          { type: "functionPlot", functions: [], circles: [{ x: 2, y: 1, r: 3 }], points: [{ x: 2, y: 1, label: "(2, 1)" }], viewBox: { x: [-3, 7], y: [-4, 5] }, equalAspect: true },
          "$(x - 2)^2 + (y - 1)^2 = 9$ has centre $(2, 1)$ and radius 3.",
        ),
        warn("$(x + 3)^2 + (y - 5)^2 = 16$ has centre $(-3, 5)$ and radius $4$, not 16."),
        example("Find the centre and radius of $x^2 + y^2 - 6x + 4y - 3 = 0$.", [
          ["Group the $x$ and $y$ terms and complete each square.", r`(x^2 - 6x + 9) + (y^2 + 4y + 4) = 3 + 9 + 4`],
          ["Factor.", r`(x - 3)^2 + (y + 2)^2 = 16`],
          ["Read off the centre and radius.", r`\text{centre } (3, -2), \quad r = 4`],
        ]),
        key("In calculus you'll find the slope of a circle at any point using **implicit differentiation**, starting from exactly this equation."),
      ],
      generate: (rng, level) => {
        const h = rng.int(-6, 6), k = rng.int(-6, 6), rad = rng.int(1, 9);
        const sq = (v: string, c: number) => (c === 0 ? `${v}^2` : `(${linear(1, -c, v)})^2`);
        const solutionVisual: Visual = {
          type: "functionPlot",
          functions: [],
          circles: [{ x: h, y: k, r: rad }],
          points: [{ x: h, y: k, label: `(${h}, ${k})` }],
          viewBox: { x: [h - rad - 2, h + rad + 2], y: [k - rad - 2, k + rad + 2] },
          equalAspect: true,
        };
        if (level === 1) {
          const eq = `${sq("x", h)} + ${sq("y", k)} = ${rad * rad}`;
          return rng.chance(0.5)
            ? {
                prompt: "What is the radius of this circle?",
                tex: eq,
                answer: numberAnswer(rad),
                hints: ["The right-hand side is r², not r."],
                solution: [step("Take the square root.", r`r = \sqrt{${rad * rad}} = ${rad}`)],
                solutionVisual,
              }
            : {
                prompt: "What is the centre of this circle? Enter it as $(h, k)$.",
                tex: eq,
                answer: { kind: "tuple", values: [h, k] },
                inputHint: "e.g. (2, -3)",
                hints: ["Compare with (x − h)² + (y − k)² = r².", "The signs inside the brackets are opposite to the coordinates."],
                solution: [step("Read h and k with the opposite signs.", `(${h}, ${k})`)],
                solutionVisual,
              };
        }
        if (level === 2) {
          const [dx, dy] = rng.pick([[3, 4], [4, 3], [0, 5], [5, 0], [6, 8], [5, 12], [1, 1], [2, 1], [1, 3]] as [number, number][]);
          const sx = rng.sign(), sy = rng.sign();
          const px = h + sx * dx, py = k + sy * dy, r2 = dx * dx + dy * dy;
          return {
            prompt: `A circle has centre $(${h}, ${k})$ and passes through $(${px}, ${py})$. Its equation is $${sq("x", h)} + ${sq("y", k)} = c$. Find $c$.`,
            answer: numberAnswer(r2),
            hints: ["c is r², the squared distance from the centre to the point.", "Use (x₂ − x₁)² + (y₂ − y₁)²."],
            solution: [step("Squared distance from the centre to the point.", r`(${px} - ${paren(h)})^2 + (${py} - ${paren(k)})^2 = ${dx * dx} + ${dy * dy} = ${r2}`)],
          };
        }
        const D = -2 * h, E = -2 * k, F = h * h + k * k - rad * rad;
        const expanded = `${poly([[1, "x^2"], [1, "y^2"], [D, "x"], [E, "y"], [F, ""]])} = 0`;
        const centre = rng.chance(0.5);
        return {
          prompt: centre ? "Find the centre of this circle. Enter it as $(h, k)$." : "Find the radius of this circle.",
          tex: expanded,
          answer: centre ? { kind: "tuple", values: [h, k] } : numberAnswer(rad),
          inputHint: centre ? "e.g. (2, -3)" : undefined,
          hints: ["Complete the square in x, then in y.", "Add the same amounts to both sides."],
          solution: [
            step("Complete both squares.", `${sq("x", h)} + ${sq("y", k)} = ${-F} + ${h * h} + ${k * k}`),
            step("Read off the circle.", r`(${h}, ${k}),\quad r^2 = ${rad * rad},\quad r = ${rad}`),
          ],
          solutionVisual,
        };
      },
    },
  ],
};
