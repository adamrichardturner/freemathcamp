"use client";

import { Bell, BookMarked, BookOpen, ChartLine, CircleHelp, Compass, Cpu, House, LayoutDashboard, Loader2, Lock, LogOut, Map as MapIcon, Menu, Moon, Settings, Sparkles, Sun, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useRef, useState, useSyncExternalStore, type ComponentType, type ReactNode } from "react";
import { LogoMark } from "@/components/app/logo";
import { openOnboarding } from "@/components/app/onboarding";
import { UnitIcon } from "@/components/app/unit-icon";
import { UserAvatar } from "@/components/app/user-menu";
import { ButtonLink } from "@/components/app/button-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useNotificationCounts } from "@/hooks/notifications";
import { useLessonAccess, useLogout, useSession } from "@/hooks/queries";
import type { User } from "@/lib/api";
import { course, exerciseRef, lessonHref } from "@/lib/course";
import { cn } from "@/lib/utils";

interface MenuLink {
  href: string;
  label: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
}

const COURSE_PATH = `/courses/${course.id}`;

const pageLinks: MenuLink[] = [
  { href: "#features", label: "What you get", detail: "Lessons, visuals and practice", icon: Sparkles },
  { href: "#course", label: "The course", detail: `${course.units.length} units, place value to limits`, icon: MapIcon },
  { href: "#engine", label: "How it adapts", detail: "Difficulty, mastery and reviews", icon: Cpu },
  { href: "#faq", label: "Questions", detail: "Short answers, in the open", icon: CircleHelp },
];

const unitLinks: MenuLink[] = course.units.map((u) => ({
  href: `#${u.id}`,
  label: u.title,
  detail: `${u.exercises.length} lessons`,
  icon: ({ className }: { className?: string }) => <UnitIcon name={u.icon} className={className} />,
}));

const homeLink: MenuLink = { href: "/", label: "Home", detail: "What FreeMathCamp is", icon: House };
const courseLink: MenuLink = { href: COURSE_PATH, label: "Foundations", detail: "The course map", icon: BookOpen };
const articlesLink: MenuLink = { href: "/articles", label: "Articles", detail: "Visual explainers, by topic", icon: BookMarked };

const accountLinks: MenuLink[] = [
  { href: "/learn", label: "Dashboard", detail: "Today's plan and your streak", icon: LayoutDashboard },
  { href: COURSE_PATH, label: "Course", detail: "Every lesson, in order", icon: MapIcon },
  { href: "/progress", label: "Progress", detail: "Mastery, accuracy and weak spots", icon: ChartLine },
  articlesLink,
  { href: "/notifications", label: "Notifications", detail: "Milestones, reminders and notices", icon: Bell },
  { href: "/settings", label: "Settings", detail: "Profile, goals, sounds and more", icon: Settings },
];

const isCurrent = (href: string, pathname: string) => pathname === href || (href !== "/" && href !== COURSE_PATH && pathname.startsWith(`${href}/`));

const itemClass = (current: boolean) =>
  cn(
    "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px",
    current ? "bg-foreground text-background" : "hover:bg-muted active:bg-muted",
  );

const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};
const readHash = () => window.location.hash.replace(/^#/, "");
const noHash = () => "";
const noopSubscribe = () => () => {};

// The sheet locks page scroll while open and restores the old position a moment after it
// closes, which would cut a smooth scroll short. Wait until the page can scroll again.
const scrollLocked = () => {
  const { documentElement: html, body } = document;
  return html.hasAttribute("data-base-ui-scroll-locked") || [html, body].some((el) => /hidden|clip/.test(getComputedStyle(el).overflowY));
};
function afterScrollUnlock(run: () => void, frames = 30) {
  if (frames <= 0 || !scrollLocked()) return requestAnimationFrame(run);
  requestAnimationFrame(() => afterScrollUnlock(run, frames - 1));
}

// Scroll to a section once the sheet has finished closing, clear of the sticky header.
function scrollToSection(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  if (window.location.hash !== `#${id}`) {
    window.history.replaceState(window.history.state, "", `#${id}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const header = document.querySelector("header");
  const offset = (header?.getBoundingClientRect().height ?? 0) + 16;
  // Ignore any slide-in transform the section hasn't finished yet, so it lands where it settles.
  const shift = new DOMMatrixReadOnly(getComputedStyle(target).transform).m42;
  window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top - shift + window.scrollY - offset), behavior: reduce ? "auto" : "smooth" });
}

function MenuLabel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="px-3 font-mono text-xs tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

function ItemBody({ link, current, number, trailing }: { link: MenuLink; current: boolean; number?: number; trailing?: ReactNode }) {
  const Icon = link.icon;
  return (
    <>
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", current ? "bg-background/15" : "bg-muted text-foreground")}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          {number !== undefined && <span className={cn("font-mono text-[11px]", current ? "text-background/60" : "text-muted-foreground")}>{`${number}`.padStart(2, "0")}</span>}
          <span className="truncate font-display text-lg leading-none tracking-tight">{link.label}</span>
        </span>
        <span className={cn("mt-1 block truncate text-xs leading-relaxed", current ? "text-background/70" : "text-muted-foreground")}>{link.detail}</span>
      </span>
      {trailing}
    </>
  );
}

function SectionButton({ link, number, current, onSelect }: { link: MenuLink; number: number; current: boolean; onSelect: (href: string) => void }) {
  return (
    <li>
      <button type="button" className={itemClass(current)} aria-current={current ? "location" : undefined} onClick={() => onSelect(link.href)}>
        <ItemBody link={link} current={current} number={number} />
      </button>
    </li>
  );
}

function RouteLink({ link, current, onSelect, trailing }: { link: MenuLink; current: boolean; onSelect: () => void; trailing?: ReactNode }) {
  return (
    <li>
      <Link href={link.href} className={itemClass(current)} aria-current={current ? "page" : undefined} onClick={onSelect}>
        <ItemBody link={link} current={current} trailing={trailing} />
      </Link>
    </li>
  );
}

/** The lessons of the unit being read, in order, with locked ones greyed out. */
function UnitLessons({ exerciseId, onSelect }: { exerciseId: string; onSelect: () => void }) {
  const { isLocked } = useLessonAccess();
  const ref = exerciseRef(exerciseId);
  if (!ref) return null;
  return (
    <nav aria-labelledby="mobile-menu-unit">
      <MenuLabel id="mobile-menu-unit">{ref.unit.title}</MenuLabel>
      <ul className="mt-2 space-y-1">
        {ref.unit.exercises.map((e, i) => {
          const current = e.id === exerciseId;
          const link: MenuLink = { href: lessonHref(e.id), label: e.title, detail: `About ${e.estimatedMinutes} min`, icon: ({ className }: { className?: string }) => <UnitIcon name={ref.unit.icon} className={className} /> };
          // Locked lessons can't be opened from here; the one being read still shows as current.
          if (isLocked(e.id))
            return (
              <li key={e.id}>
                <span
                  role="link"
                  aria-disabled="true"
                  aria-current={current ? "page" : undefined}
                  aria-label={`${e.title}, locked`}
                  className={cn(itemClass(current), "cursor-not-allowed active:translate-y-0", !current && "opacity-50 hover:bg-transparent")}
                >
                  <ItemBody link={{ ...link, icon: Lock }} current={current} number={i + 1} />
                </span>
              </li>
            );
          return (
            <li key={e.id}>
              <Link href={link.href} className={itemClass(current)} aria-current={current ? "page" : undefined} onClick={onSelect}>
                <ItemBody link={link} current={current} number={i + 1} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function AppearanceSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return (
    <div className="flex items-center gap-1.5">
      <Sun className="size-3.5 text-muted-foreground" aria-hidden />
      <Switch size="sm" checked={mounted && resolvedTheme === "dark"} aria-label="Dark mode" onCheckedChange={(dark) => setTheme(dark ? "dark" : "light")} />
      <Moon className="size-3.5 text-muted-foreground" aria-hidden />
    </div>
  );
}

function MenuAccount({ user, ready, onDone }: { user: User | null; ready: boolean; onDone: () => void }) {
  const logout = useLogout();
  const { data: counts } = useNotificationCounts();
  const unseen = counts?.unseen ?? 0;

  if (!ready)
    return (
      <div className="flex flex-col gap-2" aria-hidden>
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    );

  if (!user)
    return (
      <div className="flex flex-col gap-2" onClick={onDone}>
        <ButtonLink href="/register" className="h-10 w-full">
          Start free
        </ButtonLink>
        <ButtonLink href="/login" variant="outline" className="h-10 w-full">
          Sign in
        </ButtonLink>
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 px-1">
        <Link href="/notifications" onClick={onDone} aria-label={unseen ? `Notifications, ${unseen} new` : "Notifications"} className="relative shrink-0 rounded-full">
          <UserAvatar user={user} className="size-10" />
          {unseen > 0 && <span aria-hidden className="absolute top-0 right-0 size-2.5 rounded-full bg-danger ring-2 ring-background" />}
        </Link>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user.displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>
      <Button variant="outline" className="h-10 w-full" onClick={() => logout.mutate()} disabled={logout.busy} aria-busy={logout.busy}>
        {logout.busy ? <Loader2 className="animate-spin" /> : <LogOut />}
        {logout.busy ? "Signing out…" : "Sign out"}
      </Button>
    </div>
  );
}

function UnseenDot() {
  const { data } = useNotificationCounts();
  if (!data?.unseen) return null;
  return <span aria-hidden className="pointer-events-none absolute top-2 right-2 size-2.5 rounded-full bg-danger ring-2 ring-background" />;
}

function NotificationsCount() {
  const { data } = useNotificationCounts();
  if (!data?.unread) return null;
  return <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground tabular-nums">{data.unread > 99 ? "99+" : data.unread}</span>;
}

/** Phone navigation: a sheet from the left with the page's sections, the app's places, appearance and the account. */
export function MobileMenu() {
  const pathname = usePathname();
  const { user, ready } = useSession();
  const hash = useSyncExternalStore(subscribeHash, readHash, noHash);
  const pendingSection = useRef<string | null>(null);
  // Set when the learner picks a section, so focus stays in the page instead of returning to the menu button.
  const jumped = useRef(false);
  const [open, setOpen] = useState(false);

  const close = () => {
    pendingSection.current = null;
    setOpen(false);
  };
  const selectSection = (href: string) => {
    pendingSection.current = href.replace(/^#/, "");
    jumped.current = true;
    setOpen(false);
  };

  const signedIn = ready && !!user;
  const onHome = pathname === "/";
  const onCourse = pathname === COURSE_PATH;
  const lessonId = pathname.startsWith(`${COURSE_PATH}/`) ? pathname.slice(COURSE_PATH.length + 1) : null;
  const section = onHome ? { id: "mobile-menu-page", label: "On this page", links: pageLinks } : onCourse ? { id: "mobile-menu-units", label: "Units", links: unitLinks } : null;
  const explore = signedIn ? accountLinks : onHome ? [courseLink, articlesLink] : [homeLink, courseLink, articlesLink];

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (next) {
          pendingSection.current = null;
          jumped.current = false;
        }
        setOpen(next);
      }}
      onOpenChangeComplete={(next) => {
        if (next) return;
        const id = pendingSection.current;
        pendingSection.current = null;
        if (id) afterScrollUnlock(() => scrollToSection(id));
      }}
    >
      <SheetTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative size-11 shrink-0 md:hidden")} aria-label="Open menu">
        <Menu className="size-5" />
        {signedIn && <UnseenDot />}
      </SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        // Leave focus where the learner jumped to rather than back on the menu button.
        finalFocus={() => !jumped.current}
        className={cn(
          "grid h-full max-h-dvh min-h-0 w-[min(88vw,22.5rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden bg-background p-0 text-foreground shadow-2xl duration-300 ease-out sm:max-w-none",
          "data-[side=left]:data-ending-style:translate-x-[-100%]! data-[side=left]:data-starting-style:translate-x-[-100%]!",
        )}
      >
        <SheetHeader className="gap-3 border-b px-5 pt-5 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <LogoMark />
              <SheetTitle className="text-[1.05rem] font-semibold tracking-tight">
                FreeMath<span className="text-primary">Camp</span>
              </SheetTitle>
            </div>
            <SheetClose aria-label="Close menu" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "-mr-1 shrink-0")}>
              <X />
            </SheetClose>
          </div>
          <SheetDescription className="text-sm leading-relaxed">100% free. Every idea you need before calculus, with practice that adapts to you.</SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-col gap-6 overflow-y-auto overscroll-contain px-3 py-4">
          {section && (
            <nav aria-labelledby={section.id}>
              <MenuLabel id={section.id}>{section.label}</MenuLabel>
              <ul className="mt-2 space-y-1">
                {section.links.map((link, i) => (
                  <SectionButton key={link.href} link={link} number={i + 1} current={hash === link.href.slice(1)} onSelect={selectSection} />
                ))}
              </ul>
            </nav>
          )}
          {lessonId && <UnitLessons exerciseId={lessonId} onSelect={close} />}
          <nav aria-labelledby="mobile-menu-explore">
            <MenuLabel id="mobile-menu-explore">Explore</MenuLabel>
            <ul className="mt-2 space-y-1">
              {explore.map((link) => (
                <RouteLink
                  key={link.href + link.label}
                  link={link}
                  current={link.href === COURSE_PATH ? onCourse : isCurrent(link.href, pathname)}
                  onSelect={close}
                  trailing={link.href === "/notifications" ? <NotificationsCount /> : undefined}
                />
              ))}
              {signedIn && (
                <li>
                  <button
                    type="button"
                    className={itemClass(false)}
                    onClick={() => {
                      close();
                      openOnboarding();
                    }}
                  >
                    <ItemBody link={{ href: "", label: "Take the tour", detail: "How the course works, in three steps", icon: Compass }} current={false} />
                  </button>
                </li>
              )}
            </ul>
          </nav>
        </div>

        <SheetFooter className="mt-0 gap-3 border-t p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between gap-3 px-1">
            <p className="text-sm text-muted-foreground">Appearance</p>
            <AppearanceSwitch />
          </div>
          <MenuAccount user={user ?? null} ready={ready} onDone={close} />
          <nav aria-label="Legal" className="flex gap-4 px-1 text-sm text-muted-foreground">
            <Link href="/privacy" onClick={close} className="underline-offset-4 hover:text-foreground hover:underline">
              Privacy
            </Link>
            <Link href="/terms" onClick={close} className="underline-offset-4 hover:text-foreground hover:underline">
              Terms
            </Link>
          </nav>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
