import type { Problem } from "@fmc/curriculum";

export type AnswerKeyboard = "numeric" | "text";

export interface AnswerKey {
  label: string;
  insert: string;
  accessibilityLabel: string;
}

/** A value a learner would type with digits alone: a short decimal or a simple fraction. */
const tidy = (v: number) => {
  for (let d = 1; d <= 200; d++) if (Math.abs(v * d - Math.round(v * d)) < 1e-9) return true;
  return Math.abs(v * 1e4 - Math.round(v * 1e4)) < 1e-6;
};

/** A format hint that shows an answer written with sqrt, pi, ln, log or a power ("e.g. 4pi"). */
const symbolic = /sqrt|(^|[^a-z])pi([^a-z]|$)|ln\(|log\(|[√π^]/i;

/**
 * The keyboard a problem's answer box opens with. Most answers are digits with a sign,
 * a fraction bar or a comma, which the app's own number pad covers; answers written
 * with sqrt, pi, ln or e open the system keyboard instead.
 */
export const answerKeyboard = (problem: Problem): AnswerKeyboard => {
  if (problem.inputHint) return symbolic.test(problem.inputHint) ? "text" : "numeric";
  const { answer } = problem;
  const values = answer.kind === "number" ? [answer.value] : answer.kind === "choice" ? [] : answer.values;
  return values.every(tidy) ? "numeric" : "text";
};

const KEY = {
  slash: { label: "/", insert: "/", accessibilityLabel: "Fraction bar" },
  comma: { label: ",", insert: ", ", accessibilityLabel: "Comma" },
  open: { label: "(", insert: "(", accessibilityLabel: "Open bracket" },
  close: { label: ")", insert: ")", accessibilityLabel: "Close bracket" },
  percent: { label: "%", insert: "%", accessibilityLabel: "Percent" },
  space: { label: "␣", insert: " ", accessibilityLabel: "Space" },
  sqrt: { label: "√", insert: "sqrt(", accessibilityLabel: "Square root" },
  pi: { label: "π", insert: "pi", accessibilityLabel: "Pi" },
  power: { label: "^", insert: "^", accessibilityLabel: "Power" },
} satisfies Record<string, AnswerKey>;

/** The maths symbols that sit two layers deep on the full keyboard, offered in a row above it. */
export const textKeys: AnswerKey[] = [KEY.sqrt, KEY.pi, KEY.power, KEY.open, KEY.close, KEY.slash];

/**
 * The keys the number pad adds for this problem, beyond its digits, sign, point and
 * fraction bar: whatever else the answer can need, and nothing it can't.
 */
export const padKeys = (problem: Problem): AnswerKey[] => {
  const { answer } = problem;
  const hint = problem.inputHint ?? "";
  return [
    ...(answer.kind === "tuple" ? [KEY.open, KEY.close] : []),
    ...(answer.kind === "set" || answer.kind === "tuple" ? [KEY.comma] : []),
    ...((answer.kind === "number" && answer.unit === "%") || hint.includes("%") ? [KEY.percent] : []),
    // Mixed numbers ("2 1/3") are the one answer that needs a space.
    ...(/\d \d+\/\d/.test(hint) ? [KEY.space] : []),
  ];
};
