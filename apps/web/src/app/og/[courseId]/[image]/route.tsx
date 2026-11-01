import { courses, getExercise } from "@fmc/curriculum";
import { notFound } from "next/navigation";
import { lessonImage } from "@/lib/og";

// One image per lesson, rendered at build time, served as /og/<course>/<lesson>.png.
export const generateStaticParams = () =>
  courses.flatMap((c) => c.units.flatMap((u) => u.exercises.map((e) => ({ courseId: c.id, image: `${e.id}.png` }))));

export async function GET(_req: Request, { params }: RouteContext<"/og/[courseId]/[image]">) {
  const { courseId, image } = await params;
  const exerciseId = image.replace(/\.png$/, "");
  if (exerciseId === image || !getExercise(courseId, exerciseId)) notFound();
  return lessonImage(courseId, exerciseId);
}
