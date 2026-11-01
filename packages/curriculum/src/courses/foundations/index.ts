import type { Course } from "../../core/types";
import { algebra } from "./units/algebra";
import { arithmetic } from "./units/arithmetic";
import { calculusReady } from "./units/calculus-ready";
import { decimals } from "./units/decimals";
import { exponentials } from "./units/exponentials";
import { exponents } from "./units/exponents";
import { fractions } from "./units/fractions";
import { functionsUnit } from "./units/functions";
import { geometry } from "./units/geometry";
import { integers } from "./units/integers";
import { linearUnit } from "./units/linear";
import { polynomials } from "./units/polynomials";
import { ratios } from "./units/ratios";
import { sequences } from "./units/sequences";
import { trigonometry } from "./units/trigonometry";

export const foundations: Course = {
  id: "foundations",
  title: "Foundations",
  tagline: "Everything you need before calculus.",
  description:
    "From place value to your first limits: a complete, connected path through arithmetic, algebra, functions, geometry and trigonometry, ending with the ideas calculus is built on. Every lesson links to the ideas it builds on.",
  units: [arithmetic, integers, fractions, decimals, ratios, exponents, algebra, linearUnit, functionsUnit, polynomials, exponentials, geometry, trigonometry, sequences, calculusReady],
};
