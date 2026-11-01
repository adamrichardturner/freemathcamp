import type { Course, ExerciseRef } from "@fmc/curriculum";
import { absoluteUrl, AUTHOR, lessonDescription, lessonPath, plainText, SITE } from "./site";

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

/** The library's publication date; bump `dateModified` when articles are revised. */
export const ARTICLES_PUBLISHED = "2026-11-01";

type ArticleLike = { slug: string; title: string; name: string; summary: string; definition: string; keywords: string[] };

export const articleSchema = (a: ArticleLike, section: { title: string; path: string }, extra: { words: number; minutes: number; image: string; lessons: { name: string; path: string }[] }) => ({
  "@type": ["Article", "LearningResource"],
  "@id": absoluteUrl(`/articles/${a.slug}#article`),
  headline: a.title,
  name: a.title,
  alternativeHeadline: a.name,
  description: plainText(a.summary),
  abstract: plainText(a.definition),
  url: absoluteUrl(`/articles/${a.slug}`),
  mainEntityOfPage: absoluteUrl(`/articles/${a.slug}`),
  image: absoluteUrl(extra.image),
  inLanguage: "en-GB",
  isAccessibleForFree: true,
  learningResourceType: "Article",
  educationalLevel: "Beginner to intermediate",
  audience: { "@type": "EducationalAudience", educationalRole: "student" },
  articleSection: section.title,
  keywords: a.keywords.join(", "),
  wordCount: extra.words,
  timeRequired: minutes(extra.minutes),
  datePublished: ARTICLES_PUBLISHED,
  dateModified: ARTICLES_PUBLISHED,
  author: { "@type": "Person", name: AUTHOR.name, url: AUTHOR.portfolioUrl },
  publisher: { "@id": ORG_ID },
  isPartOf: { "@id": SITE_ID },
  about: {
    "@type": "DefinedTerm",
    name: a.name,
    description: plainText(a.definition),
    inDefinedTermSet: { "@type": "DefinedTermSet", name: `${SITE.alternateName} maths glossary`, url: absoluteUrl("/articles") },
  },
  teaches: a.name,
  ...(extra.lessons.length ? { isBasedOn: extra.lessons.map((l) => ({ "@type": "LearningResource", name: l.name, url: absoluteUrl(l.path) })) } : {}),
});

export const articleListSchema = (id: string, name: string, items: { title: string; summary: string; slug: string }[]) => ({
  "@type": "ItemList",
  "@id": absoluteUrl(id),
  name,
  numberOfItems: items.length,
  itemListOrder: "https://schema.org/ItemListOrderAscending",
  itemListElement: items.map((a, i) => ({ "@type": "ListItem", position: i + 1, name: a.title, description: plainText(a.summary), url: absoluteUrl(`/articles/${a.slug}`) })),
});

export const collectionSchema = (path: string, name: string, description: string, listId: string) => ({
  "@type": "CollectionPage",
  "@id": absoluteUrl(path),
  name,
  description,
  url: absoluteUrl(path),
  inLanguage: "en-GB",
  isPartOf: { "@id": SITE_ID },
  publisher: { "@id": ORG_ID },
  mainEntity: { "@id": absoluteUrl(listId) },
});
