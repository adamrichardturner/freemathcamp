import { course, graph } from "@/lib/course";

/** Shown on the landing page and mirrored as FAQPage structured data — keep both in sync by using this list. */
export const FAQS = [
  {
    q: "What is FreeMathCamp?",
    a: `FreeMathCamp (FreeMathCamp) is a free online course that teaches all the math you need before calculus. Its Foundations course has ${graph.refs.length} connected lessons across ${course.units.length} units, from place value and fractions through algebra, functions, exponentials, geometry and trigonometry to a first look at limits, with interactive visuals and unlimited adaptive practice.`,
  },
  {
    q: "Is FreeMathCamp really free?",
    a: "Yes. Every lesson, every practice problem and all progress tracking are free, with no ads and no paywall. You only need a free account to save progress and get personalised reviews.",
  },
  {
    q: "Who is FreeMathCamp for?",
    a: "Anyone who wants solid math foundations: students preparing for calculus, adults returning to math, and learners filling gaps before algebra, physics, data science or programming courses. It starts from the basics, so no prior knowledge is assumed.",
  },
  {
    q: "How does the adaptive practice work?",
    a: "Problems are generated fresh for you. The engine raises the difficulty after two clean solves and eases off when you struggle. It measures struggle from wrong attempts, hints and time taken, estimates your mastery with Bayesian knowledge tracing, and schedules spaced reviews so ideas stick.",
  },
  {
    q: "Do I have to take the lessons in order?",
    a: "By default, yes: in Path mode each lesson unlocks when you finish a practice session on the one before it. If you'd rather explore, switch to Audit mode on the course page or in Settings and every lesson opens. Either way, each lesson lists the earlier lessons it builds on, and anyone can read the lessons without an account.",
  },
  {
    q: "What topics does FreeMathCamp cover?",
    a: "Number sense and arithmetic, integers, fractions, decimals and percentages, ratios and proportions, exponents and roots, algebra, equations and inequalities, graphs and linear equations, functions, polynomials, quadratics and rational functions, exponentials and logarithms (including e and natural logs), geometry, trigonometry, and sequences and series. A final unit introduces the difference quotient and limits, so you start calculus ready.",
  },
];
