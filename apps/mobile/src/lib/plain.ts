/**
 * Curriculum rich text as plain text, for native lists and titles where a web
 * view would be too heavy: TeX becomes readable Unicode and markup is dropped.
 * Lessons and problems themselves render with KaTeX in a DOM component.
 */
const TEX: [RegExp, string][] = [
  [/\\d?frac\{([^{}]*)\}\{([^{}]*)\}/g, "$1/$2"],
  [/\\sqrt\{([^{}]*)\}/g, "√($1)"],
  [/\\(left|right|displaystyle|,|;|!|quad|qquad)/g, " "],
  [/\\times/g, "×"],
  [/\\cdot/g, "·"],
  [/\\div/g, "÷"],
  [/\\pm/g, "±"],
  [/\\le(q)?/g, "≤"],
  [/\\ge(q)?/g, "≥"],
  [/\\neq?/g, "≠"],
  [/\\approx/g, "≈"],
  [/\\infty/g, "∞"],
  [/\\pi/g, "π"],
  [/\\theta/g, "θ"],
  [/\\alpha/g, "α"],
  [/\\beta/g, "β"],
  [/\\Delta/g, "Δ"],
  [/\\to/g, "→"],
  [/\\(text|mathrm|operatorname|mathbf)\{([^{}]*)\}/g, "$2"],
  [/\\(sin|cos|tan|log|ln|lim)/g, "$1"],
  [/\^\{([^{}]*)\}/g, "^$1"],
  [/_\{([^{}]*)\}/g, "_$1"],
  [/\\[a-zA-Z]+/g, ""],
  [/[{}]/g, ""],
];

const SUPERSCRIPT: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", n: "ⁿ", x: "ˣ", "-": "⁻" };

export const plainTex = (tex: string) => {
  let s = tex;
  for (const [re, to] of TEX) s = s.replace(re, to);
  s = s.replace(/\^([0-9nx-]+)/g, (_, p: string) => (p.split("").every((ch) => SUPERSCRIPT[ch]) ? p.split("").map((ch) => SUPERSCRIPT[ch]).join("") : `^${p}`));
  return s.replace(/\s+/g, " ").trim();
};

export const plain = (md: string) =>
  md
    .replace(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g, (_, a?: string, b?: string) => plainTex(a ?? b ?? ""))
    .replace(/\[\[[a-z0-9-]+\|([^\]]+)\]\]/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/\s*\n{2,}\s*/g, "\n")
    .trim();
