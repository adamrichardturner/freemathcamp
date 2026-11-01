import type { Block, Md } from "../core/types";
import type { ConceptEntry } from "./types";

/**
 * A concept link inside rich text: `[[slug|the words shown]]`. The web app renders it
 * as a link with a preview card; plain-text consumers keep just the words.
 */
export const CONCEPT_LINK = /\[\[([a-z0-9-]+)\|([^\]]+)\]\]/g;

/** `[[slug|words]]` → `words`, for meta descriptions and llms.txt. */
export const stripConceptLinks = (md: Md) => md.replace(CONCEPT_LINK, "$2");

/** Text that must never be rewritten: maths, existing links and code. */
const PROTECTED = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\[\[[^\]]+\]\]|`[^`]*`)/;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export interface ConceptIndex {
  pattern: RegExp | null;
  slugByTerm: Map<string, string>;
}

/** Longest terms first, so "least common multiple" wins over "multiple". */
export const buildConceptIndex = (entries: Pick<ConceptEntry, "slug" | "terms">[]): ConceptIndex => {
  const slugByTerm = new Map<string, string>();
  for (const e of entries) for (const t of e.terms) slugByTerm.set(t.toLowerCase(), e.slug);
  const terms = [...slugByTerm.keys()].sort((a, b) => b.length - a.length);
  const pattern = terms.length ? new RegExp(`\\b(${terms.map(escapeRegExp).join("|")})(?:e?s)?\\b`, "gi") : null;
  return { pattern, slugByTerm };
};

export interface LinkOptions {
  /** Slugs already linked earlier on the page; each concept links once, at its first mention. */
  seen?: Set<string>;
  /** Never link to this slug (an article does not link to itself). */
  exclude?: string;
}

export const linkConceptsInMd = (md: Md, index: ConceptIndex, { seen = new Set(), exclude }: LinkOptions = {}): Md => {
  const { pattern } = index;
  if (!pattern) return md;
  return md
    .split(PROTECTED)
    .map((part, i) => {
      if (i % 2 === 1) {
        // An author's explicit link counts as the first mention.
        const explicit = /^\[\[([a-z0-9-]+)\|/.exec(part);
        if (explicit) seen.add(explicit[1]!);
        return part;
      }
      return part.replace(pattern, (match, term: string) => {
        const slug = index.slugByTerm.get(term.toLowerCase());
        if (!slug || slug === exclude || seen.has(slug)) return match;
        seen.add(slug);
        return `[[${slug}|${match}]]`;
      });
    })
    .join("");
};

/**
 * Links the first mention of each concept across a run of blocks, in reading order.
 * Headings, captions and maths are left alone.
 */
export const linkConceptsInBlocks = (blocks: Block[], index: ConceptIndex, options: LinkOptions = {}): { blocks: Block[]; linked: string[] } => {
  const seen = options.seen ?? new Set<string>();
  const before = new Set(seen);
  const link = (md: Md) => linkConceptsInMd(md, index, { seen, exclude: options.exclude });
  const out = blocks.map((b): Block => {
    switch (b.kind) {
      case "text":
        return { ...b, md: link(b.md) };
      case "callout":
        return { ...b, md: link(b.md) };
      case "rule":
        return b.md ? { ...b, md: link(b.md) } : b;
      case "example":
        return { ...b, problem: link(b.problem), steps: b.steps.map((s) => (s.md ? { ...s, md: link(s.md) } : s)) };
      default:
        return b;
    }
  });
  return { blocks: out, linked: [...seen].filter((s) => !before.has(s)) };
};
