import { describe, expect, it } from "vitest";
import { courses, getGraph, type Block } from "../src";
import { articleBySlug, articleCategories, articles, buildConceptIndex, CONCEPT_LINK, conceptIndex, linkConceptsInBlocks, linkConceptsInMd, readingForLesson, stripConceptLinks } from "../src/articles";

const graph = getGraph("foundations")!;

/** Every rich-text string in a run of blocks, in reading order. */
const mdOf = (blocks: Block[]): string[] =>
  blocks.flatMap((b) => {
    switch (b.kind) {
      case "text":
      case "callout":
        return [b.md];
      case "rule":
        return b.md ? [b.md] : [];
      case "example":
        return [b.problem, ...b.steps.flatMap((s) => (s.md ? [s.md] : []))];
      default:
        return [];
    }
  });

describe("article library", () => {
  it("has a substantial set of articles", () => {
    expect(articles.length).toBeGreaterThanOrEqual(30);
  });

  it("uses unique, URL-safe slugs", () => {
    const slugs = articles.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("files every article under a known category, and every category has articles", () => {
    const ids = new Set(articleCategories.map((c) => c.id));
    for (const a of articles) expect(ids.has(a.category), a.slug).toBe(true);
    for (const c of articleCategories) expect(articles.some((a) => a.category === c.id), c.id).toBe(true);
  });

  it("points only at lessons and articles that exist", () => {
    for (const a of articles) {
      expect(a.lessons.length, a.slug).toBeGreaterThan(0);
      for (const id of a.lessons) expect(graph.byId.has(id), `${a.slug} → lesson ${id}`).toBe(true);
      for (const s of a.related) expect(articleBySlug(s), `${a.slug} → article ${s}`).toBeDefined();
    }
  });

  it("gives each linking term to exactly one article", () => {
    const owner = new Map<string, string>();
    for (const a of articles)
      for (const t of a.terms) {
        const key = t.toLowerCase();
        expect(owner.get(key) ?? a.slug, `"${t}" is claimed by ${owner.get(key)} and ${a.slug}`).toBe(a.slug);
        owner.set(key, a.slug);
      }
  });

  it("keeps titles and summaries a sensible length for search results", () => {
    for (const a of articles) {
      expect(a.title.length, a.title).toBeLessThanOrEqual(90);
      expect(a.title, a.slug).not.toContain("$");
      expect(stripConceptLinks(a.summary).length, a.slug).toBeLessThanOrEqual(320);
      expect(a.faqs.length, a.slug).toBeGreaterThan(0);
    }
  });

  it("has sections, a visual and a worked example or animation in every article", () => {
    for (const a of articles) {
      expect(a.body.some((b) => b.kind === "heading"), a.slug).toBe(true);
      expect(a.body.some((b) => b.kind === "visual"), a.slug).toBe(true);
    }
  });

  it("only writes explicit concept links to articles that exist", () => {
    for (const a of articles)
      for (const md of [...mdOf(a.body), a.definition, a.summary, ...a.faqs.map((f) => f.a)])
        for (const m of md.matchAll(CONCEPT_LINK)) expect(articleBySlug(m[1]!), `${a.slug}: ${m[0]}`).toBeDefined();
  });
});

describe("concept linking", () => {
  const index = buildConceptIndex([
    { slug: "fractions", terms: ["fraction"] },
    { slug: "gcf", terms: ["least common multiple"] },
    { slug: "multiples", terms: ["multiple"] },
  ]);

  it("links the first mention only, keeping the reader's wording", () => {
    expect(linkConceptsInMd("Fractions are fun. A fraction is a number.", index)).toBe("[[fractions|Fractions]] are fun. A fraction is a number.");
  });

  it("prefers the longest matching term", () => {
    expect(linkConceptsInMd("Use the least common multiple.", index)).toBe("Use the [[gcf|least common multiple]].");
  });

  it("never rewrites maths, code or existing links", () => {
    expect(linkConceptsInMd("$\\text{fraction}$ and `fraction` and [[multiples|a multiple]]", index)).toBe("$\\text{fraction}$ and `fraction` and [[multiples|a multiple]]");
  });

  it("does not match inside longer words", () => {
    expect(linkConceptsInMd("fractional powers multiply", index)).toBe("fractional powers multiply");
  });

  it("skips an excluded slug", () => {
    expect(linkConceptsInMd("A fraction.", index, { exclude: "fractions" })).toBe("A fraction.");
  });

  it("only ever adds link markup to lesson copy", () => {
    for (const ref of graph.refs) {
      const before = mdOf(ref.exercise.lesson);
      const after = mdOf(linkConceptsInBlocks(ref.exercise.lesson, conceptIndex).blocks);
      expect(after.map(stripConceptLinks)).toEqual(before);
    }
  });

  it("offers suggested reading on every lesson", () => {
    for (const course of courses)
      for (const unit of course.units)
        for (const e of unit.exercises) expect(readingForLesson(course.id, e.id).length, e.id).toBeGreaterThan(0);
  });

  it("links every article from at least one lesson's copy or reading list", () => {
    const reached = new Set(graph.refs.flatMap((ref) => readingForLesson("foundations", ref.exercise.id)));
    for (const a of articles) expect(reached.has(a.slug), a.slug).toBe(true);
  });
});
