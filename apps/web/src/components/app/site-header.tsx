"use client";

import { BookMarked, ChartLine, LayoutDashboard, Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ButtonLink } from "@/components/app/button-link";
import { Logo } from "@/components/app/logo";
import { MobileMenu } from "@/components/app/mobile-menu";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { UserMenu } from "@/components/app/user-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/queries";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/learn", label: "Dashboard", icon: LayoutDashboard, auth: true },
  { href: "/courses/foundations", label: "Course", icon: MapIcon, auth: false },
  { href: "/progress", label: "Progress", icon: ChartLine, auth: true },
  { href: "/articles", label: "Articles", icon: BookMarked, auth: false },
] as const;

const isActive = (pathname: string, href: string) => pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

export function SiteHeader() {
  const pathname = usePathname();
  const { user, ready } = useSession();
  const items = NAV.filter((n) => !n.auth || user);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo href={user ? "/learn" : "/"} />
        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {items.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                isActive(pathname, n.href) && "bg-muted text-foreground",
              )}
            >
              <n.icon className="size-4" /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-1.5 md:flex">
          <ThemeToggle />
          {!ready ? (
            <Skeleton className="size-8 rounded-full" />
          ) : user ? (
            <UserMenu user={user} />
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">
                Sign in
              </ButtonLink>
              <ButtonLink href="/register" size="sm">
                Start free
              </ButtonLink>
            </>
          )}
        </div>
        <div className="ml-auto md:hidden">
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
