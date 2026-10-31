import type { Course, ExerciseRef } from "./types";

/** Indexed, validated view of a course's prerequisite graph. */
export interface CourseGraph {
  course: Course;
  refs: ExerciseRef[];
  byId: Map<string, ExerciseRef>;
  /** exercise id → ids of exercises that list it as a prerequisite. */
  dependents: Map<string, string[]>;
}

export const buildGraph = (course: Course): CourseGraph => {
  const refs: ExerciseRef[] = [];
  const byId = new Map<string, ExerciseRef>();
  for (const unit of course.units)
    for (const exercise of unit.exercises) {
      if (byId.has(exercise.id)) throw new Error(`Duplicate exercise id "${exercise.id}"`);
      const ref = { exercise, unit, course, order: refs.length };
      refs.push(ref);
      byId.set(exercise.id, ref);
    }

  const dependents = new Map<string, string[]>(refs.map((r) => [r.exercise.id, []]));
  for (const { exercise } of refs)
    for (const pre of exercise.prerequisites) {
      if (!byId.has(pre)) throw new Error(`"${exercise.id}" lists unknown prerequisite "${pre}"`);
      dependents.get(pre)!.push(exercise.id);
    }

  assertAcyclic(refs, byId);
  return { course, refs, byId, dependents };
};

const assertAcyclic = (refs: ExerciseRef[], byId: Map<string, ExerciseRef>) => {
  const state = new Map<string, "visiting" | "done">();
  const visit = (id: string, path: string[]) => {
    const s = state.get(id);
    if (s === "done") return;
    if (s === "visiting") throw new Error(`Prerequisite cycle: ${[...path, id].join(" → ")}`);
    state.set(id, "visiting");
    for (const pre of byId.get(id)!.exercise.prerequisites) visit(pre, [...path, id]);
    state.set(id, "done");
  };
  for (const r of refs) visit(r.exercise.id, []);
};

/** All transitive prerequisites, nearest first (breadth-first). */
export const ancestors = (graph: CourseGraph, id: string): string[] => {
  const seen = new Set<string>();
  const queue = [...(graph.byId.get(id)?.exercise.prerequisites ?? [])];
  const out: string[] = [];
  while (queue.length) {
    const next = queue.shift()!;
    if (seen.has(next)) continue;
    seen.add(next);
    out.push(next);
    queue.push(...graph.byId.get(next)!.exercise.prerequisites);
  }
  return out;
};

/** Number of exercises that (transitively) build on this one. */
export const unlockWeight = (graph: CourseGraph, id: string): number => {
  const seen = new Set<string>();
  const stack = [...(graph.dependents.get(id) ?? [])];
  while (stack.length) {
    const next = stack.pop()!;
    if (seen.has(next)) continue;
    seen.add(next);
    stack.push(...(graph.dependents.get(next) ?? []));
  }
  return seen.size;
};
