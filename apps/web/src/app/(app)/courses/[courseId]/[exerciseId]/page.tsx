import { courses, getExercise } from "@fmc/curriculum";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ExerciseView } from "@/components/course/exercise-view";
import { Skeleton } from "@/components/ui/skeleton";

type Props = PageProps<"/courses/[courseId]/[exerciseId]">;

export const generateStaticParams = () =>
  courses.flatMap((c) => c.units.flatMap((u) => u.exercises.map((e) => ({ courseId: c.id, exerciseId: e.id }))));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseId, exerciseId } = await params;
  const ref = getExercise(courseId, exerciseId);
  return ref ? { title: ref.exercise.title, description: ref.exercise.summary.replace(/\$/g, "") } : {};
}

async function Exercise({ params }: Pick<Props, "params">) {
  const { courseId, exerciseId } = await params;
  if (!getExercise(courseId, exerciseId)) notFound();
  return <ExerciseView exerciseId={exerciseId} />;
}

export default function ExercisePage({ params }: Props) {
  return (
    <Suspense fallback={<LessonSkeleton />}>
      <Exercise params={params} />
    </Suspense>
  );
}

function LessonSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-14 w-80" />
      <Skeleton className="h-5 w-96 max-w-full" />
      <div className="grid gap-8 pt-6 lg:grid-cols-[1fr_300px]">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  );
}
