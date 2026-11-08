"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/app/logo";
import { useSession } from "@/hooks/queries";
import { AUTHOR } from "@/lib/site";
import { cn } from "@/lib/utils";

const PAGE_LINKS = [
  { href: "#features", label: "How it teaches" },
  { href: "#course", label: "The course" },
  { href: "#engine", label: "The engine" },
  { href: "#app", label: "iPhone app" },
  { href: "#faq", label: "Questions" },
] as const;

const LEGAL_LINKS = [
  { href: "/support", label: "Support" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy#united-states", label: "Do not sell or share" },
] as const;

const linkClass = "text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline";

function FooterColumn({ label, links, pathname }: { label: string; links: readonly { href: string; label: string }[]; pathname: string }) {
  return (
    <nav aria-label={label}>
      <p className="font-mono text-xs tracking-wide text-muted-foreground">{label}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => {
          const current = pathname === link.href;
          return (
            <li key={link.href}>
              <Link href={link.href} aria-current={current ? "page" : undefined} className={cn(linkClass, current && "text-foreground")}>
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}


export function SiteFooter() {
  const pathname = usePathname();
  const { user } = useSession();
  const courseLinks = user
    ? [
        { href: "/learn", label: "Dashboard" },
        { href: "/courses/foundations", label: "Foundations" },
        { href: "/progress", label: "Progress" },
        { href: "/articles", label: "Articles" },
      ]
    : [
        { href: "/courses/foundations", label: "Foundations" },
        { href: "/articles", label: "Articles" },
        { href: "/register", label: "Start free" },
        { href: "/login", label: "Sign in" },
      ];
  const onHome = pathname === "/";

  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="space-y-5 lg:col-span-5">
            <Logo />
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              A free course in the maths you need before calculus. Short lessons, interactive visuals, practice that adapts to you, and a record of progress on your account.
            </p>
            <p className="text-sm text-muted-foreground">freemathcamp.app</p>
            <a href={AUTHOR.portfolioUrl} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1.5 font-display text-lg tracking-tight text-foreground underline-offset-4 hover:underline">
              Made by {AUTHOR.name}
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </a>
            <p>
              <a href={`mailto:${AUTHOR.email}`} className={linkClass}>
                {AUTHOR.email}
              </a>
            </p>
          </div>
          <div className={cn("grid gap-10 sm:grid-cols-2 lg:col-span-7", onHome && "sm:grid-cols-3")}>
            <FooterColumn label="Course" links={courseLinks} pathname={pathname} />
            {onHome ? <FooterColumn label="On this page" links={PAGE_LINKS} pathname={pathname} /> : null}
            <FooterColumn label="Help and legal" links={LEGAL_LINKS} pathname={pathname} />
          </div>
        </div>
        <p className="mt-14 border-t pt-6 text-sm text-muted-foreground">Copyright © {AUTHOR.name}. All rights reserved.</p>
      </div>
    </footer>
  );
}
