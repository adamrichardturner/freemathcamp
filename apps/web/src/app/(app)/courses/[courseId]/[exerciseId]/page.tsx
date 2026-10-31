import { courses, getExercise } from "@fmc/curriculum";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ExerciseView } from "@/components/course/exercise-view";

export const generateStaticParams = () =>
  courses.flatMap((c) => c.units.flatMap((u) => u.exercises.map((e) => ({ courseId: c.id, exerciseId: e.id }))));

export async function generateMetadata({ params }: PageProps<"/courses/[courseId]/[exerciseId]">): Promise<Metadata> {
  const { courseId, exerciseId } = await params;
  const ref = getExercise(courseId, exerciseId);
  return ref ? { title: ref.exercise.title, description: ref.exercise.summary.replace(/\$/g, "") } : {};
}

export default async function ExercisePage({ params }: PageProps<"/courses/[courseId]/[exerciseId]">) {
  const { courseId, exerciseId } = await params;
  if (!getExercise(courseId, exerciseId)) notFound();
  return (
    <Suspense>
      <ExerciseView exerciseId={exerciseId} />
    </Suspense>
  );
}
