import { buildGraph, type CourseGraph } from "./core/graph";
import { createRng } from "./core/rng";
import type { Course, ExerciseRef, Level, Problem } from "./core/types";
import { foundations } from "./courses/foundations";

export * from "./core/access";
export * from "./core/answers";
export * from "./core/graph";
export * from "./core/rng";
export type * from "./core/types";

export const courses: Course[] = [foundations];

const graphs = new Map<string, CourseGraph>(courses.map((c) => [c.id, buildGraph(c)]));

export const getCourse = (courseId: string): Course | undefined => graphs.get(courseId)?.course;

export const getGraph = (courseId: string): CourseGraph | undefined => graphs.get(courseId);

export const getExercise = (courseId: string, exerciseId: string): ExerciseRef | undefined =>
  graphs.get(courseId)?.byId.get(exerciseId);

/** Deterministically regenerates a problem; the server uses this to grade. */
export const generateProblem = (ref: ExerciseRef, seed: number, level: Level): Problem =>
  ref.exercise.generate(createRng(seed), level);
