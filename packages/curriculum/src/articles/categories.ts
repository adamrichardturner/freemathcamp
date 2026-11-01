import type { ArticleCategory, ArticleCategoryId } from "./types";

/** In course order, so the articles index reads like the course map. */
export const articleCategories: ArticleCategory[] = [
  {
    id: "number",
    slug: "number-and-arithmetic",
    title: "Number & Arithmetic",
    icon: "Hash",
    description: "Place value, the order of operations, factors, primes, negative numbers and absolute value.",
    summary:
      "These articles cover the whole-number ideas everything else rests on. How a digit's place sets its value, the agreed order for working out a calculation, how numbers break into factors and primes, and how negative numbers behave when you add, subtract, multiply and divide them.",
  },
  {
    id: "fractions",
    slug: "fractions-decimals-and-percentages",
    title: "Fractions, Decimals & Percentages",
    icon: "PieChart",
    description: "What a fraction means, equivalent fractions, common denominators, the reciprocal, decimals and percentages.",
    summary:
      "A fraction, a decimal and a percentage can all name the same amount. These articles explain what a fraction really is, why equivalent fractions work, how common denominators let you compare and add, why dividing by a fraction means multiplying by its reciprocal, and how percentages and multipliers handle discounts and growth.",
  },
  {
    id: "ratio",
    slug: "ratio-and-proportion",
    title: "Ratio & Proportion",
    icon: "Scale",
    description: "Ratios, rates and unit rates, and quantities that grow in proportion.",
    summary:
      "Ratios compare quantities, rates compare quantities with different units, and proportion says two ratios are equal. These articles show how to share in a ratio, find the better deal with a unit rate, and solve a proportion by cross-multiplying.",
  },
  {
    id: "powers",
    slug: "powers-and-roots",
    title: "Powers & Roots",
    icon: "Superscript",
    description: "Exponents and their laws, zero and negative powers, square roots and surds, scientific notation and fractional exponents.",
    summary:
      "An exponent counts repeated multiplication, and nearly every rule about powers follows from that one idea. These articles build the exponent laws, explain why anything to the power zero is one, simplify square roots, write huge and tiny numbers in scientific notation, and show that a root is just a fractional power.",
  },
  {
    id: "algebra",
    slug: "algebra",
    title: "Algebra",
    icon: "Variable",
    description: "Expressions and like terms, expanding brackets, solving equations and inequalities, interval notation and rearranging formulae.",
    summary:
      "Algebra uses letters for numbers so that one calculation can describe many. These articles cover the vocabulary of expressions, the distributive property, the balance method for solving equations, why an inequality flips when you multiply by a negative, interval notation, and how to rearrange a formula.",
  },
  {
    id: "graphs",
    slug: "graphs-and-functions",
    title: "Graphs & Functions",
    icon: "TrendingUp",
    description: "The coordinate plane, slope, straight-line equations, simultaneous equations, functions, domain and range, and graph transformations.",
    summary:
      "A graph turns an equation into a picture. These articles start with coordinates and slope, build up to the equation of a straight line and where two lines meet, then define functions properly: their domain and range, how to combine and reverse them, and how shifting and stretching moves a graph.",
  },
  {
    id: "polynomials",
    slug: "polynomials-and-quadratics",
    title: "Polynomials & Quadratics",
    icon: "Spline",
    description: "Polynomials, factorising and solving quadratics, the quadratic formula, completing the square, rational functions and rationalising.",
    summary:
      "Quadratics are the first curves most learners meet, and the techniques for them carry straight into calculus. These articles explain what a polynomial is, how to factorise a quadratic, completing the square and vertex form, the quadratic formula and its discriminant, asymptotes of rational functions, and clearing roots from denominators.",
  },
  {
    id: "exponentials",
    slug: "exponentials-and-logarithms",
    title: "Exponentials & Logarithms",
    icon: "Rocket",
    description: "Exponential growth and decay, logarithms and their laws, and the number e.",
    summary:
      "Exponential functions multiply by the same factor every step, and logarithms undo them. These articles explain growth and decay, what a logarithm actually asks, why the log laws mirror the exponent laws, and where the number e comes from.",
  },
  {
    id: "geometry",
    slug: "geometry",
    title: "Geometry",
    icon: "Triangle",
    description: "Angles, triangles, Pythagoras, area and perimeter, circles and pi, volume, distance and the equation of a circle.",
    summary:
      "Geometry measures shapes and space. These articles cover angle facts, why a triangle's angles sum to 180°, the Pythagorean theorem, area, perimeter and volume formulae, circles and the number pi, and how coordinates turn distance and circles into algebra.",
  },
  {
    id: "trigonometry",
    slug: "trigonometry",
    title: "Trigonometry",
    icon: "Compass",
    description: "SOH CAH TOA, radians, the unit circle, sine and cosine graphs, identities and solving trig equations.",
    summary:
      "Trigonometry links angles to lengths. These articles start with sine, cosine and tangent in a right-angled triangle, then move to radians and the unit circle so the functions work for any angle, and finish with their wave-shaped graphs, the key identities and how to solve trig equations.",
  },
  {
    id: "sequences",
    slug: "sequences-and-series",
    title: "Sequences & Series",
    icon: "ListOrdered",
    description: "Arithmetic and geometric sequences, infinite series, sigma notation and the binomial theorem.",
    summary:
      "A sequence is a list that follows a rule, and a series adds one up. These articles cover sequences that add a fixed amount and ones that multiply by a fixed ratio, how an infinite series can have a finite sum, sigma notation, and Pascal's triangle with the binomial theorem.",
  },
  {
    id: "calculus",
    slug: "ready-for-calculus",
    title: "Ready for Calculus",
    icon: "Infinity",
    description: "Rates of change, limits and the derivative: the ideas the whole course builds towards.",
    summary:
      "Everything in Foundations leads here. These articles explain the average rate of change, what a limit means and how to find one, and how the difference quotient turns into the derivative, the central idea of calculus.",
  },
];

const byId = new Map(articleCategories.map((c) => [c.id, c]));
const bySlug = new Map(articleCategories.map((c) => [c.slug, c]));

export const categoryById = (id: ArticleCategoryId): ArticleCategory => byId.get(id)!;
export const categoryBySlug = (slug: string): ArticleCategory | undefined => bySlug.get(slug);
export const categoryPath = (c: ArticleCategory) => `/articles/categories/${c.slug}`;
export const articlePath = (slug: string) => `/articles/${slug}`;
