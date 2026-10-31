import { courses, getCourse } from "@fmc/curriculum";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CourseMap } from "@/components/course/course-map";
import { Skeleton } from "@/components/ui/skeleton";

type Props = PageProps<"/courses/[courseId]">;

export const generateStaticParams = () => courses.map((c) => ({ courseId: c.id }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = getCourse((await params).courseId);
  return course ? { title: course.title, description: course.tagline } : {};
}

async function Course({ params }: Pick<Props, "params">) {
  if (!getCourse((await params).courseId)) notFound();
  return <CourseMap />;
}

export default function CoursePage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-72 rounded-3xl" />}>
      <Course params={params} />
    </Suspense>
  );
}
