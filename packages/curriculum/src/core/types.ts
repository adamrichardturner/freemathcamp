import type { Rng } from "./rng";

/** Difficulty tier requested from a generator. The engine raises it as mastery grows. */
export type Level = 1 | 2 | 3;

/**
 * Rich-text strings ("md") support a deliberately small syntax:
 * `$inline tex$`, `$$display tex$$`, `**bold**`, `*italic*` and blank-line paragraphs.
 */
export type Md = string;

export type Visual =
  | {
      type: "numberLine";
      min: number;
      max: number;
      step?: number;
      points?: { value: number; label?: string; tone?: Tone }[];
      jumps?: { from: number; to: number; label?: string; tone?: Tone }[];
      highlight?: { from: number; to: number; tone?: Tone; openStart?: boolean; openEnd?: boolean };
    }
  | { type: "fractionBars"; fractions: [number, number][]; labels?: boolean }
  | { type: "fractionCircle"; numerator: number; denominator: number }
  /** `conceal` leaves the products blank so it can scaffold a question without answering it. */
  | { type: "areaModel"; a: number; b: number; conceal?: boolean }
  | { type: "arrayGrid"; rows: number; cols: number; groupBy?: "rows" | "cols" }
  | { type: "percentGrid"; percent: number }
  /** `conceal` hides the place names and values, leaving just the digits. */
  | { type: "placeValue"; value: number; highlight?: number; conceal?: boolean }
  | { type: "tapeDiagram"; parts: { label: string; value: number; tone?: Tone }[]; totalLabel?: string }
  | { type: "balance"; left: string; right: string; note?: string }
  | { type: "factorTree"; value: number }
  | { type: "exponentBlocks"; base: number; exponent: number }
  | {
      type: "functionPlot";
      functions: { fn: (x: number) => number; label?: string; tone?: Tone; dashed?: boolean }[];
      /** `open` draws a hollow dot: a point missing from the graph, like a hole. */
      points?: { x: number; y: number; label?: string; tone?: Tone; open?: boolean }[];
      circles?: { x: number; y: number; r: number; tone?: Tone }[];
      viewBox?: { x: [number, number]; y: [number, number] };
      /** Keep one unit the same length on both axes (circles stay round). */
      equalAspect?: boolean;
    }
  | { type: "slopeExplorer"; a?: [number, number]; b?: [number, number] }
  | { type: "lineExplorer"; m?: number; b?: number }
  | { type: "parabolaExplorer"; a?: number; h?: number; k?: number }
  | { type: "transformExplorer"; base: "abs" | "square" | "sqrt" | "sin" | "exp" }
  | { type: "exponentialExplorer"; base?: number }
  | { type: "unitCircle"; angle?: number }
  | { type: "rightTriangle"; a?: number; b?: number; showSquares?: boolean; labels?: { a?: string; b?: string; c?: string; angle?: string } }
  | { type: "circleExplorer"; r?: number }
  | { type: "angleExplorer"; angle?: number }
  | { type: "sequenceBars"; terms: number[] }
  | { type: "triangleAngles"; angles: [number, number, number]; hidden?: 0 | 1 | 2 }
  | { type: "systemExplorer"; lines: [{ m: number; b: number }, { m: number; b: number }] };

export type Tone = "primary" | "accent" | "success" | "warning" | "danger" | "muted";

export type Block =
  | { kind: "text"; md: Md }
  | { kind: "math"; tex: string; caption?: Md }
  | { kind: "callout"; tone: "info" | "tip" | "warning" | "key"; title?: string; md: Md }
  | { kind: "example"; title?: string; problem: Md; steps: { md: Md; tex?: string }[] }
  | { kind: "visual"; visual: Visual; caption?: Md }
  | { kind: "rule"; name: string; tex: string; md?: Md };

export type Answer =
  /** Accepts integers, decimals, fractions, mixed numbers, %, and small expressions like 2sqrt(3) or pi/4. */
  | { kind: "number"; value: number; tolerance?: number; requireSimplest?: boolean; unit?: string }
  /** Unordered list of numbers, e.g. roots of a quadratic. */
  | { kind: "set"; values: number[]; tolerance?: number }
  /** Ordered tuple, e.g. a coordinate pair (x, y). */
  | { kind: "tuple"; values: number[]; tolerance?: number }
  | { kind: "choice"; correct: number };

export interface Problem {
  prompt: Md;
  /** Optional display-math expression rendered large under the prompt. */
  tex?: string;
  /** Shown while the learner works on it, so it must never give the answer away. */
  visual?: Visual;
  /** Shown with the worked solution once the problem is resolved; free to show the answer. */
  solutionVisual?: Visual;
  choices?: Md[];
  answer: Answer;
  /** Short placeholder/format hint shown in the answer box. */
  inputHint?: string;
  hints: Md[];
  solution: { md: Md; tex?: string }[];
}

export type Generator = (rng: Rng, level: Level) => Problem;

export interface Exercise {
  id: string;
  title: string;
  summary: Md;
  /** Ids of exercises whose ideas this one builds on. Advisory, never a gate. */
  prerequisites: string[];
  estimatedMinutes: number;
  /** Typical time a confident learner needs per problem; the engine's time baseline. */
  expectedSeconds: number;
  lesson: Block[];
  generate: Generator;
  keyIdeas: Md[];
}

export interface Unit {
  id: string;
  title: string;
  description: Md;
  /** Lucide icon name rendered by the web app. */
  icon: string;
  exercises: Exercise[];
}

export interface Course {
  id: string;
  title: string;
  tagline: string;
  description: Md;
  units: Unit[];
}

/** Exercise enriched with its location inside a course. */
export interface ExerciseRef {
  exercise: Exercise;
  unit: Unit;
  course: Course;
  /** Global position in the course's recommended order. */
  order: number;
}
