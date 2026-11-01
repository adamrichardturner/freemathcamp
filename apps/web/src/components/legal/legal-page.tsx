import type { ReactNode } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/app/site-header";

const linkClass = "text-foreground underline underline-offset-4";

export function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={linkClass}>
        {children}
      </Link>
    );
  }
  if (href.startsWith("mailto:")) {
    return (
      <a href={href} className={linkClass}>
        {children}
      </a>
    );
  }
  return (
    <a href={href} className={linkClass} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export function LegalSubhead({ children }: { children: ReactNode }) {
  return <h3 className="pt-2 font-medium text-foreground">{children}</h3>;
}

export function LegalPage({
  title,
  updated,
  lede,
  sections,
  children,
}: {
  title: string;
  updated: string;
  lede: ReactNode;
  sections: readonly { id: string; title: string }[];
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
        <p className="text-sm text-muted-foreground">FreeMathCamp</p>
        <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-6 text-sm text-muted-foreground">Updated {updated}</p>
        <div className="mt-8 space-y-4 text-base leading-relaxed text-muted-foreground">{lede}</div>
        <nav className="mt-10" aria-label="On this page">
          <ol className="grid gap-2 text-sm sm:grid-cols-2">
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="text-foreground underline-offset-4 hover:underline">
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="mt-12 space-y-12">{children}</div>
      </main>
    </>
  );
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 text-sm leading-relaxed text-muted-foreground" aria-labelledby={id}>
      <h2 id={id} className="scroll-mt-20 font-display text-2xl tracking-tight text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}
