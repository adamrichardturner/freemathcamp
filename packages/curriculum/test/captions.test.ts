import { describe, expect, it } from "vitest";
import { courses, type Block, type Visual } from "../src";
import { articles } from "../src/articles";

const placeParts = (n: number) =>
  String(n)
    .split("")
    .map((d, i, s) => Number(d) * 10 ** (s.length - 1 - i))
    .filter(Boolean);

/**
 * Some visuals print their own working under the drawing (the area model's
 * partial products, the percent grid's fraction, the blocks' repeated product).
 * Returns a check that is true when a caption repeats that working.
 */
const repeatsWorking = (v: Visual): ((caption: string) => boolean) | undefined => {
  const nums = (c: string) => new Set(c.match(/\d+(\.\d+)?/g) ?? []);
  switch (v.type) {
    case "areaModel": {
      const products = placeParts(v.a).flatMap((x) => placeParts(v.b).map((y) => String(x * y)));
      return products.length > 1 ? (c) => products.every((p) => nums(c).has(p)) : (c) => nums(c).has(String(v.a * v.b));
    }
    case "percentGrid":
      return (c) => c.replace(/\s/g, "").includes(`frac{${v.percent}}{100}`);
    case "exponentBlocks":
      return (c) => nums(c).has(String(v.base ** v.exponent));
    case "rightTriangle":
      return v.showSquares ? (c) => /\^2\s*\+/.test(c) : undefined;
    default:
      return undefined;
  }
};

const visualBlocks = [
  ...courses.flatMap((c) => c.units.flatMap((u) => u.exercises.flatMap((e) => e.lesson.map((b) => [`${e.id} lesson`, b] as const)))),
  ...articles.flatMap((a) => a.body.map((b) => [`article ${a.slug}`, b] as const)),
].filter((x): x is readonly [string, Extract<Block, { kind: "visual" }>] => x[1].kind === "visual");

describe("visual captions don't repeat the working the visual already shows", () => {
  for (const [where, block] of visualBlocks) {
    const repeats = repeatsWorking(block.visual);
    if (!repeats || !block.caption) continue;
    it(`${where}: ${block.visual.type}`, () => expect(repeats(block.caption!), block.caption).toBe(false));
  }
});
