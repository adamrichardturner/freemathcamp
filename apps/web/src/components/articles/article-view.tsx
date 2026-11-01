"use client";

import { articleBySlug } from "@fmc/curriculum/articles";
import { ArrowLeft, ListTree } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/app/button-link";
import { headingId, Lesson } from "@/components/course/lesson-blocks";
import { exerciseRef, lessonHref } from "@/lib/course";
import { cn } from "@/lib/utils";

/** The article's blocks, rendered with the lesson renderer so visuals behave the same. */
export function ArticleBody({ slug }: { slug: string }) {
  const article = articleBySlug(slug);
  if (!article) return null;
  return <Lesson blocks={article.body} exclude={slug} />;
}

/** Shown when the reader arrived from a lesson's concept link or suggested reading. */
export function BackToLesson() {
  const from = useSearchParams().get("from");
  const ref = from ? exerciseRef(from) : undefined;
  if (!ref) return null;
  return (
    <ButtonLink href={lessonHref(ref.exercise.id)} variant="outline" size="lg" className="mb-6 h-10 gap-2 px-4">
      <ArrowLeft /> Back to {ref.exercise.title}
    </ButtonLink>
  );
}

/** Contents list that tracks the section in view. */
export function OnThisPage({ headings }: { headings: string[] }) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const ids = headings.map(headingId);
    let frame = 0;
    // The current section is the last heading to have passed under the sticky header.
    const update = () => {
      frame = 0;
      let current: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < 140) current = id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [headings]);
  if (headings.length < 2) return null;
  return (
    <nav aria-label="On this page" className="hidden rounded-xl border bg-card p-4 lg:block">
      <p className="mb-3 flex items-center gap-2 text-sm font-medium">
        <ListTree className="size-4 text-primary" /> On this page
      </p>
      <ol className="space-y-0.5 border-l">
        {headings.map((h) => {
          const id = headingId(h);
          return (
            <li key={id}>
              <Link
                href={`#${id}`}
                className={cn(
                  "-ml-px block border-l-2 border-transparent py-1 pl-3 text-sm text-muted-foreground transition-colors hover:text-foreground",
                  active === id && "border-primary font-medium text-foreground",
                )}
              >
                {h}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
