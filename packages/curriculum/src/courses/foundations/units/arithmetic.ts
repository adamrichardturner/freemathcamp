import { example, key, math, multipleChoice, numberAnswer, rule, step, text, tip, visual, warn } from "../../../core/builders";
import { formatThousands, gcd, isPrime, lcm, primeFactors, texPrimeFactorization } from "../../../core/math";
import type { Unit } from "../../../core/types";

const r = String.raw;

export const arithmetic: Unit = {
  id: "arithmetic",
  title: "Number Sense & Arithmetic",
  icon: "Hash",
  description: "Place value, the four operations, order of operations and the building blocks of whole numbers.",
  exercises: [
    {
      id: "place-value",
      title: "Place Value",
      summary: "Every digit's value depends on where it sits.",
      prerequisites: [],
      estimatedMinutes: 6,
      expectedSeconds: 20,
      keyIdeas: ["Each place is worth 10× the place to its right.", "A digit's value = digit × its place value."],
      lesson: [
        text("Our number system is **base ten**: ten digits (0–9) whose meaning changes with their position. Moving one place to the left multiplies a digit's value by $10$."),
        visual({ type: "placeValue", value: 4372 }, "In $4372$, the $3$ is worth $300$ because it sits in the hundreds place."),
        math(r`4372 = 4\times1000 + 3\times100 + 7\times10 + 2\times1`, "Expanded form"),
        key("A digit's value is **digit × place value**. The $7$ in $4372$ is worth $7 \\times 10 = 70$."),
        example("What is the value of the $5$ in $85{,}196$?", ["Count places from the right: ones, tens, hundreds, thousands.", ["The $5$ is in the thousands place, so its value is", r`5 \times 1000 = 5000`]]),
      ],
      generate: (rng, level) => {
        const digits = level === 1 ? 4 : level === 2 ? 5 : 7;
        let n = rng.int(10 ** (digits - 1), 10 ** digits - 1);
        const s = String(n);
        const pos = rng.int(0, s.length - 1);
        if (s[pos] === "0") n += 10 ** (s.length - 1 - pos);
        const str = String(n);
        const digit = Number(str[pos]);
        const place = 10 ** (str.length - 1 - pos);
        const names = ["ones", "tens", "hundreds", "thousands", "ten-thousands", "hundred-thousands", "millions"];
        return {
          prompt: `What is the value of the digit **${digit}** in the highlighted position of $${formatThousands(n).replace(/,/g, "{,}")}$? (It is ${ordinal(pos + 1)} from the left.)`,
          visual: { type: "placeValue", value: n, highlight: pos, conceal: true },
          solutionVisual: { type: "placeValue", value: n, highlight: pos },
          answer: numberAnswer(digit * place),
          hints: [`The ${ordinal(pos + 1)} digit from the left is in the **${names[str.length - 1 - pos]}** place.`, `Multiply the digit by ${formatThousands(place)}.`],
          solution: [step(`The digit sits in the ${names[str.length - 1 - pos]} place, worth ${formatThousands(place)}.`, r`${digit}\times ${place} = ${digit * place}`)],
        };
      },
    },
    {
      id: "add-subtract",
      title: "Adding & Subtracting",
      summary: "Combine and compare quantities, regrouping across places.",
      prerequisites: ["place-value"],
      estimatedMinutes: 6,
      expectedSeconds: 25,
      keyIdeas: ["Line up places and work right to left.", "Subtraction undoes addition."],
      lesson: [
        text("Adding combines amounts; subtracting finds the difference between them. On a number line, adding moves **right** and subtracting moves **left**."),
        visual({ type: "numberLine", min: 0, max: 20, step: 1, jumps: [{ from: 6, to: 13, label: "+7", tone: "primary" }], points: [{ value: 6, label: "6" }, { value: 13, label: "13", tone: "success" }] }, "$6 + 7 = 13$ as a jump to the right."),
        text("With bigger numbers, line up digits by place and work from right to left. When a column adds to $10$ or more, **carry** the ten into the next place."),
        example("Compute $478 + 356$.", ["Ones: $8 + 6 = 14$ → write $4$, carry $1$.", "Tens: $7 + 5 + 1 = 13$ → write $3$, carry $1$.", ["Hundreds: $4 + 3 + 1 = 8$.", "478 + 356 = 834"]]),
        tip("Check a subtraction by adding back: if $834 - 356 = 478$, then $478 + 356$ should give $834$."),
      ],
      generate: (rng, level) => {
        const max = level === 1 ? 99 : level === 2 ? 999 : 9999;
        const a = rng.int(Math.ceil(max / 10), max);
        const b = rng.int(Math.ceil(max / 10), max);
        const add = rng.chance(0.5);
        const [x, y] = add ? [a, b] : [Math.max(a, b), Math.min(a, b)];
        const ans = add ? x + y : x - y;
        return {
          prompt: "Compute.",
          tex: `${x} ${add ? "+" : "-"} ${y}`,
          answer: numberAnswer(ans),
          hints: ["Line up the digits by place value and start with the ones.", add ? "Carry a ten whenever a column reaches 10 or more." : "Borrow from the next place when the top digit is smaller."],
          solution: [step("Work column by column from the right.", `${x} ${add ? "+" : "-"} ${y} = ${ans}`)],
        };
      },
    },
    {
      id: "multiplication",
      title: "Multiplication",
      summary: "Repeated addition, arrays and the area model.",
      prerequisites: ["add-subtract"],
      estimatedMinutes: 8,
      expectedSeconds: 30,
      keyIdeas: ["$a \\times b$ counts the items in $a$ rows of $b$.", "Split numbers by place value to multiply big numbers."],
      lesson: [
        text("Multiplication is fast repeated addition. $4 \\times 6$ means four groups of six — picture a grid with $4$ rows and $6$ columns."),
        visual({ type: "arrayGrid", rows: 4, cols: 6 }, "$4 \\times 6 = 24$ dots."),
        text("For larger numbers, split each factor by place value and multiply the pieces. This is the **area model** — each rectangle's area is a partial product."),
        visual({ type: "areaModel", a: 23, b: 14 }, "$23 \\times 14 = 200 + 30 + 80 + 12 = 322$"),
        rule("Commutative & distributive", r`a\times b = b\times a \qquad a(b + c) = ab + ac`),
        example("Compute $36 \\times 7$.", [["Split $36$ into $30 + 6$.", r`36\times7 = 30\times7 + 6\times7`], ["Add the partial products.", r`210 + 42 = 252`]]),
      ],
      generate: (rng, level) => {
        const [a, b] = level === 1 ? [rng.int(2, 12), rng.int(2, 12)] : level === 2 ? [rng.int(13, 99), rng.int(3, 9)] : [rng.int(12, 99), rng.int(12, 99)];
        return {
          prompt: "Compute the product.",
          tex: r`${a} \times ${b}`,
          visual: level > 1 ? { type: "areaModel", a, b, conceal: true } : undefined,
          solutionVisual: level > 1 ? { type: "areaModel", a, b } : undefined,
          answer: numberAnswer(a * b),
          hints: ["Split the larger number into tens and ones.", "Multiply each piece, then add the partial products."],
          solution: [step("Use the area model and add the partial products.", r`${a}\times${b} = ${a * b}`)],
        };
      },
    },
    {
      id: "division",
      title: "Division & Remainders",
      summary: "Sharing equally and undoing multiplication.",
      prerequisites: ["multiplication"],
      estimatedMinutes: 8,
      expectedSeconds: 35,
      keyIdeas: ["$a \\div b$ asks: how many $b$'s fit in $a$?", "dividend = divisor × quotient + remainder"],
      lesson: [
        text("Division splits a quantity into equal groups. $24 \\div 6$ asks **how many groups of 6 fit into 24?** Because $6 \\times 4 = 24$, the answer is $4$."),
        visual({ type: "arrayGrid", rows: 4, cols: 6, groupBy: "rows" }, "24 split into rows of 6 gives 4 rows."),
        rule("Division algorithm", r`\text{dividend} = \text{divisor}\times\text{quotient} + \text{remainder}`, "The remainder is always smaller than the divisor."),
        example("Find $59 \\div 7$ with remainder.", ["$7 \\times 8 = 56$ is the largest multiple of 7 not over 59.", ["The leftover is $59 - 56 = 3$.", r`59 = 7\times8 + 3`]]),
        warn("You can never divide by zero — no number of empty groups can make a non-zero total."),
      ],
      generate: (rng, level) => {
        const d = rng.int(2, level === 1 ? 9 : 12);
        const q = rng.int(level === 1 ? 2 : 11, level === 1 ? 12 : level === 2 ? 40 : 150);
        if (level === 3 || rng.chance(0.3)) {
          const rem = rng.int(1, d - 1);
          const n = d * q + rem;
          return {
            prompt: `Divide $${n}$ by $${d}$. What is the **remainder**?`,
            tex: r`${n} \div ${d}`,
            answer: numberAnswer(rem),
            hints: [`Find the largest multiple of ${d} that is at most ${n}.`, `Subtract it from ${n}.`],
            solution: [step(`${d} × ${q} = ${d * q}, the largest multiple not exceeding ${n}.`), step("The remainder is what is left.", r`${n} - ${d * q} = ${rem}`)],
          };
        }
        return {
          prompt: "Compute the quotient.",
          tex: r`${d * q} \div ${d}`,
          answer: numberAnswer(q),
          hints: [`Think: ${d} × ? = ${d * q}`],
          solution: [step("Division undoes multiplication.", r`${d}\times${q} = ${d * q} \Rightarrow ${d * q}\div${d} = ${q}`)],
        };
      },
    },
    {
      id: "order-of-operations",
      title: "Order of Operations",
      summary: "Brackets, exponents, multiply/divide, then add/subtract.",
      prerequisites: ["multiplication", "division"],
      estimatedMinutes: 8,
      expectedSeconds: 45,
      keyIdeas: ["Brackets → Exponents → × ÷ (left to right) → + − (left to right)."],
      lesson: [
        text("An expression like $2 + 3 \\times 4$ needs a rule so everyone gets the same answer. Mathematicians agree on an order, often remembered as **PEMDAS** or **BIDMAS**."),
        rule("Order of operations", r`(\;)\;\to\; x^n \;\to\; \times\,\div \;\to\; +\,-`, "Multiplication and division share a rank (work left to right); so do addition and subtraction."),
        example("Evaluate $2 + 3 \\times 4$.", [["Multiply first.", r`2 + 12`], ["Then add.", r`= 14`]]),
        example("Evaluate $(8 - 2)^2 \\div 4 \\times 3$.", [["Brackets.", r`6^2 \div 4 \times 3`], ["Exponent.", r`36 \div 4 \times 3`], ["Divide then multiply, left to right.", r`9 \times 3 = 27`]]),
        warn("$\\times$ does not beat $\\div$! $12 \\div 3 \\times 2 = 8$, not $2$."),
      ],
      generate: (rng, level) => {
        const a = rng.int(2, 9), b = rng.int(2, 9), c = rng.int(2, 9), d = rng.int(1, 9);
        const forms: [string, number, string[]][] = [
          [`${a} + ${b} \\times ${c}`, a + b * c, [`Multiply first: ${b} × ${c} = ${b * c}.`, `Then add ${a}.`]],
          [`(${a} + ${b}) \\times ${c}`, (a + b) * c, [`Brackets first: ${a} + ${b} = ${a + b}.`]],
          [`${a * c} \\div ${c} + ${b} \\times ${d}`, a + b * d, ["Do both × and ÷ before adding."]],
        ];
        if (level >= 2)
          forms.push(
            [`${a} + ${b}^2 - ${d}`, a + b * b - d, [`Exponent first: ${b}² = ${b * b}.`]],
            [`(${a} + ${d})^2 \\div ${a + d}`, a + d, [`Brackets: ${a + d}. Square it, then divide.`]],
          );
        if (level === 3)
          forms.push([`${a * b * 2} \\div ${a} \\times ${c} - (${d} + ${c})^2`, b * 2 * c - (d + c) ** 2, ["Brackets and exponent first.", "Then ÷ and × left to right."]]);
        const [tex, ans, hints] = rng.pick(forms);
        return {
          prompt: "Evaluate using the order of operations.",
          tex,
          answer: numberAnswer(ans),
          hints: ["Brackets → exponents → × ÷ → + −", ...hints],
          solution: [step("Apply the order of operations step by step.", `${tex} = ${ans}`)],
        };
      },
    },
    {
      id: "factors-multiples",
      title: "Factors & Multiples",
      summary: "What divides a number, and what a number divides into.",
      prerequisites: ["division"],
      estimatedMinutes: 6,
      expectedSeconds: 30,
      keyIdeas: ["A factor divides evenly. A multiple is a times-table entry.", "Factors come in pairs."],
      lesson: [
        text("A **factor** of $n$ divides $n$ with no remainder. A **multiple** of $n$ is $n$ times a whole number. So $4$ is a factor of $12$, and $12$ is a multiple of $4$."),
        visual({ type: "arrayGrid", rows: 3, cols: 4 }, "$12$ dots arranged as $3 \\times 4$ — so $3$ and $4$ are a factor pair of $12$."),
        key("Factors come in **pairs** that multiply to $n$. Search up to $\\sqrt{n}$ and you have found them all."),
        example("List all factors of $36$.", ["Pairs: $1\\times36,\\ 2\\times18,\\ 3\\times12,\\ 4\\times9,\\ 6\\times6$.", "Factors: $1, 2, 3, 4, 6, 9, 12, 18, 36$ — nine in total."]),
      ],
      generate: (rng, level) => {
        const n = rng.pick(level === 1 ? [12, 18, 20, 24, 16, 30] : level === 2 ? [36, 48, 60, 42, 54, 72] : [84, 90, 96, 100, 120, 144]);
        const factors = Array.from({ length: n }, (_, i) => i + 1).filter((f) => n % f === 0);
        if (rng.chance(0.5)) {
          return {
            prompt: `How many factors does $${n}$ have (including $1$ and $${n}$)?`,
            answer: numberAnswer(factors.length),
            hints: ["List factor pairs starting from 1 × n.", `Stop once the pairs repeat (after √${n}).`],
            solution: [step(`Factors of ${n}: ${factors.join(", ")}.`), step(`That is ${factors.length} factors.`)],
          };
        }
        const nonFactor = rng.pick(Array.from({ length: n - 2 }, (_, i) => i + 2).filter((x) => n % x !== 0));
        const correct = `$${nonFactor}$`;
        const others = rng.shuffle(factors.filter((f) => f > 1 && f < n)).slice(0, 3).map((f) => `$${f}$`);
        return {
          prompt: `Which of these is **not** a factor of $${n}$?`,
          ...multipleChoice(rng, correct, others),
          hints: ["Try dividing: a factor leaves no remainder."],
          solution: [step(`$${n} \\div ${nonFactor}$ leaves a remainder of $${n % nonFactor}$, so ${nonFactor} is not a factor.`)],
        };
      },
    },
    {
      id: "prime-factorization",
      title: "Primes & Prime Factorization",
      summary: "Breaking every number into its prime building blocks.",
      prerequisites: ["factors-multiples", "exponent-basics"],
      estimatedMinutes: 8,
      expectedSeconds: 45,
      keyIdeas: ["A prime has exactly two factors: 1 and itself.", "Every whole number > 1 has one unique prime factorization."],
      lesson: [
        text("A **prime** number has exactly two factors: $1$ and itself — $2, 3, 5, 7, 11, 13, \\dots$ A number with more factors is **composite**. ($1$ is neither.)"),
        text("Primes are the atoms of multiplication. Keep splitting a number into factors until every branch ends in a prime: this is a **factor tree**."),
        visual({ type: "factorTree", value: 360 }, "$360 = 2^3 \\cdot 3^2 \\cdot 5$"),
        key("The **Fundamental Theorem of Arithmetic**: every whole number greater than $1$ has exactly one prime factorization (ignoring order)."),
        example("Find the prime factorization of $84$.", ["$84 = 2 \\times 42 = 2 \\times 2 \\times 21 = 2\\times2\\times3\\times7$", ["Collect repeated primes with exponents.", r`84 = 2^2\cdot3\cdot7`]]),
      ],
      generate: (rng, level) => {
        if (level === 1 && rng.chance(0.5)) {
          const n = rng.int(20, 99);
          const prime = isPrime(n);
          return {
            prompt: `Is $${n}$ prime or composite?`,
            ...multipleChoice(rng, prime ? "Prime" : "Composite", [prime ? "Composite" : "Prime"]),
            hints: ["Check divisibility by 2, 3, 5 and 7 (enough for numbers under 121)."],
            solution: [step(prime ? `${n} has no factors other than 1 and itself.` : `${n} = ${primeFactors(n).join(" × ")}, so it is composite.`)],
          };
        }
        const pool = level === 1 ? [2, 3, 5] : level === 2 ? [2, 3, 5, 7] : [2, 3, 5, 7, 11, 13];
        const count = level === 1 ? 3 : level === 2 ? 4 : 5;
        const ps = Array.from({ length: count }, () => rng.pick(pool));
        const n = ps.reduce((a, b) => a * b, 1);
        const largest = Math.max(...ps);
        const correct = `$${texPrimeFactorization(n)}$`;
        const wrong1 = `$${texPrimeFactorization(n * 2)}$`;
        const wrong2 = `$${texPrimeFactorization(Math.max(2, n / largest))} \\cdot ${largest * largest}$`;
        const wrong3 = `$${texPrimeFactorization(n / ps[0]!)}$`;
        return rng.chance(0.5)
          ? {
              prompt: `Which is the prime factorization of $${n}$?`,
              ...multipleChoice(rng, correct, [wrong1, wrong2, wrong3]),
              solutionVisual: { type: "factorTree", value: n },
              hints: ["Divide by the smallest prime repeatedly.", "Every factor in the answer must be prime."],
              solution: [step(`$${n} = ${primeFactors(n).join(" \\times ")} = ${texPrimeFactorization(n)}$`)],
            }
          : {
              prompt: `What is the **largest** prime factor of $${n}$?`,
              answer: numberAnswer(largest),
              hints: ["Divide out small primes first: 2, then 3, then 5…"],
              solution: [step(`$${n} = ${texPrimeFactorization(n)}$, so the largest prime factor is ${largest}.`)],
            };
      },
    },
    {
      id: "gcf-lcm",
      title: "GCF & LCM",
      summary: "Greatest common factor and least common multiple.",
      prerequisites: ["prime-factorization"],
      estimatedMinutes: 8,
      expectedSeconds: 50,
      keyIdeas: ["GCF: the biggest number dividing both.", "LCM: the smallest number both divide into.", "$\\gcd(a,b)\\cdot\\text{lcm}(a,b) = ab$"],
      lesson: [
        text("The **greatest common factor** (GCF) of two numbers is the largest number dividing both. The **least common multiple** (LCM) is the smallest number both divide into. You'll use the LCM constantly to add fractions."),
        text("Prime factorizations make both easy. For the GCF take the primes they **share** (lowest powers); for the LCM take **every** prime (highest powers)."),
        example("Find the GCF and LCM of $12$ and $18$.", ["$12 = 2^2\\cdot3$ and $18 = 2\\cdot3^2$.", ["GCF: shared primes, lowest powers.", r`2\cdot3 = 6`], ["LCM: all primes, highest powers.", r`2^2\cdot3^2 = 36`]]),
        rule("Product rule", r`\gcd(a,b)\cdot\operatorname{lcm}(a,b) = a\cdot b`, "Check: $6 \\times 36 = 216 = 12 \\times 18$ ✓"),
      ],
      generate: (rng, level) => {
        const g = rng.pick(level === 1 ? [2, 3, 4, 5] : level === 2 ? [4, 6, 8, 9, 12] : [6, 12, 14, 15, 18]);
        let x = rng.int(2, level === 3 ? 9 : 6), y = rng.int(2, level === 3 ? 9 : 7);
        while (gcd(x, y) !== 1 || x === y) y = rng.int(2, 9);
        const a = g * x, b = g * y;
        const askGcf = rng.chance(0.5);
        const ans = askGcf ? gcd(a, b) : lcm(a, b);
        return {
          prompt: `Find the ${askGcf ? "**greatest common factor**" : "**least common multiple**"} of $${a}$ and $${b}$.`,
          answer: numberAnswer(ans),
          hints: [`Write both as prime factorizations: $${a} = ${texPrimeFactorization(a)}$, $${b} = ${texPrimeFactorization(b)}$.`, askGcf ? "Take only shared primes, at their lowest power." : "Take every prime, at its highest power."],
          solution: [step(`$${a} = ${texPrimeFactorization(a)}$ and $${b} = ${texPrimeFactorization(b)}$.`), step(askGcf ? "Shared primes with lowest powers:" : "All primes with highest powers:", `${ans}`)],
        };
      },
    },
  ],
};

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]!);
}
