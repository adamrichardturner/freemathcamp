"use client";

import { Fragment, memo, type ReactNode } from "react";
import { ConceptLink } from "@/components/articles/concept-link";
import { cn } from "@/lib/utils";
import { Tex } from "./tex";

/**
 * Tiny renderer for curriculum rich text: $inline$, $$display$$, **bold**,
 * *italic*, [[article-slug|concept links]] and blank-line paragraphs. Content
 * is trusted (it ships with the app) but is still rendered as React nodes,
 * never raw HTML.
 */
const INLINE = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\[\[[a-z0-9-]+\|[^\]]+\]\]|\*\*[^*]+\*\*|\*[^*\n]+\*)/g;

const renderInline = (text: string): ReactNode[] =>
  text.split(INLINE).map((part, i) => {
    if (!part) return null;
    if (part.startsWith("$$")) return <Tex key={i} tex={part.slice(2, -2)} display />;
    if (part.startsWith("$")) return <Tex key={i} tex={part.slice(1, -1)} />;
    if (part.startsWith("[[")) {
      const bar = part.indexOf("|");
      return (
        <ConceptLink key={i} slug={part.slice(2, bar)}>
          {renderInline(part.slice(bar + 1, -2))}
        </ConceptLink>
      );
    }
    if (part.startsWith("**")) return <strong key={i} className="font-semibold text-foreground">{renderInline(part.slice(2, -2))}</strong>;
    if (part.startsWith("*") && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });

export const Md = memo(function Md({ md, className, inline = false }: { md: string; className?: string; inline?: boolean }) {
  if (inline) return <span className={className}>{renderInline(md)}</span>;
  const paragraphs = md.split(/\n{2,}/);
  return (
    <div className={cn("space-y-3 leading-relaxed", className)}>
      {paragraphs.map((p, i) => (
        <p key={i}>{renderInline(p)}</p>
      ))}
    </div>
  );
});
