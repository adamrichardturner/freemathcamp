"use client";

import { ArrowRight, CalendarCheck, Flame, GraduationCap, Sparkles, Target } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { MasteryRing, queueMeta } from "@/components/app/status";
import { UnitIcon } from "@/components/app/unit-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VerifyEmailCard } from "@/components/app/verify-email-card";
import { useCourseProgress, useDashboard, useSession } from "@/hooks/queries";
import type { QueueKind, Recommendation } from "@/lib/api";
import { course, exerciseRef, lessonHref } from "@/lib/course";
import { greeting } from "@/lib/format";
import { cn } from "@/lib/utils";

export function DashboardView() {
  const { user, ready, verified } = useSession();
  const { data, isLoading } = useDashboard(verified);
  const { data: progress } = useCourseProgress(verified);

  if (ready && user && !verified) return <VerifyEmailCard user={user} />;
  if (isLoading || !data) return <DashboardSkeleton />;
  const { queues, stats } = data;
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
          value={`${stats.today.problems}/${user?.dailyGoal ?? 10}`}
          sub={stats.today.problems >= (user?.dailyGoal ?? 10) ? "Daily goal reached 🎉" : "problems toward your daily goal"}
          tone="text-info"
          progress={Math.min(1, stats.today.problems / (user?.dailyGoal ?? 10))}
        />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Today&apos;s plan</h2>
          <span className="text-xs text-muted-foreground">Mixed for you: review, repair and new ideas</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {queues.plan.map((r, i) => (
            <PlanCard key={r.exerciseId} rec={r} index={i} featured={i === 0} />
          ))}
        </div>
      </section>

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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                This week <span className="text-xs font-normal text-muted-foreground">problems per day</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WeekBars week={stats.week} />
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

function PlanCard({ rec, index, featured }: { rec: Recommendation; index: number; featured: boolean }) {
  const ref = exerciseRef(rec.exerciseId);
  if (!ref) return null;
  const m = queueMeta[rec.kind];
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07 }}>
      <Link
        href={`${lessonHref(rec.exerciseId)}?mode=${m.mode}`}
        className={cn(
          "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5",
          featured && "border-primary/30 bg-gradient-to-br from-primary/[0.09] via-card to-card",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", m.className)}>
            <m.icon className="size-3" /> {m.label}
          </span>
          {rec.kind !== "next" && <MasteryRing value={rec.effectiveMastery} size={36} stroke={3.5} />}
        </div>
        <div className="mt-3 text-xs text-muted-foreground">{ref.unit.title}</div>
        <div className="text-lg leading-snug font-semibold group-hover:text-primary">{ref.exercise.title}</div>
        <p className="mt-1 flex-1 text-sm text-muted-foreground">{rec.reason}</p>
        {rec.brushUp && rec.brushUp.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Brush up: {rec.brushUp.map((id) => exerciseRef(id)?.exercise.title).join(", ")}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>~{ref.exercise.estimatedMinutes} min</span>
          <span className="flex items-center gap-1 font-semibold text-primary opacity-80 transition-all group-hover:gap-2 group-hover:opacity-100">
            {featured ? "Start here" : "Start"} <ArrowRight className="size-3.5" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

const EMPTY: Record<QueueKind, string> = {
  review: "Nothing due — your memory is in great shape. Reviews appear here as they fall due.",
  challenge: "No weak spots right now. Topics you find tricky will show up here with targeted practice.",
  next: "You've started everything! Keep reviewing to reach mastery.",
  continue: "Nothing in progress. Start something new from Today's plan.",
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
            <Link href={`${lessonHref(r.exerciseId)}?mode=${m.mode}`} className="group flex items-center gap-3 py-3">
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
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function WeekBars({ week }: { week: { day: string; problems: number }[] }) {
  const [now] = useState(() => Date.now());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    return { key, label: d.toLocaleDateString("en", { weekday: "narrow" }), problems: week.find((w) => w.day === key)?.problems ?? 0 };
  });
  const max = Math.max(5, ...days.map((d) => d.problems));
  return (
    <div className="flex h-32 items-end gap-2">
      {days.map((d, i) => (
        <div key={d.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="text-[10px] text-muted-foreground tabular-nums">{d.problems || ""}</span>
          <motion.div
            className={cn("w-full rounded-md", d.problems ? "bg-gradient-to-t from-primary to-chart-5" : "bg-muted")}
            initial={{ height: 4 }}
            animate={{ height: `${Math.max(4, (d.problems / max) * 80)}%` }}
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
