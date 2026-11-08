import { courses, getExercise } from "@fmc/curriculum";
import { conceptEntries, readingForLesson } from "@fmc/curriculum/articles";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ConceptProvider } from "@/components/articles/concepts";
import { ExerciseView } from "@/components/course/exercise-view";
import { JsonLd } from "@/components/seo/json-ld";
import { ogImagePath, shareImage } from "@/lib/og";
import { lessonDescription, lessonPath } from "@/lib/site";
import { breadcrumbs, graph, lessonSchema } from "@/lib/structured-data";
import { PageSpinner } from "@/components/ui/spinner";

type Props = PageProps<"/courses/[courseId]/[exerciseId]">;

export const generateStaticParams = () =>
  courses.flatMap((c) => c.units.flatMap((u) => u.exercises.map((e) => ({ courseId: c.id, exerciseId: e.id }))));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseId, exerciseId } = await params;
  const ref = getExercise(courseId, exerciseId);
  if (!ref) return {};
  const description = lessonDescription(ref);
  const title = `${ref.exercise.title} · FreeMathCamp`;
  const share = shareImage(ogImagePath(courseId, exerciseId), `${ref.exercise.title}: a free lesson from FreeMathCamp`);
  return {
    title: `${ref.exercise.title} — Free ${ref.unit.title} Lesson`,
    description,
    alternates: { canonical: lessonPath(ref) },
    openGraph: { type: "article", title, description, url: lessonPath(ref), section: ref.unit.title, ...share.openGraph },
    twitter: { ...share.twitter, title, description },
  };
}

async function Exercise({ params }: Pick<Props, "params">) {
  const { courseId, exerciseId } = await params;
  const ref = getExercise(courseId, exerciseId);
  if (!ref) notFound();
  const entries = conceptEntries();
  const reading = readingForLesson(courseId, exerciseId).flatMap((slug) => entries.filter((e) => e.slug === slug));
  return (
    <>
      <JsonLd
        data={graph(
          lessonSchema(ref),
          breadcrumbs([
            { name: "FreeMathCamp", path: "/" },
            { name: ref.course.title, path: `/courses/${ref.course.id}` },
            { name: ref.exercise.title, path: lessonPath(ref) },
          ]),
        )}
      />
      <ConceptProvider entries={entries} from={exerciseId}>
        <ExerciseView exerciseId={exerciseId} reading={reading} />
      </ConceptProvider>
    </>
  );
}

export default function ExercisePage({ params }: Props) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Exercise params={params} />
    </Suspense>
  );
}
