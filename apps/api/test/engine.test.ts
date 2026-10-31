import { getGraph } from "@fmc/curriculum";
import { describe, expect, it } from "vitest";
import {
  buildQueues,
  INITIAL_SCHEDULE,
  itemSignal,
  nextLevel,
  nextSchedule,
  sessionQuality,
  updateMastery,
  updateStruggle,
  type ItemOutcome,
  type ProgressSnapshot,
} from "../src/domain/engine";

const outcome = (o: Partial<ItemOutcome> = {}): ItemOutcome => ({
  wrongAttempts: 0,
  revealed: false,
  hintsUsed: 0,
  timeMs: 10_000,
  expectedSeconds: 30,
  level: 2,
  ...o,
});

describe("struggle signal", () => {
  it("is zero for a fast, clean solve", () => {
    const s = itemSignal(outcome());
    expect(s.struggle).toBe(0);
    expect(s.cleanSolve).toBe(true);
  });

  it("weights repeated wrong answers with diminishing increments", () => {
    const [one, two, three] = [1, 2, 3].map((w) => itemSignal(outcome({ wrongAttempts: w })).struggle);
    expect(one).toBeCloseTo(0.5);
    expect(two! - one!).toBeGreaterThan(three! - two!);
  });

  it("penalises slow solves but caps the time penalty", () => {
    const slow = itemSignal(outcome({ timeMs: 120_000 })).struggle;
    const glacial = itemSignal(outcome({ timeMs: 3_600_000 })).struggle;
    expect(slow).toBeGreaterThan(0.3);
    expect(glacial).toBeCloseTo(0.4);
  });

  it("treats revealing the answer as maximal struggle", () => {
    expect(itemSignal(outcome({ revealed: true })).struggle).toBe(1);
  });

  it("EWMA reacts fully to the first item, then smooths", () => {
    expect(updateStruggle(0, 0, 0.8)).toBeCloseTo(0.8);
    expect(updateStruggle(0.8, 10, 0)).toBeCloseTo(0.56);
  });
});

describe("mastery (BKT)", () => {
  it("rises with clean solves and falls with failures", () => {
    let m = 0.15;
    for (let i = 0; i < 3; i++) m = updateMastery({ previous: m, signal: itemSignal(outcome()), level: 2, multipleChoice: false });
    // Three easy wins are encouraging, not proof of mastery.
    expect(m).toBeLessThan(0.8);
    for (let i = 0; i < 3; i++) m = updateMastery({ previous: m, signal: itemSignal(outcome()), level: 2, multipleChoice: false });
    expect(m).toBeGreaterThan(0.85);
    const after = updateMastery({ previous: m, signal: itemSignal(outcome({ revealed: true })), level: 2, multipleChoice: false });
    expect(after).toBeLessThan(m);
  });

  it("gives less credit for guessable multiple choice", () => {
    const sig = itemSignal(outcome());
    const numeric = updateMastery({ previous: 0.3, signal: sig, level: 1, multipleChoice: false });
    const choice = updateMastery({ previous: 0.3, signal: sig, level: 1, multipleChoice: true });
    expect(numeric).toBeGreaterThan(choice);
  });
});

describe("scheduling", () => {
  it("expands intervals after good sessions and resets after poor ones", () => {
    let s = INITIAL_SCHEDULE;
    s = nextSchedule(s, 5);
    expect(s.intervalDays).toBe(1);
    s = nextSchedule(s, 5);
    expect(s.intervalDays).toBe(3);
    s = nextSchedule(s, 4);
    expect(s.intervalDays).toBeGreaterThan(6);
    expect(nextSchedule(s, 1).intervalDays).toBe(1);
  });

  it("grades sessions from accuracy and struggle", () => {
    expect(sessionQuality(1, 0)).toBe(5);
    expect(sessionQuality(0.2, 0.9)).toBeLessThan(3);
  });
});

describe("difficulty staircase", () => {
  it("steps up after two clean solves and down after a struggle", () => {
    const clean = itemSignal(outcome({ timeMs: 5_000 }));
    expect(nextLevel(1, [clean, clean])).toBe(2);
    expect(nextLevel(3, [itemSignal(outcome({ revealed: true }))])).toBe(2);
    expect(nextLevel(1, [itemSignal(outcome({ revealed: true }))])).toBe(1);
  });
});

describe("queues", () => {
  const graph = getGraph("foundations")!;
  const now = new Date("2026-10-31T12:00:00Z");
  const snap = (exerciseId: string, p: Partial<ProgressSnapshot>): ProgressSnapshot => ({
    exerciseId,
    mastery: 0.9,
    struggle: 0.1,
    itemsSeen: 6,
    sessionsCompleted: 1,
    intervalDays: 3,
    dueAt: new Date(now.getTime() + 3 * 86_400_000),
    lastPracticedAt: now,
    ...p,
  });

  it("waits for several problems before calling something a struggle", () => {
    const early = buildQueues(graph, new Map([["place-value", snap("place-value", { itemsSeen: 1, struggle: 0.5, mastery: 0.12, sessionsCompleted: 0, dueAt: null })]]), now);
    expect(early.challenge).toHaveLength(0);
  });

  it("recommends prerequisite-free lessons to a new learner", () => {
    const q = buildQueues(graph, new Map(), now);
    expect(q.next[0]!.exerciseId).toBe("place-value");
    expect(q.review).toHaveLength(0);
    expect(q.plan.length).toBeGreaterThan(0);
  });

  it("surfaces due reviews, challenges with brush-up prerequisites, and ready next steps", () => {
    const progress = new Map([
      ["place-value", snap("place-value", { dueAt: new Date(now.getTime() - 2 * 86_400_000), lastPracticedAt: new Date(now.getTime() - 5 * 86_400_000) })],
      ["add-subtract", snap("add-subtract", {})],
      ["multiplication", snap("multiplication", { mastery: 0.3, struggle: 0.7 })],
    ]);
    const q = buildQueues(graph, progress, now);
    expect(q.review.map((r) => r.exerciseId)).toContain("place-value");
    const ch = q.challenge.find((r) => r.exerciseId === "multiplication");
    expect(ch).toBeDefined();
    expect(q.next.map((r) => r.exerciseId)).toContain("negative-numbers");
    expect(q.plan.map((r) => r.kind)).toEqual(expect.arrayContaining(["review", "challenge", "next"]));
  });
});
