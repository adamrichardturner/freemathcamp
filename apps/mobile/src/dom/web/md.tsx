import { Fragment, memo, type ReactNode } from "react";
import { Tex } from "@fmc/web/components/math/tex";

/**
 * The web app's rich-text renderer ($inline$, $$display$$, **bold**, *italic*,
 * blank-line paragraphs), minus concept links: on the phone a lesson stays a
 * lesson, so [[slug|text]] renders as its text. Metro swaps this in for the
 * web's own Md wherever reused web visuals import it.
 */
const INLINE = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\[\[[a-z0-9-]+\|[^\]]+\]\]|\*\*[^*]+\*\*|\*[^*\n]+\*)/g;

const renderInline = (text: string): ReactNode[] =>
  text.split(INLINE).map((part, i) => {
    if (!part) return null;
    if (part.startsWith("$$")) return <Tex key={i} tex={part.slice(2, -2)} display />;
    if (part.startsWith("$")) return <Tex key={i} tex={part.slice(1, -1)} />;
    if (part.startsWith("[[")) return <Fragment key={i}>{renderInline(part.slice(part.indexOf("|") + 1, -2))}</Fragment>;
    if (part.startsWith("**")) return <strong key={i} className="font-semibold text-foreground">{renderInline(part.slice(2, -2))}</strong>;
    if (part.startsWith("*") && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    return <Fragment key={i}>{part}</Fragment>;
  });

const join = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

export const Md = memo(function Md({ md, className, inline = false }: { md: string; className?: string; inline?: boolean }) {
  if (inline) return <span className={className}>{renderInline(md)}</span>;
  return (
    <div className={join("space-y-3 leading-relaxed", className)}>
      {md.split(/\n{2,}/).map((p, i) => (
        <p key={i}>{renderInline(p)}</p>
      ))}
    </div>
  );
});
