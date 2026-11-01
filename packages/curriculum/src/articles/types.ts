import type { Block, Md } from "../core/types";

export type ArticleCategoryId =
  | "number"
  | "fractions"
  | "ratio"
  | "powers"
  | "algebra"
  | "graphs"
  | "polynomials"
  | "exponentials"
  | "geometry"
  | "trigonometry"
  | "sequences"
  | "calculus";

export interface ArticleCategory {
  id: ArticleCategoryId;
  /** Used in URLs: /articles/categories/<slug>. */
  slug: string;
  title: string;
  /** One sentence for cards and meta descriptions. */
  description: string;
  /** A short paragraph for the category page. */
  summary: string;
  /** Lucide icon name, as for units. */
  icon: string;
}

export interface ArticleFaq {
  q: string;
  a: Md;
}

/** Everything about an article except its body: small enough to send to every lesson page. */
export interface ArticleMeta {
  slug: string;
  /** The page title: phrased the way people search for the idea. */
  title: string;
  /** The concept's own name, for tooltips and tight spaces. */
  name: string;
  category: ArticleCategoryId;
  /** One plain sentence defining the idea. The tooltip leads with it. */
  definition: Md;
  /** Two or three sentences on what the article covers. Also the meta description. */
  summary: Md;
  keywords: string[];
  /**
   * Phrases that link to this article where lesson copy mentions them.
   * Matched whole-word and case-insensitively; a trailing "s" or "es" also matches.
   */
  terms: string[];
  /** Lesson ids this article supports, most relevant first. */
  lessons: string[];
  /** Other articles worth reading next. */
  related: string[];
}

export interface Article extends ArticleMeta {
  body: Block[];
  faqs: ArticleFaq[];
}

/** The fields a tooltip or link needs. */
export type ConceptEntry = Pick<ArticleMeta, "slug" | "title" | "name" | "category" | "definition" | "summary" | "terms">;
