import { courses, getCourse } from "@fmc/curriculum";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CourseMap } from "@/components/course/course-map";
import { JsonLd } from "@/components/seo/json-ld";
import { ogImagePath, shareImage, SITE_IMAGE_ALT } from "@/lib/og";
import { breadcrumbs, courseSchema, graph } from "@/lib/structured-data";
import { Skeleton } from "@/components/ui/skeleton";

type Props = PageProps<"/courses/[courseId]">;

export const generateStaticParams = () => courses.map((c) => ({ courseId: c.id }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = getCourse((await params).courseId);
  if (!course) return {};
  const lessons = course.units.reduce((a, u) => a + u.exercises.length, 0);
  const description = `${course.tagline} ${lessons} free lessons across ${course.units.length} units — ${course.units.map((u) => u.title).join(", ")}. Interactive visuals and adaptive practice from Free Math Camp.`;
  const share = shareImage(ogImagePath(), SITE_IMAGE_ALT);
  return {
    title: `${course.title}: Free Pre-Calculus Math Course`,
    description,
    alternates: { canonical: `/courses/${course.id}` },
    // Setting openGraph replaces the inherited object, so name the site share image explicitly.
    openGraph: {
      title: `${course.title} — Free Math Camp`,
      description,
      url: `/courses/${course.id}`,
      ...share.openGraph,
    },
    twitter: { ...share.twitter, title: `${course.title} — Free Math Camp`, description },
  };
}

async function Course({ params }: Pick<Props, "params">) {
  const course = getCourse((await params).courseId);
  if (!course) notFound();
  return (
    <>
      <JsonLd data={graph(courseSchema(course), breadcrumbs([{ name: "Free Math Camp", path: "/" }, { name: course.title, path: `/courses/${course.id}` }]))} />
      <CourseMap />
    </>
  );
}

export default function CoursePage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-72 rounded-3xl" />}>
      <Course params={params} />
    </Suspense>
  );
}
