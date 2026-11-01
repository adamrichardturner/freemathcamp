"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLessonAccess } from "@/hooks/queries";
import { lessonHref } from "@/lib/course";
import { cn } from "@/lib/utils";

/** Shared look for anything that points at a lesson the learner hasn't unlocked yet. */
export const lockedClasses =
  "cursor-not-allowed border-dashed bg-muted/40 text-muted-foreground opacity-75 grayscale shadow-none hover:translate-y-0 hover:border-border hover:bg-muted/40 hover:shadow-none";

/**
 * A link to a lesson that turns into an inert, greyed-out element while the
 * lesson is locked in path mode. `children` may be a function of the lock state
 * so callers can swap an arrow for a padlock.
 */
export function LessonLink({
  id,
  query,
  className,
  openClassName,
  lockedClassName,
  children,
}: {
  id: string;
  query?: string;
  className?: string;
  /** Classes (typically hover effects) only applied while the lesson is open. */
  openClassName?: string;
  lockedClassName?: string;
  children: ReactNode | ((locked: boolean) => ReactNode);
}) {
  const { isLocked, lockedBy } = useLessonAccess();
  const locked = isLocked(id);
  const content = typeof children === "function" ? children(locked) : children;
  if (locked) {
    const before = lockedBy(id);
    const hint = `Locked: complete “${before?.title ?? "the previous lesson"}” to unlock`;
    return (
      <span role="link" aria-disabled="true" title={hint} aria-label={hint} data-locked="" className={cn(className, lockedClasses, lockedClassName)}>
        {content}
      </span>
    );
  }
  return (
    <Link href={`${lessonHref(id)}${query ? `?${query}` : ""}`} className={cn(className, openClassName)}>
      {content}
    </Link>
  );
}
