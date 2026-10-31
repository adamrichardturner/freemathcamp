import { getCourse, getExercise, getGraph } from "@fmc/curriculum";

export const COURSE_ID = "foundations";

export const course = getCourse(COURSE_ID)!;
export const graph = getGraph(COURSE_ID)!;
export const exerciseRef = (id: string) => getExercise(COURSE_ID, id);
export const exerciseTitle = (id: string) => exerciseRef(id)?.exercise.title ?? id;
export const lessonHref = (id: string) => `/courses/${COURSE_ID}/${id}`;
