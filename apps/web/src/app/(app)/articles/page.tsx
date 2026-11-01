import { articles, articleSections } from "@fmc/curriculum/articles";
import { BookMarked } from "lucide-react";
import type { Metadata } from "next";
import { ArticleIndex, CategoryCard, type CatalogSection } from "@/components/articles/article-catalog";
import { JsonLd } from "@/components/seo/json-ld";
import { Separator } from "@/components/ui/separator";
import { shareImage, ogImagePath, SITE_IMAGE_ALT } from "@/lib/og";
import { articleListSchema, breadcrumbs, collectionSchema, graph } from "@/lib/structured-data";

const title = "Maths Articles: Clear Explanations of Every Pre-Calculus Idea";
const description = `${articles.length} free, visual explainers of the maths before calculus, from place value and fractions to logarithms, trigonometry and limits. Written for beginners, grouped by topic.`;

export const metadata: Metadata = {
  title,
  description,
  keywords: ["maths articles", "math explanations", "pre-calculus concepts explained", "maths glossary", "learn maths online free", ...articleSections().map((s) => s.category.title)],
  alternates: { canonical: "/articles" },
  openGraph: { type: "website", title, description, url: "/articles", ...shareImage(ogImagePath(), SITE_IMAGE_ALT).openGraph },
  twitter: { ...shareImage(ogImagePath(), SITE_IMAGE_ALT).twitter, title, description },
};

export default function ArticlesPage() {
  const sections: CatalogSection[] = articleSections().map(({ category, articles }) => ({
    category,
    articles: articles.map(({ slug, title, name, definition, keywords }) => ({ slug, title, name, definition, keywords })),
  }));
  return (
    <div className="space-y-12">
      <JsonLd
        data={graph(
          collectionSchema("/articles", "Maths articles", description, "/articles#articles"),
          articleListSchema("/articles#articles", "All maths articles", articles),
          breadcrumbs([
            { name: "FreeMathCamp", path: "/" },
            { name: "Articles", path: "/articles" },
          ]),
        )}
      />
      <header className="max-w-2xl space-y-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold tracking-wider text-primary uppercase">
          <BookMarked className="size-3.5" /> Reference
        </span>
        <h1 className="font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl">Articles</h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          Longer, visual explanations of the ideas the lessons use, grouped by topic. Each one answers a single question in plain language, with animated examples and worked solutions you can step through.
        </p>
      </header>
      <section className="space-y-4" aria-labelledby="categories">
        <h2 id="categories" className="font-display text-3xl tracking-tight">
          Categories
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((s, i) => (
            <CategoryCard key={s.category.id} category={s.category} count={s.articles.length} index={i} />
          ))}
        </ul>
      </section>
      <Separator />
      <ArticleIndex sections={sections} />
    </div>
  );
}
