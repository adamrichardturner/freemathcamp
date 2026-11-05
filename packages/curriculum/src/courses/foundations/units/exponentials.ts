import { decimalAnswer, example, key, numberAnswer, rule, step, text, tip, visual, warn } from "../../../core/builders";
import { num, round } from "../../../core/math";
import type { Unit } from "../../../core/types";
import { type Step } from "../../../core/working";

const r = String.raw;

export const exponentials: Unit = {
  id: "exponentials",
  title: "Exponentials & Logarithms",
  icon: "Rocket",
  description: "Growth and decay, logarithms as inverse exponents, and solving exponential equations.",
  exercises: [
    {
      id: "exponential-functions",
      title: "Exponential Growth & Decay",
      summary: "Quantities that multiply by a constant factor.",
      prerequisites: ["percent-change", "zero-negative-exponents", "function-notation"],
      estimatedMinutes: 10,
      expectedSeconds: 55,
      keyIdeas: ["$y = a\\cdot b^x$: start at $a$, multiply by $b$ each step.", "$b > 1$ grows, $0 < b < 1$ decays."],
      lesson: [
        text("Linear functions **add** the same amount each step. Exponential functions **multiply** by the same factor. That difference becomes enormous: doubling 30 times turns 1 into over a billion."),
        rule("Exponential function", r`f(x) = a \cdot b^{x}`, "$a$ = initial value, $b$ = growth factor"),
        visual({ type: "exponentialExplorer", base: 2 }),
        example("A population of 500 grows 8% per year. What is it after 3 years?", [["Growth factor $b = 1.08$.", r`P = 500\cdot1.08^3`], ["Evaluate.", r`P \approx 629.86`]]),
        tip("Growth by $r\\%$ → factor $1 + \\frac{r}{100}$. Decay by $r\\%$ → factor $1 - \\frac{r}{100}$."),
      ],
      generate: (rng, level) => {
        const a = rng.int(2, 20) * 50, p = rng.pick([2, 3, 5, 8, 10, 12, 15, 20]), t = rng.int(2, level === 1 ? 3 : 8);
        const grow = rng.chance(0.6);
        if (level === 1) {
          const b = rng.int(2, 3);
          return {
            prompt: `If $f(x) = ${a / 50}\\cdot${b}^x$, find $f(${t})$.`,
            answer: numberAnswer((a / 50) * b ** t),
            hints: [`Compute ${b}^${t} first.`],
            solution: [
              step(`Substitute $x = ${t}$.`, r`f(${t}) = ${a / 50}\cdot${b}^{${t}}`),
              step(`The power comes before the multiplication: $${b}^{${t}} = ${Array(t).fill(b).join("\\times")} = ${b ** t}$.`, r`f(${t}) = ${a / 50}\cdot${b ** t}`),
              step("Multiply.", r`f(${t}) = ${(a / 50) * b ** t}`),
            ],
          };
        }
        const factor = 1 + (grow ? p : -p) / 100;
        const val = round(a * factor ** t, 2);
        return {
          prompt: `A quantity starts at $${a}$ and ${grow ? "grows" : "decays"} by $${p}\\%$ per year. What is it after $${t}$ years? (2 d.p.)`,
          answer: numberAnswer(val, { tolerance: 0.0005 }),
          hints: [`The factor is ${factor}.`, `Compute ${a} × ${factor}^${t}.`],
          solution: [
            step(
              `${grow ? "Growing" : "Shrinking"} by $${p}\\%$ leaves $${grow ? 100 + p : 100 - p}\\%$ of the amount each year, so each year multiplies it by $${factor}$.`,
              r`1 ${grow ? "+" : "-"} \frac{${p}}{100} = ${factor}`,
            ),
            step(`After $${t}$ years you've multiplied by $${factor}$ a total of $${t}$ times.`, r`${a}\cdot${factor}^{${t}}`),
            step("Work out the power first.", r`${factor}^{${t}} \approx ${round(factor ** t, 6)}`),
            step("Multiply by the starting amount and round to 2 decimal places.", r`${a}\times${round(factor ** t, 6)} \approx ${val}`),
          ],
        };
      },
    },
    {
      id: "logarithms",
      title: "Logarithms",
      summary: "The exponent you need: $\\log_b x$.",
      prerequisites: ["exponential-functions", "inverse-functions"],
      estimatedMinutes: 10,
      expectedSeconds: 40,
      keyIdeas: ["$\\log_b x = y \\iff b^y = x$", "Logarithms undo exponentials."],
      lesson: [
        text("$\\log_2 8$ asks: **2 to what power gives 8?** Since $2^3 = 8$, $\\log_2 8 = 3$. A logarithm *is* an exponent."),
        rule("Definition", r`\log_b x = y \iff b^{y} = x`),
        visual({ type: "functionPlot", functions: [{ fn: (x) => 2 ** x, label: "y = 2ˣ" }, { fn: (x) => (x > 0 ? Math.log2(x) : NaN), tone: "accent", label: "y = log₂x" }, { fn: (x) => x, tone: "muted", dashed: true }], viewBox: { x: [-4, 8], y: [-4, 8] } }, "Inverse functions: reflections in $y = x$."),
        key("$\\log_b 1 = 0$, $\\log_b b = 1$. $\\log x$ usually means $\\log_{10}$, and $\\ln x$ means $\\log_e$."),
        warn("You can't take the log of zero or a negative number."),
      ],
      generate: (rng, level) => {
        const b = rng.pick(level === 1 ? [2, 10] : [2, 3, 4, 5, 10]);
        const y = rng.int(level === 3 ? -3 : 0, b === 10 ? 4 : 5);
        const x = b ** y;
        const xTex = y < 0 ? `\\frac{1}{${b ** -y}}` : `${x}`;
        return {
          prompt: "Evaluate.",
          tex: r`\log_{${b}} ${xTex}`,
          answer: numberAnswer(y),
          hints: [`Ask: ${b} to what power gives ${y < 0 ? `1/${b ** -y}` : x}?`, y < 0 ? "Negative exponents give reciprocals." : "Count the factors."],
          solution: [
            step(`$\\log_{${b}} ${xTex}$ asks: $${b}$ to what power gives $${xTex}$?`, r`${b}^{\,?} = ${xTex}`),
            y === 0
              ? step("Any number to the power $0$ is $1$.", r`${b}^{0} = 1`)
              : y > 0
                ? step(`Count up the powers of $${b}$.`, Array.from({ length: y }, (_, i) => r`${b}^{${i + 1}} = ${b ** (i + 1)}`).join(",\\quad "))
                : step(`A fraction $1$ over a power means a negative exponent: $${b ** -y} = ${b}^{${-y}}$, so $\\frac{1}{${b ** -y}} = ${b}^{${y}}$.`, r`${b}^{${y}} = ${xTex}`),
            step(`So the power is $${y}$.`, r`\log_{${b}} ${xTex} = ${y}`),
          ],
        };
      },
    },
    {
      id: "log-laws",
      title: "Laws of Logarithms",
      summary: "Products become sums; powers become multipliers.",
      prerequisites: ["logarithms", "exponent-rules"],
      estimatedMinutes: 10,
      expectedSeconds: 55,
      keyIdeas: ["$\\log(ab) = \\log a + \\log b$", "$\\log(a^n) = n\\log a$"],
      lesson: [
        text("Each log law is an exponent law in disguise. Multiplying powers adds exponents, so logs of products add."),
        rule("Product", r`\log_b(MN) = \log_b M + \log_b N`),
        rule("Quotient", r`\log_b\!\left(\frac{M}{N}\right) = \log_b M - \log_b N`),
        rule("Power", r`\log_b(M^k) = k\log_b M`),
        example("Simplify $\\log_2 40 - \\log_2 5$.", [["Quotient law.", r`\log_2 \frac{40}{5} = \log_2 8`], ["Evaluate.", r`= 3`]]),
        warn("$\\log(a + b) \\neq \\log a + \\log b$."),
      ],
      generate: (rng, level) => {
        const b = rng.pick([2, 3, 10]);
        const n = rng.int(1, b === 10 ? 3 : 4);
        const m = rng.int(2, 6);
        const target = b ** n;
        const log = (x: string | number) => r`\log_{${b}} ${x}`;
        const evalPower = (k: number) => step(`$${b ** k} = ${b}^{${k}}$, so its log base $${b}$ is $${k}$.`, `${log(b ** k)} = ${k}`);
        const forms: [string, number, Step[]][] = [
          [`${log(target * m)} - ${log(m)}`, n, [
            step("Quotient law: a difference of logs is the log of a division.", `${log(target * m)} - ${log(m)} = ${log(r`\frac{${target * m}}{${m}}`)} = ${log(target)}`),
            evalPower(n),
          ]],
          [`${log(b)} + ${log(b ** (n - 1))}`, n, [
            step("Product law: a sum of logs is the log of a product.", `${log(b)} + ${log(b ** (n - 1))} = ${log(r`(${b}\times${b ** (n - 1)})`)} = ${log(target)}`),
            evalPower(n),
          ]],
        ];
        if (level >= 2)
          forms.push(
            [r`${m}\log_{${b}} ${b ** n}`, m * n, [evalPower(n), step(`Multiply by $${m}$.`, r`${m}\times${n} = ${m * n}`)]],
            [r`\log_{${b}} ${b}^{${m}} + \log_{${b}} 1`, m, [
              step(`Power law: bring the exponent down in front. $\\log_{${b}} ${b} = 1$, because $${b}^1 = ${b}$.`, r`\log_{${b}} ${b}^{${m}} = ${m}\log_{${b}} ${b} = ${m}`),
              step(`$\\log_{${b}} 1 = 0$, because $${b}^0 = 1$.`, r`${m} + 0 = ${m}`),
            ]],
          );
        if (level === 3)
          forms.push([r`\tfrac{1}{2}\log_{${b}} ${b ** (2 * n)} + \log_{${b}} ${b * m} - \log_{${b}} ${m}`, n + 1, [
            step(`Power law on the first term: $${b ** (2 * n)} = ${b}^{${2 * n}}$, and half of $${2 * n}$ is $${n}$.`, r`\tfrac{1}{2}\log_{${b}} ${b}^{${2 * n}} = \tfrac{1}{2}\times${2 * n} = ${n}`),
            step("Quotient law on the last two terms.", r`\log_{${b}} ${b * m} - \log_{${b}} ${m} = \log_{${b}} \frac{${b * m}}{${m}} = \log_{${b}} ${b} = 1`),
            step("Add.", `${n} + 1 = ${n + 1}`),
          ]]);
        const [tex, ans, work] = rng.pick(forms);
        return {
          prompt: "Simplify to a single number.",
          tex,
          answer: numberAnswer(ans),
          hints: ["Combine using the product/quotient laws.", "Then evaluate the single log."],
          solution: work,
        };
      },
    },
    {
      id: "natural-log",
      title: "The Number e & Natural Logarithms",
      summary: "The base calculus prefers: $e \\approx 2.718$ and $\\ln x$.",
      prerequisites: ["log-laws", "exponential-functions"],
      estimatedMinutes: 10,
      expectedSeconds: 55,
      keyIdeas: [
        "$e = \\lim_{n\\to\\infty}\\left(1 + \\frac1n\\right)^n \\approx 2.71828$",
        "$\\ln x = \\log_e x$, so $\\ln e = 1$, $\\ln 1 = 0$ and $e^{\\ln x} = x$.",
        "Solve $e^{kx} = c$ by taking $\\ln$ of both sides: $x = \\frac{\\ln c}{k}$.",
      ],
      lesson: [
        text("Put 1 dollar in an account paying 100% interest a year. Compounded once, you'd have 2 dollars. Compounded monthly, $(1 + \\frac{1}{12})^{12} \\approx 2.613$. Daily, about $2.7146$. However often the interest is added, the total creeps up towards one number: $e \\approx 2.71828$."),
        rule("Euler's number", r`e = \lim_{n\to\infty}\left(1 + \frac{1}{n}\right)^n \approx 2.71828`),
        visual({ type: "exponentialExplorer", base: 2.718 }, "$y = e^x$. Its slope at every point equals its height, which is why calculus prefers base $e$."),
        rule("Natural logarithm", r`\ln x = \log_e x \qquad \ln e = 1, \quad \ln 1 = 0, \quad e^{\ln x} = x, \quad \ln(e^x) = x`),
        rule("Continuous growth", r`A = Pe^{rt}`, "$P$ is the starting amount, $r$ the continuous growth rate and $t$ the time."),
        example("Solve $e^{2x} = 10$.", [["Take $\\ln$ of both sides.", r`2x = \ln 10`], ["Divide by 2.", r`x = \frac{\ln 10}{2} \approx 1.151`]]),
        tip("Every log law works for $\\ln$ too: $\\ln(ab) = \\ln a + \\ln b$ and $\\ln(a^n) = n\\ln a$. You can type exact answers like `ln(5)/2` in the answer box."),
      ],
      generate: (rng, level) => {
        if (level === 1) {
          const k = rng.int(2, 9), kind = rng.int(0, 2);
          if (kind === 0)
            return {
              prompt: "Evaluate.",
              tex: r`\ln\left(e^{${k}}\right)`,
              answer: numberAnswer(k),
              hints: ["ln and e to the power undo each other."],
              solution: [
                step(`$\\ln$ asks: $e$ to what power gives this? Here the number is already written as $e^{${k}}$.`),
                step("So $\\ln$ and $e^{\\,\\cdot}$ undo each other.", r`\ln\left(e^{${k}}\right) = ${k}`),
              ],
            };
          if (kind === 1)
            return {
              prompt: "Evaluate.",
              tex: r`e^{\ln ${k}}`,
              answer: numberAnswer(k),
              hints: ["e to the power and ln undo each other."],
              solution: [
                step(`$\\ln ${k}$ is the power you raise $e$ to in order to get $${k}$.`),
                step(`So raising $e$ to that power gives back $${k}$: the two undo each other.`, r`e^{\ln ${k}} = ${k}`),
              ],
            };
          return {
            prompt: "Solve for $x$. Give an exact answer such as ln(5), or a decimal to 2 places.",
            tex: r`e^x = ${k}`,
            answer: decimalAnswer(Math.log(k)),
            inputHint: "e.g. ln(5)",
            hints: ["Take ln of both sides."],
            solution: [
              step("Take $\\ln$ of both sides. Since $\\ln(e^x) = x$, that frees the $x$.", r`\ln\left(e^{x}\right) = \ln ${k}`),
              step("So the exact answer is $\\ln$ of the right side.", r`x = \ln ${k} \approx ${round(Math.log(k), 3)}`),
            ],
          };
        }
        if (level === 2) {
          if (rng.chance(0.5)) {
            const k = rng.int(2, 5), c = rng.pick([2, 3, 5, 7, 10, 12, 20]);
            return {
              prompt: "Solve for $x$. Give an exact answer or a decimal to 2 places.",
              tex: r`e^{${k}x} = ${c}`,
              answer: decimalAnswer(Math.log(c) / k),
              inputHint: "e.g. ln(7)/3",
              hints: ["Take ln of both sides.", `Then divide by ${k}.`],
              solution: [
                step("Take $\\ln$ of both sides. $\\ln$ undoes $e$ to a power, leaving the exponent.", r`${k}x = \ln ${c}`),
                step(`Divide by $${k}$.`, r`x = \frac{\ln ${c}}{${k}} \approx \frac{${round(Math.log(c), 4)}}{${k}} \approx ${round(Math.log(c) / k, 3)}`),
              ],
            };
          }
          const P = rng.pick([100, 250, 500, 1000, 2000]), rate = rng.int(2, 8), t = rng.int(2, 20);
          const A = P * Math.exp((rate / 100) * t);
          return {
            prompt: `$${P}$ dollars grows continuously at $${rate}\\%$ a year. How much is there after $${t}$ years? Give your answer to 2 decimal places.`,
            answer: decimalAnswer(A),
            hints: ["Use A = Pe^(rt), with r as a decimal.", `r = ${rate / 100}`],
            solution: [
              step(`Continuous growth uses $A = Pe^{rt}$, with $P = ${P}$, the rate as a decimal $r = ${rate / 100}$, and $t = ${t}$.`, r`A = ${P}e^{${rate / 100}\times${t}}`),
              step("Work out the exponent first.", r`${rate / 100}\times${t} = ${num((rate * t) / 100)}`),
              step("Then the power of $e$, and multiply by $P$.", r`A = ${P}\times e^{${num((rate * t) / 100)}} \approx ${P}\times${round(Math.exp((rate * t) / 100), 6)} \approx ${round(A, 2)}`),
            ],
          };
        }
        const kind = rng.int(0, 2);
        if (kind === 0) {
          const rate = rng.int(2, 12);
          return {
            prompt: `An investment grows continuously at $${rate}\\%$ a year. How many years does it take to double? Give your answer to 2 decimal places.`,
            answer: decimalAnswer(Math.log(2) / (rate / 100)),
            hints: ["Doubling means Pe^(rt) = 2P, so e^(rt) = 2.", "Take ln of both sides."],
            solution: [
              step(`Doubling means the amount reaches $2P$. Set up $Pe^{rt} = 2P$ with $r = ${rate / 100}$, and divide both sides by $P$.`, r`e^{${rate / 100}t} = 2`),
              step("Take $\\ln$ of both sides to bring down the exponent.", r`${rate / 100}t = \ln 2`),
              step(`Divide by $${rate / 100}$.`, r`t = \frac{\ln 2}{${rate / 100}} \approx \frac{${round(Math.log(2), 4)}}{${rate / 100}} \approx ${round(Math.log(2) / (rate / 100), 2)}`),
            ],
          };
        }
        if (kind === 1) {
          const a = rng.int(1, 4);
          return {
            prompt: "Solve for $x$. Give an exact answer such as e^2, or a decimal to 2 places.",
            tex: r`\ln x = ${a}`,
            answer: decimalAnswer(Math.exp(a)),
            inputHint: "e.g. e^2",
            hints: ["Raise e to the power of both sides."],
            solution: [
              step(`$\\ln x = ${a}$ means $e$ to the power $${a}$ gives $x$. Raise $e$ to the power of both sides.`, r`e^{\ln x} = e^{${a}}`),
              step("$e$ to a power undoes $\\ln$.", r`x = e^{${a}} \approx ${round(Math.exp(a), 3)}`),
            ],
          };
        }
        const m = rng.int(2, 5), b = rng.int(1, 9), c = m * rng.int(2, 6) - b;
        return {
          prompt: "Solve for $x$. Give an exact answer or a decimal to 2 places.",
          tex: r`${m}e^{x} - ${b} = ${c}`,
          answer: decimalAnswer(Math.log((c + b) / m)),
          inputHint: "e.g. ln(4)",
          hints: ["Isolate e^x first.", "Then take ln of both sides."],
          solution: [
            step(`Get $e^x$ on its own. Add $${b}$ to both sides.`, r`${m}e^{x} = ${c} + ${b} = ${c + b}`),
            step(`Divide both sides by $${m}$.`, r`e^{x} = \frac{${c + b}}{${m}} = ${(c + b) / m}`),
            step("Take $\\ln$ of both sides.", r`x = \ln ${(c + b) / m} \approx ${round(Math.log((c + b) / m), 3)}`),
          ],
        };
      },
    },
    {
      id: "exponential-equations",
      title: "Solving Exponential Equations",
      summary: "Using logs to bring down exponents.",
      prerequisites: ["log-laws"],
      estimatedMinutes: 10,
      expectedSeconds: 70,
      keyIdeas: ["Same base: equate exponents.", "Otherwise take logs of both sides."],
      lesson: [
        text("If both sides can be written with the **same base**, set the exponents equal. Otherwise, take a logarithm of both sides and use the power law."),
        example("Solve $3^{x+1} = 81$.", [["$81 = 3^4$.", r`3^{x+1} = 3^4`], ["Equate exponents.", r`x + 1 = 4 \Rightarrow x = 3`]]),
        example("Solve $5^x = 40$.", [["Take logs.", r`x\log 5 = \log 40`], ["Divide.", r`x = \frac{\log 40}{\log 5} \approx 2.29`]]),
        tip("Doubling time for growth rate $r$: $t = \\frac{\\ln 2}{\\ln(1 + r)}$."),
      ],
      generate: (rng, level) => {
        const b = rng.pick([2, 3, 5]), k = rng.int(1, 4), x = rng.int(-2, 4);
        if (level <= 2) {
          const exp = x + k;
          return {
            prompt: "Solve for $x$.",
            tex: r`${b}^{x + ${k}} = ${exp >= 0 ? b ** exp : `\\frac{1}{${b ** -exp}}`}`,
            answer: numberAnswer(x),
            hints: [`Write the right side as a power of ${b}.`, "Set the exponents equal."],
            solution: [
              step(
                exp > 0
                  ? `Write the right side as a power of $${b}$: $${b ** exp} = ${Array(exp).fill(b).join("\\times")} = ${b}^{${exp}}$.`
                  : exp === 0
                    ? `Write the right side as a power of $${b}$: $1 = ${b}^{0}$.`
                    : `Write the right side as a power of $${b}$: $${b ** -exp} = ${b}^{${-exp}}$, and one over a power is a negative power.`,
                r`${b}^{x + ${k}} = ${b}^{${exp}}`,
              ),
              step("The bases match, so the exponents must be equal.", `x + ${k} = ${exp}`),
              step(`Subtract $${k}$ from both sides.`, `x = ${exp} - ${k} = ${x}`),
            ],
          };
        }
        const c = rng.int(7, 90);
        const ans = round(Math.log(c) / Math.log(b), 2);
        return {
          prompt: "Solve for $x$ to 2 decimal places.",
          tex: `${b}^x = ${c}`,
          answer: numberAnswer(ans, { tolerance: 0.003 }),
          hints: ["Take the log of both sides.", "Use the power law to bring x down."],
          solution: [
            step(`$${c}$ isn't a whole power of $${b}$, so take the log of both sides. The power law brings $x$ down in front.`, r`x\log ${b} = \log ${c}`),
            step(`Divide both sides by $\\log ${b}$.`, r`x = \frac{\log ${c}}{\log ${b}}`),
            step("Use a calculator, then round to 2 decimal places.", r`x \approx \frac{${round(Math.log10(c), 4)}}{${round(Math.log10(b), 4)}} \approx ${ans}`),
          ],
        };
      },
    },
  ],
};
