"use client";

import { categoryPath, type ArticleCategory, type ArticleMeta } from "@fmc/curriculum";
import { ArrowRight, ChevronRight, Search, X } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { UnitIcon } from "@/components/app/unit-icon";
import { Md } from "@/components/math/md";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type CatalogItem = Pick<ArticleMeta, "slug" | "title" | "name" | "definition" | "keywords">;
export interface CatalogSection {
  category: ArticleCategory;
  articles: CatalogItem[];
}

const countLabel = (n: number) => `${n} ${n === 1 ? "article" : "articles"}`;

export function CategoryCard({ category, count, index }: { category: ArticleCategory; count: number; index: number }) {
  return (
    <motion.li initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.03, 0.3) }} className="h-full">
      <Link href={categoryPath(category)} className="group block h-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <Card className="h-full gap-3 px-4 transition-colors group-hover:bg-muted/50 group-hover:ring-primary/30">
          <div className="flex items-center justify-between">
            <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <UnitIcon name={category.icon} className="size-4.5" />
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{countLabel(count)}</span>
          </div>
          <h3 className="font-display text-2xl leading-tight tracking-tight">{category.title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{category.description}</p>
        </Card>
      </Link>
    </motion.li>
  );
}

export function ArticleList({ items }: { items: CatalogItem[] }) {
  return (
    <Card className="gap-0 py-0">
      <ol className="divide-y">
        {items.map((a) => (
          <li key={a.slug}>
            <Link href={`/articles/${a.slug}`} className="group flex items-center gap-4 px-4 py-3.5 transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted/60">
              <div className="min-w-0 flex-1">
                <p className="font-medium group-hover:text-primary">{a.title}</p>
                <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  <Md md={a.definition} inline />
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}

const matches = (a: CatalogItem, q: string) => [a.title, a.name, a.definition, ...a.keywords].some((s) => s.toLowerCase().includes(q));

/** Every article, grouped by category, with a filter box that narrows the list as you type. */
export function ArticleIndex({ sections }: { sections: CatalogSection[] }) {
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim().toLowerCase());
  const filtered = sections.map((s) => ({ ...s, articles: q ? s.articles.filter((a) => matches(a, q)) : s.articles })).filter((s) => s.articles.length > 0);
  const total = filtered.reduce((n, s) => n + s.articles.length, 0);
  return (
    <section className="space-y-8" aria-labelledby="all-articles">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl space-y-1.5">
          <h2 id="all-articles" className="font-display text-3xl tracking-tight">
            All articles
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">Every explainer in course order. Search by name, or by what you are stuck on.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search articles" aria-label="Search articles" className="h-9 pr-9 pl-8" />
          {query && (
            <Button variant="ghost" size="icon-xs" aria-label="Clear search" className="absolute top-1/2 right-1.5 -translate-y-1/2" onClick={() => setQuery("")}>
              <X />
            </Button>
          )}
        </div>
      </div>
      {q && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {total ? `${countLabel(total)} match “${query.trim()}”.` : `Nothing matches “${query.trim()}”. Try a shorter word.`}
        </p>
      )}
      {filtered.map((s) => (
        <section key={s.category.id} className="space-y-3" aria-labelledby={`category-${s.category.id}`}>
          <h3 id={`category-${s.category.id}`} className="flex items-center gap-2 font-display text-2xl tracking-tight">
            <UnitIcon name={s.category.icon} className="size-5 text-primary" />
            <Link href={categoryPath(s.category)} className="group inline-flex items-center gap-1.5 underline-offset-4 hover:underline">
              {s.category.title}
              <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          </h3>
          <ArticleList items={s.articles} />
        </section>
      ))}
    </section>
  );
}
