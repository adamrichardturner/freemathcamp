import type { Course, ExerciseRef } from "@fmc/curriculum";
import { absoluteUrl, lessonDescription, lessonPath, plainText, SITE } from "./site";

const ORG_ID = `${SITE.url}/#organization`;
const SITE_ID = `${SITE.url}/#website`;

export const organization = {
  "@type": "EducationalOrganization",
  "@id": ORG_ID,
  name: SITE.name,
  alternateName: SITE.alternateName,
  url: SITE.url,
  logo: absoluteUrl("/logo-1024.png"),
  description: SITE.description,
};

export const website = {
  "@type": "WebSite",
  "@id": SITE_ID,
  name: SITE.name,
  alternateName: [SITE.alternateName, "FreeMathCamp — Foundations"],
  url: SITE.url,
  inLanguage: "en",
  publisher: { "@id": ORG_ID },
};

const minutes = (m: number) => `PT${m}M`;

export const courseSchema = (course: Course) => ({
  "@type": "Course",
  "@id": absoluteUrl(`/courses/${course.id}#course`),
  name: `${course.title} — ${SITE.alternateName}`,
  description: plainText(course.description),
  url: absoluteUrl(`/courses/${course.id}`),
  provider: { "@id": ORG_ID },
  isAccessibleForFree: true,
  inLanguage: "en",
  educationalLevel: "Beginner to pre-calculus",
  teaches: course.units.map((u) => u.title),
  coursePrerequisites: "None — the course starts from place value.",
  numberOfCredits: 0,
  offers: { "@type": "Offer", price: 0, priceCurrency: "USD", category: "Free" },
  hasCourseInstance: {
    "@type": "CourseInstance",
    courseMode: "online",
    courseWorkload: minutes(course.units.reduce((a, u) => a + u.exercises.reduce((b, e) => b + e.estimatedMinutes, 0), 0)),
  },
  syllabusSections: course.units.map((u) => ({
    "@type": "Syllabus",
    name: u.title,
    description: plainText(u.description),
    timeRequired: minutes(u.exercises.reduce((a, e) => a + e.estimatedMinutes, 0)),
  })),
});

export const lessonSchema = (ref: ExerciseRef) => ({
  "@type": "LearningResource",
  "@id": absoluteUrl(`${lessonPath(ref)}#lesson`),
  name: ref.exercise.title,
  description: lessonDescription(ref),
  url: absoluteUrl(lessonPath(ref)),
  learningResourceType: ["Lesson", "Practice problems"],
  interactivityType: "mixed",
  educationalLevel: ref.unit.title,
  isAccessibleForFree: true,
  inLanguage: "en",
  timeRequired: minutes(ref.exercise.estimatedMinutes),
  teaches: ref.exercise.keyIdeas.map(plainText),
  competencyRequired: ref.exercise.prerequisites.map((id) => ({
    "@type": "DefinedTerm",
    name: ref.course.units.flatMap((u) => u.exercises).find((e) => e.id === id)?.title ?? id,
    url: absoluteUrl(`/courses/${ref.course.id}/${id}`),
  })),
  isPartOf: { "@id": absoluteUrl(`/courses/${ref.course.id}#course`) },
  provider: { "@id": ORG_ID },
});

export const breadcrumbs = (items: { name: string; path: string }[]) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
});

export const faqSchema = (faqs: { q: string; a: string }[]) => ({
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});

export const graph = (...nodes: Record<string, unknown>[]) => ({ "@context": "https://schema.org", "@graph": nodes });
