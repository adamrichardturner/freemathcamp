import type { Article } from "./types";

/** Identity, for type checking and trimming the summary's stray whitespace. */
export const article = (a: Article): Article => ({ ...a, summary: a.summary.trim() });
