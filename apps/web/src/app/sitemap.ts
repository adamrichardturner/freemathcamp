import type { MetadataRoute } from "next";
import { getGraph } from "@fmc/curriculum";
import { articleCategories, articles, categoryPath } from "@fmc/curriculum/articles";
import { absoluteUrl, allCourses, lessonPath } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lessons = allCourses.flatMap((c) =>
    getGraph(c.id)!.refs.map((ref) => ({ url: absoluteUrl(lessonPath(ref)), changeFrequency: "monthly" as const, priority: 0.7 })),
  );
  return [
    { url: absoluteUrl("/"), changeFrequency: "weekly", priority: 1 },
    ...allCourses.map((c) => ({ url: absoluteUrl(`/courses/${c.id}`), changeFrequency: "weekly" as const, priority: 0.9 })),
    ...lessons,
    { url: absoluteUrl("/articles"), changeFrequency: "weekly", priority: 0.8 },
    ...articleCategories.map((c) => ({ url: absoluteUrl(categoryPath(c)), changeFrequency: "monthly" as const, priority: 0.6 })),
    ...articles.map((a) => ({ url: absoluteUrl(`/articles/${a.slug}`), changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: absoluteUrl("/register"), changeFrequency: "yearly", priority: 0.4 },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/terms"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/llms.txt"), changeFrequency: "monthly", priority: 0.3 },
  ];
}
