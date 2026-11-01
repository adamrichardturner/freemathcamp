import { articleCategories, articlesInCategory, categoryBySlug, categoryPath } from "@fmc/curriculum/articles";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { UnitIcon } from "@/components/app/unit-icon";
import { ArticleList } from "@/components/articles/article-catalog";
import { JsonLd } from "@/components/seo/json-ld";
import { Skeleton } from "@/components/ui/skeleton";
import { ogImagePath, shareImage, SITE_IMAGE_ALT } from "@/lib/og";
import { articleListSchema, breadcrumbs, collectionSchema, graph } from "@/lib/structured-data";

type Props = PageProps<"/articles/categories/[slug]">;

export const generateStaticParams = () => articleCategories.map((c) => ({ slug: c.slug }));

const pageTitle = (title: string) => `${title} Explained: Free Maths Articles`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = categoryBySlug(slug);
  if (!c) return {};
  const items = articlesInCategory(c.id);
  const title = pageTitle(c.title);
  const description = `${c.description} ${items.length} free, visual explainers for beginners.`;
  return {
    title,
    description,
    keywords: [c.title.toLowerCase(), ...items.flatMap((a) => a.keywords.slice(0, 2))],
    alternates: { canonical: categoryPath(c) },
    openGraph: { type: "website", title, description, url: categoryPath(c), ...shareImage(ogImagePath(), SITE_IMAGE_ALT).openGraph },
    twitter: { ...shareImage(ogImagePath(), SITE_IMAGE_ALT).twitter, title, description },
  };
}

async function Category({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const c = categoryBySlug(slug);
  if (!c) notFound();
  const items = articlesInCategory(c.id);
  const path = categoryPath(c);
  const index = articleCategories.indexOf(c);
  const prev = articleCategories[index - 1];
  const next = articleCategories[index + 1];
  return (
    <div className="max-w-4xl space-y-8">
      <JsonLd
        data={graph(
          collectionSchema(path, c.title, c.summary, `${path}#articles`),
          articleListSchema(`${path}#articles`, `${c.title} articles`, items),
          breadcrumbs([
            { name: "FreeMathCamp", path: "/" },
            { name: "Articles", path: "/articles" },
            { name: c.title, path },
          ]),
        )}
      />
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <li>
            <Link href="/articles" className="underline-offset-4 hover:text-foreground hover:underline">
              Articles
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-foreground">
            {c.title}
          </li>
        </ol>
      </nav>
      <header className="space-y-4">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <UnitIcon name={c.icon} className="size-5" />
        </span>
        <h1 className="font-display text-5xl leading-[1.05] tracking-tight">{c.title}</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">{c.summary}</p>
      </header>
      <ArticleList items={items.map(({ slug, title, name, definition, keywords }) => ({ slug, title, name, definition, keywords }))} />
      <nav aria-label="Other categories" className="grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link href={categoryPath(prev)} className="rounded-xl border p-4 transition-colors hover:bg-muted/50">
            <span className="text-xs text-muted-foreground">Previous category</span>
            <span className="mt-1 block font-medium">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={categoryPath(next)} className="rounded-xl border p-4 text-right transition-colors hover:bg-muted/50">
            <span className="text-xs text-muted-foreground">Next category</span>
            <span className="mt-1 block font-medium">{next.title}</span>
          </Link>
        )}
      </nav>
    </div>
  );
}

export default function CategoryPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full max-w-4xl rounded-xl" />}>
      <Category params={params} />
    </Suspense>
  );
}
