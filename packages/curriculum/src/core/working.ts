/**
 * Building blocks for worked solutions. Each helper returns TeX or steps that
 * show the working a learner would write down, not just the result.
 */
import { step } from "./builders";
import { gcd, num, paren } from "./math";

export type Step = ReturnType<typeof step>;

const r = String.raw;

/** Lines of working aligned on "=": chain("x", "2 + 3", "5") → x = 2 + 3 = 5, one per line. Repeated lines are dropped. */
export const chain = (lhs: string, ...rhs: string[]) => {
  const rows = rhs.filter((row, i) => row !== rhs[i - 1] && row !== lhs);
  if (rows.length <= 1) return `${lhs} = ${rows[0] ?? lhs}`;
  return r`\begin{aligned} ${lhs} &= ${rows.join(r` \\ &= `)} \end{aligned}`;
};

/** Several separate lines, aligned on the first "&" in each. */
export const lines = (...rows: string[]) => (rows.length === 1 ? rows[0]!.replace("&", "") : r`\begin{aligned} ${rows.join(r` \\ `)} \end{aligned}`);

/** A coefficient times substituted values, each bracketed so digits never run together: times(3, 2) → 3(2), times(-1, 4) → -(4). */
export const times = (c: number, ...xs: number[]) => `${c === 1 ? "" : c === -1 ? "-" : num(c)}${xs.map((x) => `(${num(x)})`).join("")}`;

/** Numbers joined with their signs: [12, -8, 1] → 12 - 8 + 1. */
export const joinSigned = (xs: number[]) => xs.map((x, i) => (i === 0 ? num(x) : x < 0 ? ` - ${num(-x)}` : ` + ${num(x)}`)).join("");

/** n/d in TeX without reducing, sign out front. */
export const fracTex = (n: number, d: number) => {
  if (d < 0) [n, d] = [-n, -d];
  return n < 0 ? r`-\frac{${num(-n)}}{${num(d)}}` : r`\frac{${num(n)}}{${num(d)}}`;
};

/** Simplifies n/d, naming the common factor used. */
export const simplifyStep = (n: number, d: number): Step => {
  const g = gcd(n, d);
  if (d < 0) [n, d] = [-n, -d];
  if (g <= 1) return step(`$${Math.abs(n)}$ and $${d}$ share no factor bigger than $1$, so this is already in simplest form.`, fracTex(n, d));
  const [a, b] = [n / g, d / g];
  return step(`Divide the top and bottom by $${g}$, their greatest common factor.`, `${fracTex(n, d)} = ${b === 1 ? num(a) : fracTex(a, b)}`);
};

/* ---------- Place value and column arithmetic ---------- */

const WHOLE = ["ones", "tens", "hundreds", "thousands", "ten-thousands", "hundred-thousands", "millions"];
const PART = ["tenths", "hundredths", "thousandths", "ten-thousandths"];
const placeName = (i: number) => (i >= 0 ? WHOLE[i] : PART[-i - 1]) ?? "next";

/** Decimal places in a number as written (8.25 → 2). */
export const decimalPlaces = (x: number) => (num(x).split(".")[1] ?? "").length;

/** Each column's digit, ones column last, for a whole number. */
const digits = (n: number) => String(n).split("").map(Number);

const layout = (top: string, bottom: string, op: string, result: string) =>
  r`\begin{array}{r} ${top} \\ ${op}\;${bottom} \\ \hline ${result} \end{array}`;

/**
 * Column addition of two non-negative numbers, right to left, naming each carry.
 * Decimals are padded to the same number of places so the points line up.
 */
export const columnAddition = (x: number, y: number): Step[] => {
  const dp = Math.max(decimalPlaces(x), decimalPlaces(y));
  const X = Math.round(x * 10 ** dp), Y = Math.round(y * 10 ** dp);
  const xs = digits(X).reverse(), ys = digits(Y).reverse();
  const rows: string[] = [];
  let carry = 0, carried = false;
  for (let i = 0; i < Math.max(xs.length, ys.length); i++) {
    const a = xs[i] ?? 0, b = ys[i] ?? 0, s = a + b + carry;
    const sum = carry ? `${a} + ${b} + ${carry}` : `${a} + ${b}`;
    const carries = s >= 10 && i < Math.max(xs.length, ys.length) - 1;
    rows.push(r`\text{${placeName(i - dp)}:}\ & ${sum} = ${s}${carries ? r` \;\to\; \text{write } ${s % 10}\text{, carry } 1` : ""}`);
    carry = carries ? 1 : 0;
    carried ||= carries;
  }
  const f = (v: number) => (v / 10 ** dp).toFixed(dp);
  return [
    step(`Line up the places${dp ? " and the decimal points" : ""}, then add each column from the right${carried ? ", carrying a $1$ whenever a column reaches $10$" : ""}.`, lines(...rows)),
    step("Read off the answer.", layout(f(X), f(Y), "+", f(X + Y))),
  ];
};

/**
 * Column subtraction of y from a larger x, right to left, naming each borrow.
 * Decimals are padded to the same number of places so the points line up.
 */
export const columnSubtraction = (x: number, y: number): Step[] => {
  const dp = Math.max(decimalPlaces(x), decimalPlaces(y));
  const X = Math.round(x * 10 ** dp), Y = Math.round(y * 10 ** dp);
  if (Y > X) throw new Error("columnSubtraction needs x >= y");
  const xs = digits(X).reverse(), ys = digits(Y).reverse();
  const rows: string[] = [];
  let lent = 0, borrowed = false;
  for (let i = 0; i < xs.length; i++) {
    const top = xs[i]!, b = ys[i] ?? 0;
    // The leading column of the top number can end up empty; nothing to write there.
    if (i === xs.length - 1 && i >= ys.length && top - lent === 0) break;
    const eff = top - lent;
    const before = lent ? r`\text{the ${top} lent 1, so }` : "";
    let row: string;
    if (eff >= b) row = `${before}${eff} - ${b} = ${eff - b}`;
    else if (eff < 0) row = r`\text{the 0 has nothing to lend, so it borrows first and is left with 9: } 9 - ${b} = ${9 - b}`;
    else row = r`${before}${eff} < ${b}\text{, so borrow: } ${eff + 10} - ${b} = ${eff + 10 - b}`;
    rows.push(r`\text{${placeName(i - dp)}:}\ & ${row}`);
    lent = eff < b ? 1 : 0;
    borrowed ||= eff < b;
  }
  const f = (v: number) => (v / 10 ** dp).toFixed(dp);
  return [
    step(
      `Line up the places${dp ? " and the decimal points" : ""}, then subtract each column from the right.${borrowed ? " When the top digit is too small, borrow $1$ from the next place (worth $10$ in this one)." : ""}`,
      lines(...rows),
    ),
    step("Read off the answer.", layout(f(X), f(Y), "-", f(X - Y))),
  ];
};

/** Non-zero place-value parts of a whole number: 306 → [300, 6]. */
export const placeParts = (n: number) =>
  digits(n)
    .map((d, i, all) => d * 10 ** (all.length - 1 - i))
    .filter((p) => p !== 0);

/** Whole-number multiplication by splitting each factor into place-value parts (the area model). */
export const partialProducts = (a: number, b: number): Step[] => {
  const pa = placeParts(a), pb = placeParts(b);
  if (pa.length === 1 && pb.length === 1) {
    const da = Number(String(a).replace(/0+$/, "")), db = Number(String(b).replace(/0+$/, ""));
    const zeros = String(a).length - String(da).length + String(b).length - String(db).length;
    if (zeros === 0) return skipCount(a, b);
    return [
      step(`Ignore the zero${zeros > 1 ? "s" : ""} for now and use the times-table fact.`, r`${da}\times${db} = ${da * db}`),
      step(`Put the $${zeros}$ zero${zeros > 1 ? "s" : ""} back on the end.`, r`${a}\times${b} = ${a * b}`),
    ];
  }
  const grp = (ps: number[]) => (ps.length > 1 ? `(${ps.join(" + ")})` : `${ps[0]}`);
  const products = pa.flatMap((x) => pb.map((y) => [x, y] as const));
  return [
    step("Split each number into its place-value parts.", r`${a}\times${b} = ${grp(pa)}\times${grp(pb)}`),
    step("Multiply every part of one by every part of the other.", lines(...products.map(([x, y]) => r`${x}\times${y} &= ${x * y}`))),
    step("Add the partial products.", `${products.map(([x, y]) => x * y).join(" + ")} = ${a * b}`),
  ];
};

/** Counting up in steps of the larger factor, for small times-table facts. */
export const skipCount = (a: number, b: number): Step[] => {
  const [times, size] = a <= b ? [a, b] : [b, a];
  const counts = Array.from({ length: times }, (_, i) => size * (i + 1));
  return [step(`$${a}\\times${b}$ is ${times} groups of ${size}. Count up in ${size}s, ${times} times.`, counts.join(r`,\ `)), step("The last number you reach is the product.", r`${a}\times${b} = ${a * b}`)];
};

/** Division by chunking: take away easy multiples of the divisor (hundreds, tens, ones of the quotient). */
export const chunkDivision = (n: number, d: number): Step[] => {
  const q = Math.floor(n / d), rem = n - q * d;
  if (q < 10 || placeParts(q).length === 1)
    return [step(`Find how many $${d}$s fit into $${n}$ using your ${d} times table.`, r`${d}\times${q} = ${d * q}${rem ? r` \le ${n}` : ""}`)];
  let left = n;
  const rows = placeParts(q).map((p) => {
    const row = r`${left} - ${d}\times${p} &= ${left} - ${d * p} = ${left - d * p}`;
    left -= d * p;
    return row;
  });
  return [
    step(`Take away big, easy multiples of $${d}$ (lots of 100, 10, then single ones) until less than $${d}$ is left.`, lines(...rows)),
    step(`Add up how many $${d}$s you took away.`, `${placeParts(q).join(" + ")} = ${q}${rem ? r`\text{, with } ${rem} \text{ left over}` : ""}`),
  ];
};

/* ---------- Signed numbers ---------- */

/** Explains a + b for integers with the size-and-sign rules. */
export const addSigned = (a: number, b: number): Step => {
  const s = a + b;
  const sum = `${a} + ${paren(b)}`;
  if (a >= 0 && b >= 0) return step("Both numbers are positive, so just add.", `${sum} = ${s}`);
  if (a <= 0 && b <= 0) return step(`Both numbers are negative: add their sizes, $${-a} + ${-b} = ${-s}$, and keep the minus sign.`, `${sum} = ${s}`);
  const [big, small] = Math.abs(a) >= Math.abs(b) ? [a, b] : [b, a];
  if (s === 0) return step(`The numbers are opposites ($${Math.abs(a)}$ in each direction), so they cancel.`, `${sum} = 0`);
  return step(
    `The signs are different, so subtract the smaller size from the larger: $${Math.abs(big)} - ${Math.abs(small)} = ${Math.abs(s)}$. The answer takes the sign of $${big}$, the number with the larger size.`,
    `${sum} = ${s}`,
  );
};

/* ---------- Substitution ---------- */

/** A polynomial term list: [coefficient, power] pairs. */
export type Terms = [number, number][];

const termAt = (c: number, p: number, x: string, first: boolean) => {
  const sign = c < 0 ? (first ? "-" : " - ") : first ? "" : " + ";
  const size = Math.abs(c);
  if (p === 0) return `${sign}${num(size)}`;
  const power = p === 1 ? x : `${x}^{${p}}`;
  return `${sign}${size === 1 ? "" : num(size)}${power}`;
};

/** TeX for a polynomial in `v`: [[3, 2], [-4, 1], [1, 0]] → 3x^2 - 4x + 1. */
export const polyTex = (terms: Terms, v = "x") => {
  const kept = terms.filter(([c]) => c !== 0);
  return kept.length ? kept.map(([c, p], i) => termAt(c, p, v, i === 0)).join("") : "0";
};

/**
 * The working for substituting a value into a polynomial:
 * f(-2) = 3(-2)^2 - 4(-2) + 1 = 3(4) - 4(-2) + 1 = 12 + 8 + 1 = 21
 */
export const substitute = (lhs: string, terms: Terms, x: number) => {
  const kept = terms.filter(([c]) => c !== 0);
  const value = kept.reduce((s, [c, p]) => s + c * x ** p, 0);
  if (!kept.length) return { tex: `${lhs} = 0`, value };
  const xt = x < 0 || !Number.isInteger(x) ? `(${num(x)})` : `${num(x)}`;
  const withX = kept
    .map(([c, p], i) => {
      const sign = c < 0 ? (i === 0 ? "-" : " - ") : i === 0 ? "" : " + ";
      const size = Math.abs(c);
      if (p === 0) return `${sign}${num(size)}`;
      const pow = p === 1 ? xt : `${xt}^{${p}}`;
      return size === 1 ? `${sign}${pow}` : `${sign}${num(size)}${xt.startsWith("(") ? pow : r`\cdot ${pow}`}`;
    })
    .join("");
  const hasPowers = kept.some(([, p]) => p >= 2);
  const powered = kept
    .map(([c, p], i) => {
      const sign = c < 0 ? (i === 0 ? "-" : " - ") : i === 0 ? "" : " + ";
      const size = Math.abs(c);
      if (p === 0) return `${sign}${num(size)}`;
      const v = x ** p;
      if (size === 1) return i === 0 && c > 0 ? num(v) : `${sign}${paren(v)}`;
      return `${sign}${num(size)}${r`\cdot`}${paren(v)}`;
    })
    .join("");
  const evaluated = joinSigned(kept.map(([c, p]) => c * x ** p));
  const rows = [withX, ...(hasPowers ? [powered] : []), evaluated, num(value)];
  return { tex: chain(lhs, ...rows), value };
};
