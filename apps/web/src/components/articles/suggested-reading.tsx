"use client";

import { categoryById, type ConceptEntry } from "@fmc/curriculum";
import { BookMarked, SquareArrowOutUpRight } from "lucide-react";
import Link from "next/link";
import { UnitIcon } from "@/components/app/unit-icon";
import { Md } from "@/components/math/md";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { articleHref } from "./concepts";

/**
 * Articles that go deeper on what a lesson or article covers, in a fixed-height list
 * that scrolls on its own so a long list never pushes the page about.
 */
export function SuggestedReading({
  items,
  from,
  title = "Suggested reading",
  description = "Articles that explain this lesson's ideas in more depth.",
  className,
}: {
  items: ConceptEntry[];
  from?: string;
  title?: string;
  description?: string;
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <Card className={cn("gap-3", className)} aria-labelledby="suggested-reading">
      <CardHeader>
        <CardTitle id="suggested-reading" className="flex items-center gap-2 text-sm">
          <BookMarked className="size-4 text-primary" /> {title}
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">{items.length}</span>
        </CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <ScrollArea className="h-80 border-y bg-muted/20 **:data-[slot=scroll-area-viewport]:overscroll-contain">
          <ul className="space-y-2 p-3 pr-4">
            {items.map((item) => {
              const href = articleHref(item.slug, from);
              const category = categoryById(item.category);
              return (
                <li key={item.slug} className="group/item relative rounded-lg border bg-card p-3 pr-10 transition-colors hover:border-primary/30 hover:bg-primary/[0.04]">
                  <Link href={href} className="absolute inset-0 z-0 rounded-[inherit] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" aria-label={item.title} />
                  <Link
                    href={href}
                    target="_blank"
                    rel="noopener"
                    aria-label={`Open “${item.title}” in a new tab`}
                    title="Open in a new tab"
                    className={cn(buttonVariants({ variant: "ghost", size: "icon-xs" }), "absolute top-2 right-2 z-10 text-muted-foreground")}
                  >
                    <SquareArrowOutUpRight />
                  </Link>
                  <div className="pointer-events-none relative space-y-1">
                    <div className="flex items-center gap-1 text-[10px] font-semibold tracking-wider text-primary uppercase">
                      <UnitIcon name={category.icon} className="size-3" />
                      {category.title}
                    </div>
                    <div className="text-sm leading-snug font-medium group-hover/item:text-foreground">{item.title}</div>
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      <Md md={item.definition} inline />
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
