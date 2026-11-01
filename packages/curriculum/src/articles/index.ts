import { getGraph } from "../index";
import { articleCategories } from "./categories";
import { algebra } from "./content/algebra";
import { calculus } from "./content/calculus";
import { exponentials } from "./content/exponentials";
import { fractions } from "./content/fractions";
import { geometry } from "./content/geometry";
import { graphs } from "./content/graphs";
import { number } from "./content/number";
import { polynomials } from "./content/polynomials";
import { powers } from "./content/powers";
import { ratio } from "./content/ratio";
import { sequences } from "./content/sequences";
import { trigonometry } from "./content/trigonometry";
import { buildConceptIndex, linkConceptsInBlocks } from "./link";
import type { Article, ArticleCategoryId, ArticleMeta, ConceptEntry } from "./types";

/**
 * The full article library, bodies included. Kept behind its own entry point
 * (`@fmc/curriculum/articles`) so lesson pages don't ship every article's text.
 */
export const articles: Article[] = [...number, ...fractions, ...ratio, ...powers, ...algebra, ...graphs, ...polynomials, ...exponentials, ...geometry, ...trigonometry, ...sequences, ...calculus];

const bySlug = new Map(articles.map((a) => [a.slug, a]));

export const articleBySlug = (slug: string): Article | undefined => bySlug.get(slug);

export const articlesInCategory = (id: ArticleCategoryId): Article[] => articles.filter((a) => a.category === id);

export const articleSections = () => articleCategories.map((category) => ({ category, articles: articlesInCategory(category.id) }));

export const toMeta = ({ body: _body, faqs: _faqs, ...meta }: Article): ArticleMeta => meta;

/** What lesson and article pages send to the browser for linking and preview cards. */
export const conceptEntries = (): ConceptEntry[] =>
  articles.map(({ slug, title, name, category, definition, summary, terms }) => ({ slug, title, name, category, definition, summary, terms }));

export const conceptIndex = buildConceptIndex(articles);

/**
 * Suggested reading for a lesson: the articles written for it first, then every
 * other concept its copy links to, in the order they appear.
 */
export const readingForLesson = (courseId: string, exerciseId: string): string[] => {
  const ref = getGraph(courseId)?.byId.get(exerciseId);
  if (!ref) return [];
  const primary = articles.filter((a) => a.lessons.includes(exerciseId)).sort((a, b) => a.lessons.indexOf(exerciseId) - b.lessons.indexOf(exerciseId));
  const { linked } = linkConceptsInBlocks(ref.exercise.lesson, conceptIndex);
  return [...new Set([...primary.map((a) => a.slug), ...linked])];
};

/** Related reading for an article: its own picks, then articles its body links to. */
export const readingForArticle = (slug: string): string[] => {
  const a = bySlug.get(slug);
  if (!a) return [];
  const { linked } = linkConceptsInBlocks(a.body, conceptIndex, { exclude: slug });
  return [...new Set([...a.related, ...linked])].filter((s) => s !== slug && bySlug.has(s));
};

export * from "./categories";
export * from "./link";
export type * from "./types";
