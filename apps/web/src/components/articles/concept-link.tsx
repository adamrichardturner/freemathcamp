"use client";

import { categoryById } from "@fmc/curriculum";
import { ArrowRight, SquareArrowOutUpRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { UnitIcon } from "@/components/app/unit-icon";
import { Md } from "@/components/math/md";
import { buttonVariants } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { articleHref, useConcepts } from "./concepts";

/**
 * A concept named in lesson copy. Hovering (or focusing) it previews the idea in a
 * short card; following it opens the full article.
 */
export function ConceptLink({ slug, children }: { slug: string; children: ReactNode }) {
  const concepts = useConcepts();
  const entry = concepts?.bySlug.get(slug);
  if (!entry) return <>{children}</>;
  const href = articleHref(slug, concepts?.from);
  const category = categoryById(entry.category);
  return (
    <HoverCard>
      <HoverCardTrigger
        delay={120}
        closeDelay={120}
        render={<Link href={href} />}
        className="rounded-sm font-medium text-primary underline decoration-primary/40 decoration-dotted decoration-[1.5px] underline-offset-[5px] transition-colors hover:decoration-primary hover:decoration-solid focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {children}
      </HoverCardTrigger>
      <HoverCardContent align="start" sideOffset={8} className="w-80 max-w-[calc(100vw-2rem)] overflow-hidden p-0 text-left">
        <div className="relative space-y-1.5 p-4 pr-12">
          <Link
            href={href}
            target="_blank"
            rel="noopener"
            aria-label={`Open “${entry.title}” in a new tab`}
            title="Open in a new tab"
            className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "absolute top-2.5 right-2.5 text-muted-foreground")}
          >
            <SquareArrowOutUpRight />
          </Link>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-primary uppercase">
            <UnitIcon name={category.icon} className="size-3.5" />
            {category.title}
          </div>
          <div className="font-display text-xl leading-tight text-foreground">{entry.name}</div>
          <Md md={entry.definition} className="text-sm leading-relaxed text-foreground/90" />
        </div>
        <div className="border-t bg-muted/40 px-4 py-3">
          <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
            <Md md={entry.summary} inline />
          </p>
        </div>
        <Link href={href} className="group flex items-center justify-between border-t px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none">
          Read the article
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </HoverCardContent>
    </HoverCard>
  );
}
