"use client";

import {
  BadgeCheck,
  Bell,
  BellOff,
  CalendarDays,
  CheckCheck,
  Flame,
  GraduationCap,
  Hourglass,
  KeyRound,
  Link2,
  Loader2,
  LogOut,
  Medal,
  MoreHorizontal,
  Mountain,
  Pin,
  PinOff,
  Repeat,
  Rocket,
  RotateCcw,
  Settings,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  Unlock,
  Eye,
  EyeOff,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/app/button-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotificationActions, useNotificationCounts, useNotifications } from "@/hooks/notifications";
import type { AppNotification, NotificationCategory, NotificationFilter } from "@/lib/api";
import { relative } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  welcome: Sparkles,
  email_verified: BadgeCheck,
  new_sign_in: ShieldAlert,
  google_linked: Link2,
  password_changed: KeyRound,
  password_set: KeyRound,
  sessions_revoked: LogOut,
  progress_reset: RotateCcw,
  lesson_completed: Unlock,
  lesson_mastered: GraduationCap,
  unit_mastered: Trophy,
  course_milestone: Mountain,
  streak_milestone: Flame,
  daily_goal: Target,
  problems_milestone: Medal,
  reminder_streak: Flame,
  reminder_reviews: Repeat,
  reminder_goal: Target,
  reminder_inactive: Hourglass,
  reminder_start: Rocket,
  weekly_summary: CalendarDays,
};

const TONE: Record<NotificationCategory, string> = {
  account: "bg-info/12 text-info",
  progress: "bg-success/12 text-success",
  reminder: "bg-warning/15 text-warning",
};

const EMPTY: Record<NotificationFilter, { icon: LucideIcon; title: string; text: string }> = {
  all: { icon: Bell, title: "You're all caught up", text: "Milestones, reminders and account notices will appear here." },
  unread: { icon: CheckCheck, title: "Nothing unread", text: "You've read everything. Nice." },
  kept: { icon: Pin, title: "Nothing kept", text: "Keep a notification to hold on to it. Kept ones are never cleared." },
};

/** Today / Yesterday / Earlier, for scanning a long list. */
const dayGroup = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = (start(today) - start(d)) / 86_400_000;
  return diff <= 0 ? "Today" : diff === 1 ? "Yesterday" : "Earlier";
};

/**
 * The notification centre: tabs for all / unread / kept, per-item actions, and
 * bulk actions. Opening it marks everything as seen, which clears the avatar badge.
 */
export function NotificationCentre({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const { data: counts } = useNotificationCounts();
  const actions = useNotificationActions();
  const { mutate: markSeen } = actions.seen;
  const marked = useRef(false);

  useEffect(() => {
    if (!marked.current && counts && counts.unseen > 0) {
      marked.current = true;
      markSeen();
    }
  }, [counts, markSeen]);

  const bulkBusy = actions.readAll.isPending || actions.dismissRead.isPending;

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex items-center justify-between gap-2 pb-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as NotificationFilter)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread" className="gap-1.5">
              Unread
              {!!counts?.unread && (
                <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] tabular-nums">
                  {counts.unread}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="kept" className="gap-1.5">
              <Pin className="size-3.5" /> Kept
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => actions.readAll.mutate()}
            disabled={!counts?.unread || bulkBusy}
            aria-busy={actions.readAll.isPending}
          >
            {actions.readAll.isPending ? <Loader2 className="animate-spin" /> : <CheckCheck />}
            <span className="hidden sm:inline">Mark all read</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="More notification actions" disabled={bulkBusy} />}>
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => actions.dismissRead.mutate()} disabled={!counts?.total}>
                <Trash2 /> Clear read notifications
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <SettingsItem onNavigate={onNavigate} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {/* Lists are kept per tab so switching back is instant. */}
      <Tabs value={filter} className="min-h-0 flex-1">
        {(["all", "unread", "kept"] as const).map((f) => (
          <TabsContent key={f} value={f} className="min-h-0">
            <NotificationList filter={f} active={filter === f} onNavigate={onNavigate} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function SettingsItem({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  return (
    <DropdownMenuItem
      onClick={() => {
        onNavigate?.();
        router.push("/settings#notifications");
      }}
    >
      <Settings /> Notification settings
    </DropdownMenuItem>
  );
}

function NotificationList({ filter, active, onNavigate }: { filter: NotificationFilter; active: boolean; onNavigate?: () => void }) {
  const query = useNotifications(filter, active);
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  if (query.isPending)
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex gap-3 rounded-xl p-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );

  if (query.isError)
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted-foreground">
        Couldn&apos;t load notifications.
        <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
          {query.isFetching && <Loader2 className="animate-spin" />} Try again
        </Button>
      </div>
    );

  if (items.length === 0) {
    const e = EMPTY[filter];
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
        <span className="mb-1 grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <e.icon className="size-6" />
        </span>
        <div className="font-semibold">{e.title}</div>
        <p className="max-w-xs text-sm text-muted-foreground">{e.text}</p>
      </div>
    );
  }

  const rows = items.map((n, i) => {
    const group = dayGroup(n.createdAt);
    return { n, header: i === 0 || dayGroup(items[i - 1]!.createdAt) !== group ? group : null };
  });
  return (
    <div className="space-y-1">
      <ul className="space-y-1">
        <AnimatePresence initial={false}>
          {rows.map(({ n, header }) => {
            return (
              <motion.li key={n.id} layout exit={{ opacity: 0, height: 0, marginTop: 0 }} transition={{ duration: 0.18 }}>
                {header && <div className="px-3 pt-3 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{header}</div>}
                <NotificationItem n={n} onNavigate={onNavigate} />
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      {query.hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage} aria-busy={query.isFetchingNextPage}>
            {query.isFetchingNextPage && <Loader2 className="animate-spin" />} Load older
          </Button>
        </div>
      )}
    </div>
  );
}

function NotificationItem({ n, onNavigate }: { n: AppNotification; onNavigate?: () => void }) {
  const router = useRouter();
  const { setRead, setKept, dismiss } = useNotificationActions();
  const Icon = ICONS[n.kind] ?? Bell;
  const busy = setRead.isPending || setKept.isPending || dismiss.isPending;

  const open = () => {
    if (!n.read) setRead.mutate({ id: n.id, read: true });
    if (n.href) {
      onNavigate?.();
      router.push(n.href);
    }
  };

  return (
    <div className={cn("group relative rounded-xl transition-colors hover:bg-muted/60", !n.read && "bg-primary/[0.045]")}>
      <button type="button" onClick={open} className="flex w-full gap-3 rounded-xl p-3 pr-12 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", TONE[n.category])}>
          <Icon className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className={cn("truncate text-sm", n.read ? "font-medium" : "font-semibold")}>{n.title}</span>
            {n.kept && <Pin className="size-3 shrink-0 text-primary" aria-label="Kept" />}
          </span>
          <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-muted-foreground">{n.body}</span>
          <span className="mt-1 block text-[11px] text-muted-foreground/80">{relative(n.createdAt)}</span>
        </span>
        {!n.read && <span className="absolute top-4 right-4 size-2 rounded-full bg-primary group-hover:opacity-0 group-has-[[data-popup-open]]:opacity-0" aria-label="Unread" />}
      </button>
      <div className="absolute top-2 right-2 opacity-100 transition-opacity focus-within:opacity-100 has-[[data-popup-open]]:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for “${n.title}”`} disabled={busy} />}>
            {busy ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setRead.mutate({ id: n.id, read: !n.read })}>
              {n.read ? <EyeOff /> : <Eye />} Mark as {n.read ? "unread" : "read"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setKept.mutate({ id: n.id, kept: !n.kept })}>
              {n.kept ? <PinOff /> : <Pin />} {n.kept ? "Stop keeping" : "Keep"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => dismiss.mutate(n.id)}>
              <BellOff /> Dismiss
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/** A "see everything" link for compact surfaces. */
export function AllNotificationsLink({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <ButtonLink href="/notifications" variant="outline" size="sm" className="w-full" onClick={onNavigate}>
      Open notification centre
    </ButtonLink>
  );
}
