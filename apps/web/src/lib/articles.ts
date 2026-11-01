import { categoryById, categoryPath, stripConceptLinks, type Article, type Block } from "@fmc/curriculum";
import { exerciseRef, lessonHref } from "./course";
import { plainText } from "./site";

/** Plain text of a block, for word counts and llms-full.txt. */
export const blockPlainText = (b: Block): string => {
  const t = (md: string) => plainText(stripConceptLinks(md));
  switch (b.kind) {
    case "text":
      return t(b.md);
    case "heading":
      return b.text;
    case "math":
      return `${t(`$${b.tex}$`)}${b.caption ? ` (${t(b.caption)})` : ""}`;
    case "rule":
      return `${b.name}: ${t(`$${b.tex}$`)}${b.md ? `. ${t(b.md)}` : ""}`;
    case "callout":
      return `${b.title ? `${b.title}: ` : ""}${t(b.md)}`;
    case "example":
      return [`Worked example: ${t(b.problem)}`, ...b.steps.map((s, i) => `${i + 1}. ${[s.md && t(s.md), s.tex && t(`$${s.tex}$`)].filter(Boolean).join(" ")}`)].join("\n");
    case "visual":
      return b.caption ? t(b.caption) : "";
  }
};

export const articleWords = (a: Article) =>
  [a.definition, ...a.body.map(blockPlainText), ...a.faqs.flatMap((f) => [f.q, f.a])].join(" ").split(/\s+/).filter(Boolean).length;

/** Reading time at a gentle 180 words a minute, plus a little for each visual. */
export const readingMinutes = (a: Article) => Math.max(2, Math.round(articleWords(a) / 180 + a.body.filter((b) => b.kind === "visual").length * 0.3));

export const articleDescription = (a: Pick<Article, "summary">) => plainText(stripConceptLinks(a.summary)).slice(0, 300);

export const articleLessons = (a: Pick<Article, "lessons">) =>
  a.lessons.flatMap((id) => {
    const ref = exerciseRef(id);
    return ref ? [{ id, name: ref.exercise.title, unit: ref.unit.title, path: lessonHref(id) }] : [];
  });

export const articleSection = (a: Pick<Article, "category">) => {
  const c = categoryById(a.category);
  return { ...c, path: categoryPath(c) };
};

export const articleImagePath = (slug: string) => `/og/articles/${slug}.png`;
