import { courses, getCourse } from "@fmc/curriculum";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CourseMap } from "@/components/course/course-map";

export const generateStaticParams = () => courses.map((c) => ({ courseId: c.id }));

export async function generateMetadata({ params }: PageProps<"/courses/[courseId]">): Promise<Metadata> {
  const course = getCourse((await params).courseId);
  return course ? { title: course.title, description: course.tagline } : {};
}

export default async function CoursePage({ params }: PageProps<"/courses/[courseId]">) {
  if (!getCourse((await params).courseId)) notFound();
  return <CourseMap />;
}
