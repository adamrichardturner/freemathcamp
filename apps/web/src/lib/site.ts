import { courses, type Course, type ExerciseRef } from "@fmc/curriculum";

/** The person who runs the course. FreeMathCamp is the name of the site, not a company. */
export const AUTHOR = {
  name: "Adam Richard Turner",
  portfolioUrl: "https://adamrichardturner.dev",
  email: "hello@adamrichardturner.dev",
} as const;

/** Single source of truth for how the site describes itself to search and AI engines. */
export const SITE = {
  url: "https://freemathcamp.app",
  name: "FreeMathCamp",
  /** The phrase people search for; also used as an alternate brand name. */
  alternateName: "Free Math Camp",
  title: "FreeMathCamp — Learn All the Math You Need Before Calculus",
  tagline: "All the maths you need before calculus — free.",
  description:
    "FreeMathCamp is a free, adaptive online math course covering everything you need before calculus: arithmetic, fractions, algebra, functions, geometry, trigonometry and a first look at limits. Interactive visuals, unlimited practice and spaced review.",
  keywords: [
    "free math camp",
    "freemathcamp",
    "free math course",
    "free maths course",
    "learn math online free",
    "pre-calculus",
    "precalculus course",
    "math before calculus",
    "algebra practice",
    "adaptive math practice",
    "math foundations",
    "trigonometry basics",
    "fractions practice",
    "interactive math lessons",
  ],
  locale: "en_GB",
  themeColor: "#5b4be0",
} as const;

export const absoluteUrl = (path = "/") => new URL(path, SITE.url).toString();

/** Lesson rich text → plain text for meta descriptions and llms.txt ($x^2$ → x^2, **b** → b). */
export const plainText = (md: string) =>
  md
    .replace(/\$\$?([^$]+)\$\$?/g, (_, tex: string) =>
      tex
        .replace(/\\(?:d|t)?frac\{([^}]*)\}\{([^}]*)\}/g, "$1/$2")
        .replace(/\^\{?\\circ\}?/g, "°")
        .replace(/\\(sin|cos|tan|log|ln|exp|lim|max|min|gcd|operatorname)(?![a-zA-Z])/g, " $1 ")
        .replace(/\\iff/g, "⇔")
        .replace(/\\(?:left|right|displaystyle)/g, "")
        .replace(/\\(?:to|rightarrow|mapsto)/g, "→")
        .replace(/\\infty/g, "∞")
        .replace(/\\sum/g, "Σ")
        .replace(/\\c?dots/g, "…")
        .replace(/\\[,;! ]/g, " ")
        .replace(/\\(times|cdot)/g, "×")
        .replace(/\\div/g, "÷")
        .replace(/\\le/g, "≤")
        .replace(/\\ge/g, "≥")
        .replace(/\\neq/g, "≠")
        .replace(/\\pm/g, "±")
        .replace(/\\pi/g, "π")
        .replace(/\\theta/g, "θ")
        .replace(/\\sqrt\{([^}]*)\}/g, "√$1")
        .replace(/\\[a-zA-Z]+/g, "")
        .replace(/[{}]/g, "")
        .replace(/\s+/g, " ")
        .replace(/\( /g, "(")
        .replace(/ ([,)_^])/g, "$1")
        .replace(/\/ /g, "/")
        .trim(),
    )
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

export const lessonPath = (ref: ExerciseRef) => `/courses/${ref.course.id}/${ref.exercise.id}`;

export const lessonDescription = (ref: ExerciseRef) => {
  const summary = plainText(ref.exercise.summary).replace(/\.$/, "");
  const ideas = ref.exercise.keyIdeas.map(plainText).join(" ");
  return `${summary}. Free ${ref.unit.title.toLowerCase()} lesson from FreeMathCamp with interactive visuals and adaptive practice. ${ideas}`.slice(0, 300);
};

export const allCourses: Course[] = courses;

/**
 * The iOS app. While `available` is false the landing page says it's coming
 * soon; set it to true once the App Store listing is live and the badge links
 * to the store. The screenshots shown on the landing page live in
 * public/app/ (see public/app/README.md for sizes).
 */
export const IOS_APP = {
  available: false,
  appStoreUrl: "https://apps.apple.com/app/id6829382170",
  screenshots: [
    { src: "/app/iphone-1.png", alt: "Today's plan in the FreeMathCamp app, with the daily goal, streak and the next lessons to practise" },
    { src: "/app/iphone-2.png", alt: "A lesson in the FreeMathCamp app, with an interactive graph and typeset maths" },
    { src: "/app/iphone-3.png", alt: "Progress in the FreeMathCamp app: problems solved, accuracy, streak and daily activity" },
  ],
} as const;
