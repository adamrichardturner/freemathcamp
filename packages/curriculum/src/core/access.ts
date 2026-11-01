import type { CourseGraph } from "./graph";

/** Path mode walks the course in order; audit mode opens every lesson. */
export type LearningMode = "path" | "audit";
export const LEARNING_MODES: readonly LearningMode[] = ["path", "audit"];

/** The slice of a learner's progress that decides access. */
export interface LessonProgress {
  itemsSeen: number;
  sessionsCompleted: number;
}

/** A lesson counts as complete once one practice session on it has been finished. */
export const isLessonComplete = (p: LessonProgress | undefined) => !!p && p.sessionsCompleted > 0;

/**
 * Lessons the learner may open. In path mode the first lesson is open and each
 * later one opens when the lesson before it is complete. Anything already
 * started stays open, so switching back from audit mode never takes work away.
 */
export const unlockedLessons = (graph: CourseGraph, mode: LearningMode, progressOf: (id: string) => LessonProgress | undefined): Set<string> => {
  if (mode === "audit") return new Set(graph.refs.map((r) => r.exercise.id));
  const open = new Set<string>();
  graph.refs.forEach((ref, i) => {
    const id = ref.exercise.id;
    const p = progressOf(id);
    const prev = graph.refs[i - 1];
    if (i === 0 || (p && p.itemsSeen > 0) || isLessonComplete(prev && progressOf(prev.exercise.id))) open.add(id);
  });
  return open;
};

/** The lesson that has to be completed to open `id` in path mode. */
export const unlockedBy = (graph: CourseGraph, id: string) => {
  const ref = graph.byId.get(id);
  return ref && ref.order > 0 ? graph.refs[ref.order - 1] : undefined;
};
