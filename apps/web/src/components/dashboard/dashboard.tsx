"use client";

import { ArrowDown, ArrowRight, CalendarCheck, Check, Flame, GraduationCap, Hourglass, Map as MapIcon, Sparkles, Target } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { ButtonLink } from "@/components/app/button-link";
import { MasteryRing, queueMeta } from "@/components/app/status";
import { UnitIcon } from "@/components/app/unit-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VerifyEmailCard } from "@/components/app/verify-email-card";
import { LessonLink } from "@/components/course/lesson-link";
import { LeagueCard } from "@/components/leagues/league-card";
import { useCourseProgress, useDashboard, useSession } from "@/hooks/queries";
import type { LearningMode } from "@fmc/curriculum";
import type { CompletedToday, DayPlan, QueueKind, Recommendation } from "@/lib/api";
import { course, exerciseRef } from "@/lib/course";
import { greeting, minutes, shortMinutes } from "@/lib/format";
import { cn } from "@/lib/utils";

export function DashboardView() {
  const { user, ready, verified } = useSession();
  const { data, isLoading } = useDashboard(verified);
  const { data: progress } = useCourseProgress(verified);

  if (ready && user && !verified) return <VerifyEmailCard user={user} />;
  if (isLoading || !data) return <DashboardSkeleton />;
  const { queues, stats, day } = data;
  const firstName = user?.displayName.split(" ")[0] ?? "there";
  const isNew = stats.exercisesStarted === 0;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{greeting()},</p>
          <h1 className="font-display text-4xl sm:text-5xl">{firstName}</h1>
          <p className="mt-2 max-w-lg text-muted-foreground">
            {isNew
              ? "Welcome to Foundations. We've lined up the perfect place to start."
              : day.complete
                ? "You've met today's goal. Anything more today is a bonus."
                : stats.reviewsDue > 0
                ? `You have ${stats.reviewsDue} review${stats.reviewsDue > 1 ? "s" : ""} due — a quick refresh keeps them locked in.`
                : "Here's your plan for today, tuned to how you've been doing."}
          </p>
        </div>
        <StreakBadge current={stats.streak.current} activeToday={stats.streak.activeToday} longest={stats.streak.longest} />
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={GraduationCap} label="Mastered" value={`${stats.exercisesMastered}`} sub={`of ${stats.exercisesTotal} lessons`} tone="text-success" />
        <StatCard icon={Sparkles} label="Started" value={`${stats.exercisesStarted}`} sub="lessons in progress or done" tone="text-primary" />
        <StatCard icon={CalendarCheck} label="Reviews due" value={`${stats.reviewsDue}`} sub="spaced for memory" tone="text-warning" />
        <StatCard
          icon={Target}
          label="Today"
          value={`${day.done}/${day.goal}`}
          sub={day.complete ? "Daily goal reached 🎉" : "problems toward your daily goal"}
          tone="text-info"
          progress={Math.min(1, day.done / day.goal)}
        />
      </section>

      <TodayPlan day={day} mode={user?.learningMode ?? "path"} />
      <Upcoming day={day} />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Your learning queues</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={queues.review.length ? "review" : queues.challenge.length ? "challenge" : "next"}>
              <TabsList className="w-full overflow-x-auto [scrollbar-width:none]">
                {(["review", "challenge", "next", "continue"] as QueueKind[]).map((k) => (
                  <TabsTrigger key={k} value={k} className="gap-1.5">
                    {queueMeta[k].label}
                    <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums">{queues[k].length}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
              {(["review", "challenge", "next", "continue"] as QueueKind[]).map((k) => (
                <TabsContent key={k} value={k} className="mt-3">
                  <QueueList items={queues[k]} kind={k} />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <LeagueCard />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                This week <span className="text-xs font-normal text-muted-foreground">problems per day</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WeekBars days={stats.week.map((d) => ({ day: d.day, value: d.problems }))} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Hourglass className="size-4 text-chart-2" /> Time on site
                </span>
                <Link href="/progress" className="text-xs font-medium text-primary hover:underline">
                  See trends
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-6">
                <div>
                  <div className="text-2xl font-semibold tabular-nums">{minutes(stats.time.todayMinutes)}</div>
                  <div className="text-xs text-muted-foreground">today</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold tabular-nums">{minutes(stats.time.weekMinutes)}</div>
                  <div className="text-xs text-muted-foreground">last 7 days</div>
                </div>
              </div>
              <WeekBars days={stats.time.week.map((d) => ({ day: d.day, value: d.minutes }))} format={shortMinutes} barClassName="from-chart-2 to-chart-1" min={10} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Course progress
                <Link href="/courses/foundations" className="text-xs font-medium text-primary hover:underline">
                  Open map
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {course.units.map((u) => {
                const p = progress?.units.find((x) => x.unitId === u.id);
                return (
                  <div key={u.id} className="flex items-center gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted">
                      <UnitIcon name={u.icon} className="size-3.5 text-muted-foreground" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between text-xs">
                        <span className="truncate font-medium">{u.title}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {p?.mastered ?? 0}/{u.exercises.length}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <motion.div className="h-full rounded-full bg-gradient-to-r from-primary to-chart-2" initial={{ width: 0 }} animate={{ width: `${(p?.mastery ?? 0) * 100}%` }} transition={{ duration: 0.8 }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StreakBadge({ current, longest, activeToday }: { current: number; longest: number; activeToday: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3">
      <motion.div
        animate={current > 0 ? { scale: [1, 1.12, 1] } : {}}
        transition={{ repeat: Infinity, duration: 2.4 }}
        className={cn("grid size-11 place-items-center rounded-xl", current > 0 ? "bg-gradient-to-br from-chart-3 to-chart-4 text-white shadow-md shadow-chart-4/30" : "bg-muted text-muted-foreground")}
      >
        <Flame className="size-6" />
      </motion.div>
      <div>
        <div className="text-2xl font-semibold tabular-nums">
          {current} <span className="text-sm font-normal text-muted-foreground">day streak</span>
        </div>
        <div className="text-xs text-muted-foreground">{activeToday ? "Done for today ✓" : current > 0 ? "Practise today to keep it" : "Solve a problem to start one"} · best {longest}</div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, tone, progress }: { icon: typeof Flame; label: string; value: string; sub: string; tone: string; progress?: number }) {
  return (
    <Card className="gap-0 py-4">
      <CardContent className="px-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Icon className={cn("size-4", tone)} /> {label}
        </div>
        <div className="mt-1 text-3xl font-semibold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
        {progress !== undefined && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div className="h-full rounded-full bg-info" initial={{ width: 0 }} animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.8 }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** The day's share of the plan. It stops growing once the daily goal is met and says so. */
function TodayPlan({ day, mode }: { day: DayPlan; mode: LearningMode }) {
  const left = Math.max(0, day.goal - day.done);
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <h2 className="text-lg font-semibold">Today&apos;s plan</h2>
          <p className="text-xs text-muted-foreground">
            {day.complete
              ? "All done. A fresh plan arrives tomorrow."
              : `About ${left} more problem${left === 1 ? "" : "s"} to reach your daily goal`}
          </p>
        </div>
        <GoalMeter done={day.done} goal={day.goal} />
      </div>
      {day.complete ? (
        <DayComplete day={day} mode={mode} />
      ) : (
        <div className="space-y-3">
          {day.completed.length > 0 && <CompletedList items={day.completed} />}
          {day.today.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {day.today.map((r, i) => (
                <PlanCard key={r.exerciseId} rec={r} index={i} featured={i === 0} />
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nothing is lined up right now.{" "}
              <Link href="/courses/foundations" className="font-medium text-primary hover:underline">
                Open the course
              </Link>{" "}
              to pick a lesson.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function GoalMeter({ done, goal }: { done: number; goal: number }) {
  const complete = done >= goal;
  return (
    <div className="flex items-center gap-2.5 text-xs text-muted-foreground" aria-label={`${done} of ${goal} problems today`}>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
        <motion.div className={cn("h-full rounded-full", complete ? "bg-success" : "bg-info")} initial={{ width: 0 }} animate={{ width: `${Math.min(1, done / goal) * 100}%` }} transition={{ duration: 0.8 }} />
      </div>
      <span className="tabular-nums">
        <span className={cn("font-semibold", complete ? "text-success" : "text-foreground")}>{done}</span>/{goal} problems
      </span>
    </div>
  );
}

function DayComplete({ day, mode }: { day: DayPlan; mode: LearningMode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-success/30 bg-gradient-to-br from-success/[0.10] via-card to-card p-6 sm:p-8"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <motion.div
          initial={{ scale: 0.4, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
          className="grid size-14 shrink-0 place-items-center rounded-2xl bg-success text-white shadow-lg shadow-success/25"
        >
          <Check className="size-7" strokeWidth={3} />
        </motion.div>
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h3 className="font-display text-2xl sm:text-3xl">That&apos;s today done</h3>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              You solved {day.done} problem{day.done === 1 ? "" : "s"} and met your daily goal of {day.goal}. Nothing more will be added to today&apos;s plan. If you have
              energy left, get ahead with what&apos;s upcoming, or {mode === "audit" ? "explore any lesson in the course" : "pick any lesson you've unlocked in the course"}.
            </p>
          </div>
          {day.completed.length > 0 && <CompletedList items={day.completed} />}
          <div className="flex flex-wrap items-center gap-2">
            {day.upcoming.length > 0 && (
              <ButtonLink href="#upcoming" className="gap-1.5">
                Keep going with Upcoming <ArrowDown className="size-4" />
              </ButtonLink>
            )}
            <ButtonLink href="/courses/foundations" variant="outline" className="gap-1.5">
              <MapIcon className="size-4" /> Browse the course
            </ButtonLink>
            <Link href="/settings" className="px-2 text-xs text-muted-foreground hover:text-foreground hover:underline">
              Want more each day? Raise your goal
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const MODE_LABEL: Record<CompletedToday["mode"], string> = { learn: "Practised", review: "Reviewed", challenge: "Strengthened" };

/** Sessions finished today, ticked off. */
function CompletedList({ items }: { items: CompletedToday[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Done today</span>
      {items.map((c) => {
        const ref = exerciseRef(c.exerciseId);
        if (!ref) return null;
        return (
          <Link
            key={c.exerciseId}
            href={`/courses/foundations/${c.exerciseId}`}
            title={`${MODE_LABEL[c.mode]} · ${Math.round(c.mastery * 100)}% mastered`}
            className="inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 py-1 pr-3 pl-1.5 text-xs font-medium transition-colors hover:border-success/50"
          >
            <span className="grid size-4 place-items-center rounded-full bg-success text-white">
              <Check className="size-2.5" strokeWidth={3.5} />
            </span>
            <span>{ref.exercise.title}</span>
          </Link>
        );
      })}
    </div>
  );
}

/** What comes after today's share, for anyone who wants to keep going. */
function Upcoming({ day }: { day: DayPlan }) {
  if (day.upcoming.length === 0) return null;
  return (
    <section id="upcoming" className="scroll-mt-24">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <h2 className="text-lg font-semibold">Upcoming</h2>
          <p className="text-xs text-muted-foreground">
            {day.complete ? "Optional. A head start on what's next." : "Lined up after today's plan"}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">Mixed for you: review, repair and new ideas</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {day.upcoming.map((r, i) => (
          <PlanCard key={r.exerciseId} rec={r} index={i} featured={false} compact />
        ))}
      </div>
    </section>
  );
}

function PlanCard({ rec, index, featured, compact = false }: { rec: Recommendation; index: number; featured: boolean; compact?: boolean }) {
  const ref = exerciseRef(rec.exerciseId);
  if (!ref) return null;
  const m = queueMeta[rec.kind];
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07 }}>
      <LessonLink
        id={rec.exerciseId}
        query={`mode=${m.mode}`}
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all",
          compact ? "p-4" : "p-5",
          featured && "border-primary/30 bg-gradient-to-br from-primary/[0.09] via-card to-card",
        )}
        openClassName="hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
        lockedClassName="bg-none"
      >
        <div className="flex items-start justify-between gap-2">
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", m.className)}>
            <m.icon className="size-3" /> {m.label}
          </span>
          {rec.kind !== "next" && <MasteryRing value={rec.effectiveMastery} size={compact ? 30 : 36} stroke={3.5} />}
        </div>
        <div className={cn("text-xs text-muted-foreground", compact ? "mt-2" : "mt-3")}>{ref.unit.title}</div>
        <div className={cn("leading-snug font-semibold group-hover:text-primary", compact ? "text-base" : "text-lg")}>{ref.exercise.title}</div>
        <p className={cn("mt-1 flex-1 text-sm text-muted-foreground", compact && "line-clamp-2")}>{rec.reason}</p>
        {!compact && rec.brushUp && rec.brushUp.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Brush up: {rec.brushUp.map((id) => exerciseRef(id)?.exercise.title).join(", ")}
          </p>
        )}
        <div className={cn("flex items-center justify-between text-xs text-muted-foreground", compact ? "mt-3" : "mt-4")}>
          <span>~{ref.exercise.estimatedMinutes} min</span>
          <span className="flex items-center gap-1 font-semibold text-primary opacity-80 transition-all group-hover:gap-2 group-hover:opacity-100">
            {featured ? "Start here" : "Start"} <ArrowRight className="size-3.5" />
          </span>
        </div>
      </LessonLink>
    </motion.div>
  );
}

const EMPTY: Record<QueueKind, string> = {
  review: "Nothing due — your memory is in great shape. Reviews appear here as they fall due.",
  challenge: "No weak spots right now. Topics you find tricky will show up here with targeted practice.",
  next: "You've started everything! Keep reviewing to reach mastery.",
  continue: "Nothing in progress. Start something new from Today's plan or Upcoming.",
};

function QueueList({ items, kind }: { items: Recommendation[]; kind: QueueKind }) {
  if (items.length === 0) return <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{EMPTY[kind]}</p>;
  const m = queueMeta[kind];
  return (
    <ul className="divide-y">
      {items.map((r) => {
        const ref = exerciseRef(r.exerciseId)!;
        return (
          <li key={r.exerciseId}>
            <LessonLink id={r.exerciseId} query={`mode=${m.mode}`} className="group flex items-center gap-3 border-0 py-3" lockedClassName="bg-transparent">
              {kind === "next" ? (
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10">
                  <UnitIcon name={ref.unit.icon} className="size-4 text-primary" />
                </span>
              ) : (
                <MasteryRing value={r.effectiveMastery} size={36} stroke={3.5} />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium group-hover:text-primary">{ref.exercise.title}</div>
                <div className="truncate text-xs text-muted-foreground">{r.reason}</div>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </LessonLink>
          </li>
        );
      })}
    </ul>
  );
}

/** The last 7 days as small bars, today last. `min` keeps a quiet week from looking full. */
function WeekBars({ days: values, format = String, barClassName = "from-primary to-chart-5", min = 5 }: { days: { day: string; value: number }[]; format?: (v: number) => string; barClassName?: string; min?: number }) {
  const [now] = useState(() => Date.now());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    return { key, label: d.toLocaleDateString("en", { weekday: "narrow" }), value: values.find((w) => w.day === key)?.value ?? 0 };
  });
  const max = Math.max(min, ...days.map((d) => d.value));
  return (
    <div className="flex h-32 items-end gap-2">
      {days.map((d, i) => (
        <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[10px] whitespace-nowrap text-muted-foreground tabular-nums">{d.value ? format(d.value) : ""}</span>
          <motion.div
            className={cn("w-full rounded-md", d.value ? cn("bg-gradient-to-t", barClassName) : "bg-muted")}
            initial={{ height: 4 }}
            animate={{ height: `${Math.max(4, (d.value / max) * 80)}%` }}
            transition={{ delay: i * 0.05 }}
          />
          <span className={cn("text-[11px] text-muted-foreground", i === 6 && "font-semibold text-foreground")}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-20 w-72" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  );
}
