"use client";

import { buildConceptIndex, type ConceptEntry, type ConceptIndex } from "@fmc/curriculum";
import { createContext, use, useMemo, type ReactNode } from "react";

interface Concepts {
  index: ConceptIndex;
  bySlug: Map<string, ConceptEntry>;
  /** The lesson a reader came from, so an article can offer a way back. */
  from?: string;
}

const ConceptContext = createContext<Concepts | null>(null);

/**
 * Supplies the article catalogue to lesson copy below it. The server sends only the
 * fields a link and its preview card need, never the article bodies.
 */
export function ConceptProvider({ entries, from, children }: { entries: ConceptEntry[]; from?: string; children: ReactNode }) {
  const value = useMemo(() => ({ index: buildConceptIndex(entries), bySlug: new Map(entries.map((e) => [e.slug, e])), from }), [entries, from]);
  return <ConceptContext value={value}>{children}</ConceptContext>;
}

export const useConcepts = () => use(ConceptContext);

export const articleHref = (slug: string, from?: string) => `/articles/${slug}${from ? `?from=${encodeURIComponent(from)}` : ""}`;
