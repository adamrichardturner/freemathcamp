import { courses, getCourse } from "@fmc/curriculum";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CourseMap } from "@/components/course/course-map";
import { PageSpinner } from "@/components/ui/spinner";
import { JsonLd } from "@/components/seo/json-ld";
import { ogImagePath, shareImage, SITE_IMAGE_ALT } from "@/lib/og";
import { breadcrumbs, courseSchema, graph } from "@/lib/structured-data";

type Props = PageProps<"/courses/[courseId]">;

export const generateStaticParams = () => courses.map((c) => ({ courseId: c.id }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = getCourse((await params).courseId);
  if (!course) return {};
  const lessons = course.units.reduce((a, u) => a + u.exercises.length, 0);
  const description = `${course.tagline} ${lessons} free lessons across ${course.units.length} units — ${course.units.map((u) => u.title).join(", ")}. Interactive visuals and adaptive practice from FreeMathCamp.`;
  const share = shareImage(ogImagePath(), SITE_IMAGE_ALT);
  return {
    title: `${course.title}: Free Pre-Calculus Math Course`,
    description,
    alternates: { canonical: `/courses/${course.id}` },
    // Setting openGraph replaces the inherited object, so name the site share image explicitly.
    openGraph: {
      title: `${course.title} — FreeMathCamp`,
      description,
      url: `/courses/${course.id}`,
      ...share.openGraph,
    },
    twitter: { ...share.twitter, title: `${course.title} — FreeMathCamp`, description },
  };
}

async function Course({ params }: Pick<Props, "params">) {
  const course = getCourse((await params).courseId);
  if (!course) notFound();
  return (
    <>
      <JsonLd data={graph(courseSchema(course), breadcrumbs([{ name: "FreeMathCamp", path: "/" }, { name: course.title, path: `/courses/${course.id}` }]))} />
      <CourseMap />
    </>
  );
}

export default function CoursePage({ params }: Props) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <Course params={params} />
    </Suspense>
  );
}
