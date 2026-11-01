import { describe, expect, it } from "vitest";
import { checkAnswer, courses, createRng, evaluate, generateProblem, getGraph, unlockedLessons, type Answer, type Level } from "../src";

/** The text a perfect learner would type for an answer. */
const idealInput = (a: Answer): string => {
  switch (a.kind) {
    case "choice":
      return `${a.correct}`;
    case "number":
      return `${a.value}`;
    case "set":
    case "tuple":
      return a.values.join(", ");
  }
};

describe("answer evaluation", () => {
  it.each([
    ["3/4", 0.75],
    ["-2.5", -2.5],
    ["1 1/2", 1.5],
    ["2sqrt(3)", 2 * Math.sqrt(3)],
    ["2√3", 2 * Math.sqrt(3)],
    ["pi/4", Math.PI / 4],
    ["x = 7", 7],
    ["−3", -3],
    ["2^10", 1024],
    ["3(4+1)", 15],
    ["1,000", 1000],
  ])("evaluates %s", (input, expected) => {
    expect(evaluate(input)).toBeCloseTo(expected, 9);
  });

  it("rejects junk and code", () => {
    expect(evaluate("alert(1)")).toBeNull();
    expect(evaluate("")).toBeNull();
    expect(evaluate("2+")).toBeNull();
  });

  it("enforces simplest form when asked", () => {
    const a: Answer = { kind: "number", value: 0.75, requireSimplest: true };
    expect(checkAnswer(a, "3/4").correct).toBe(true);
    expect(checkAnswer(a, "6/8").correct).toBe(false);
  });

  it("checks unordered sets and ordered tuples", () => {
    expect(checkAnswer({ kind: "set", values: [2, -3] }, "-3, 2").correct).toBe(true);
    expect(checkAnswer({ kind: "tuple", values: [2, -3] }, "(-3, 2)").correct).toBe(false);
    expect(checkAnswer({ kind: "tuple", values: [2, -3] }, "(2, -3)").correct).toBe(true);
  });
});

describe.each(courses)("course $id", (course) => {
  const graph = getGraph(course.id)!;

  it("has a valid acyclic prerequisite graph", () => {
    expect(graph.refs.length).toBeGreaterThan(50);
  });

  it("every exercise has lesson content and key ideas", () => {
    for (const { exercise } of graph.refs) {
      expect(exercise.lesson.length, exercise.id).toBeGreaterThan(1);
      expect(exercise.keyIdeas.length, exercise.id).toBeGreaterThan(0);
    }
  });

  it("every generator is deterministic and self-consistent at every level", () => {
    for (const ref of graph.refs)
      for (const level of [1, 2, 3] as Level[])
        for (let seed = 1; seed <= 60; seed++) {
          const p = generateProblem(ref, seed, level);
          const id = `${ref.exercise.id} L${level} seed ${seed}`;
          expect(JSON.stringify(generateProblem(ref, seed, level).answer), id).toBe(JSON.stringify(p.answer));
          if (p.answer.kind === "choice") {
            expect(p.choices?.length, id).toBeGreaterThanOrEqual(2);
            expect(new Set(p.choices).size, `${id} duplicate choices`).toBe(p.choices!.length);
          } else {
            const values = p.answer.kind === "number" ? [p.answer.value] : p.answer.values;
            for (const v of values) expect(Number.isFinite(v), `${id} non-finite answer`).toBe(true);
          }
          expect(checkAnswer(p.answer, idealInput(p.answer)).correct, id).toBe(true);
          expect(p.prompt.length, id).toBeGreaterThan(0);
          expect(p.prompt, id).not.toMatch(/undefined|NaN/);
          expect(p.tex ?? "", id).not.toMatch(/undefined|NaN/);
        }
  });

  it("rng is stable", () => {
    expect(createRng(42).next()).toBe(createRng(42).next());
  });
});

describe("lesson access", () => {
  const graph = getGraph("foundations")!;
  const [first, second, third] = graph.refs.map((r) => r.exercise.id);
  const done = { itemsSeen: 6, sessionsCompleted: 1 };

  it("opens lessons in order in path mode", () => {
    expect([...unlockedLessons(graph, "path", () => undefined)]).toEqual([first]);
    const open = unlockedLessons(graph, "path", (id) => (id === first ? done : undefined));
    expect(open.has(second!)).toBe(true);
    expect(open.has(third!)).toBe(false);
  });

  it("keeps started lessons open and opens everything in audit mode", () => {
    expect(unlockedLessons(graph, "path", (id) => (id === third ? { itemsSeen: 2, sessionsCompleted: 0 } : undefined)).has(third!)).toBe(true);
    expect(unlockedLessons(graph, "audit", () => undefined).size).toBe(graph.refs.length);
  });
});
