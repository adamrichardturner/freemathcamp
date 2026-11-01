import { articleBySlug, articles, conceptEntries, readingForArticle } from "@fmc/curriculum/articles";
import { ArrowRight, BookOpen, Clock, GraduationCap, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ButtonLink } from "@/components/app/button-link";
import { UnitIcon } from "@/components/app/unit-icon";
import { ArticleBody, BackToLesson, OnThisPage } from "@/components/articles/article-view";
import { ConceptProvider } from "@/components/articles/concepts";
import { SuggestedReading } from "@/components/articles/suggested-reading";
import { Md } from "@/components/math/md";
import { JsonLd } from "@/components/seo/json-ld";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { articleDescription, articleImagePath, articleLessons, articleSection, articleWords, readingMinutes } from "@/lib/articles";
import { shareImage } from "@/lib/og";
import { articleSchema, ARTICLES_PUBLISHED, breadcrumbs, faqSchema, graph } from "@/lib/structured-data";
import { plainText } from "@/lib/site";

type Props = PageProps<"/articles/[slug]">;

export const generateStaticParams = () => articles.map((a) => ({ slug: a.slug }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = articleBySlug(slug);
  if (!a) return {};
  const description = articleDescription(a);
  const path = `/articles/${a.slug}`;
  const share = shareImage(articleImagePath(a.slug), `${a.title}: a free explainer from FreeMathCamp`);
  return {
    title: a.title,
    description,
    keywords: a.keywords,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title: a.title,
      description,
      url: path,
      section: articleSection(a).title,
      publishedTime: ARTICLES_PUBLISHED,
      modifiedTime: ARTICLES_PUBLISHED,
      tags: a.keywords,
      ...share.openGraph,
    },
    twitter: { ...share.twitter, title: a.title, description },
  };
}

async function Article({ params }: Pick<Props, "params">) {
  const { slug } = await params;
  const a = articleBySlug(slug);
  if (!a) notFound();
  const section = articleSection(a);
  const lessons = articleLessons(a);
  const entries = conceptEntries();
  const related = readingForArticle(a.slug).flatMap((s) => entries.filter((e) => e.slug === s));
  const headings = a.body.flatMap((b) => (b.kind === "heading" ? [b.text] : []));
  const minutes = readingMinutes(a);
  return (
    <ConceptProvider entries={entries}>
      <JsonLd
        data={graph(
          articleSchema(a, section, { words: articleWords(a), minutes, image: articleImagePath(a.slug), lessons }),
          breadcrumbs([
            { name: "FreeMathCamp", path: "/" },
            { name: "Articles", path: "/articles" },
            { name: section.title, path: section.path },
            { name: a.title, path: `/articles/${a.slug}` },
          ]),
          ...(a.faqs.length ? [faqSchema(a.faqs.map((f) => ({ q: f.q, a: plainText(f.a) })))] : []),
        )}
      />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_288px]">
        <article className="min-w-0 max-w-3xl">
          <Suspense>
            <BackToLesson />
          </Suspense>
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <li>
                <Link href="/articles" className="underline-offset-4 hover:text-foreground hover:underline">
                  Articles
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link href={section.path} className="underline-offset-4 hover:text-foreground hover:underline">
                  {section.title}
                </Link>
              </li>
            </ol>
          </nav>
          <header className="mt-4 space-y-4">
            <Link href={section.path} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold tracking-wider text-primary uppercase hover:bg-primary/15">
              <UnitIcon name={section.icon} className="size-3.5" /> {section.title}
            </Link>
            <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-balance sm:text-5xl">{a.title}</h1>
            <Md md={a.summary} className="text-lg text-muted-foreground" />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5" /> {minutes} min read
              </span>
              {lessons.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="size-3.5" /> Supports {lessons.length} {lessons.length === 1 ? "lesson" : "lessons"}
                </span>
              )}
            </div>
          </header>
          <aside aria-label="In short" className="mt-8 flex gap-3 rounded-xl border border-primary/30 bg-primary/[0.06] p-4">
            <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="min-w-0 space-y-1">
              <div className="font-semibold">In short</div>
              <Md md={a.definition} className="text-[1.02rem]" />
            </div>
          </aside>
          <div className="mt-8">
            <ArticleBody slug={a.slug} />
          </div>
          {a.faqs.length > 0 && (
            <section aria-labelledby="questions" className="mt-12 space-y-4">
              <h2 id="questions" className="scroll-mt-24 font-display text-3xl tracking-tight">
                Common questions
              </h2>
              <dl className="divide-y rounded-xl border bg-card">
                {a.faqs.map((f) => (
                  <div key={f.q} className="space-y-1.5 p-4">
                    <dt className="font-semibold">{f.q}</dt>
                    <dd>
                      <Md md={f.a} className="text-[0.97rem] text-foreground/85" />
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          {lessons[0] && (
            <section className="mt-12 flex flex-col items-start gap-4 rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-chart-2/10 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-lg font-semibold">Practise {a.name.toLowerCase()}</div>
                <p className="text-sm text-muted-foreground">The {lessons[0].name} lesson has worked examples and unlimited practice that adapts to you.</p>
              </div>
              <ButtonLink href={lessons[0].path} size="lg" className="h-11 shrink-0 px-5">
                Open the lesson <ArrowRight />
              </ButtonLink>
            </section>
          )}
        </article>
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <OnThisPage headings={[...headings, ...(a.faqs.length ? ["Common questions"] : [])]} />
          {lessons.length > 0 && (
            <Card className="gap-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BookOpen className="size-4 text-primary" /> Lessons on this
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {lessons.map((l) => (
                    <li key={l.id}>
                      <Link href={l.path} className="group -mx-2 flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                        <span>
                          {l.name}
                          <span className="block text-xs text-muted-foreground">{l.unit}</span>
                        </span>
                        <ArrowRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          <SuggestedReading items={related} title="Related reading" description="Ideas this article builds on or leads to." />
        </aside>
      </div>
    </ConceptProvider>
  );
}

export default function ArticlePage({ params }: Props) {
  return (
    <Suspense fallback={<ArticleSkeleton />}>
      <Article params={params} />
    </Suspense>
  );
}

function ArticleSkeleton() {
  return (
    <div className="max-w-3xl space-y-4">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="mt-8 h-24 w-full rounded-xl" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
