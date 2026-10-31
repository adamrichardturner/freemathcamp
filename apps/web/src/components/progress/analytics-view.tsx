"use client";

import { Activity, Brain, Clock, Eye, Flame, Lightbulb, Target, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, XAxis, YAxis, Area } from "recharts";
import { ButtonLink } from "@/components/app/button-link";
import { MasteryRing, statusMeta } from "@/components/app/status";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalytics } from "@/hooks/queries";
import type { Analytics } from "@/lib/api";
import { lessonHref } from "@/lib/course";
import { duration, pct, relative } from "@/lib/format";
import { cn } from "@/lib/utils";

const DAY = 86_400_000;
const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10);

export function AnalyticsView() {
  const { data, isLoading } = useAnalytics();
  if (isLoading || !data) return <Skeleton className="h-[80vh] rounded-2xl" />;
  const t = data.totals;

  if (t.problems === 0)
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Activity className="size-7" />
        </span>
        <h1 className="font-display text-4xl">Your progress lives here</h1>
        <p className="text-muted-foreground">Solve your first problems and this page fills with insights: accuracy trends, struggle areas, mastery by unit and your daily streak.</p>
        <ButtonLink href="/learn">Go to today&apos;s plan</ButtonLink>
      </div>
    );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl sm:text-5xl">Your progress</h1>
        <p className="mt-1 text-muted-foreground">How you&apos;re learning, where you&apos;re strong, and what to work on next.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={Target} label="Problems solved" value={t.problems.toLocaleString()} sub={`${t.sessions} sessions`} />
        <Kpi icon={TrendingUp} label="First-try accuracy" value={pct(t.accuracy)} sub={`${t.cleanSolves} clean solves`} />
        <Kpi icon={Clock} label="Time learning" value={duration(t.timeMs)} sub={`${t.hintsUsed} hints · ${t.reveals} reveals`} />
        <Kpi icon={Flame} label="Streak" value={`${t.streak.current} day${t.streak.current === 1 ? "" : "s"}`} sub={`Longest ${t.streak.longest}`} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>Problems per day, last 18 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <Heatmap daily={data.daily} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Course mastery</CardTitle>
            <CardDescription>
              {t.exercisesMastered} mastered · {t.exercisesStarted} started · {t.exercisesTotal} total
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <MasteryRing value={data.units.reduce((a, u) => a + u.mastery * u.total, 0) / t.exercisesTotal} size={150} stroke={12}>
              <span className="text-2xl">{pct(data.units.reduce((a, u) => a + u.mastery * u.total, 0) / t.exercisesTotal)}</span>
            </MasteryRing>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Practice & accuracy</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart daily={data.daily} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Mastery by unit</CardTitle>
            <CardDescription>Shape of your knowledge across the course</CardDescription>
          </CardHeader>
          <CardContent>
            <UnitRadar units={data.units} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <LessonList title="Strongest topics" icon={Brain} items={data.strongest} metric={(v) => pct(v.effectiveMastery)} empty="Keep practising to build strengths." />
        <LessonList title="Needs attention" icon={Lightbulb} items={data.weakest.filter((w) => w.struggle > 0.15 && w.itemsSeen >= 3)} metric={(v) => `struggle ${pct(v.struggle)}`} empty="No trouble spots — impressive!" warn />
        <Card>
          <CardHeader>
            <CardTitle>By difficulty</CardTitle>
            <CardDescription>First-try accuracy at each level</CardDescription>
          </CardHeader>
          <CardContent>
            <LevelBars levels={data.levels} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {data.recentSessions.map((s) => {
              const delta = (s.masteryAfter ?? s.masteryBefore) - s.masteryBefore;
              return (
                <li key={s.id}>
                  <Link href={lessonHref(s.exerciseId)} className="flex items-center gap-3 py-2.5 text-sm hover:text-primary">
                    <span className="w-20 shrink-0 rounded-full bg-muted px-2 py-0.5 text-center text-xs font-medium capitalize">{s.mode}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{s.title}</span>
                    <span className={cn("text-xs font-semibold tabular-nums", delta >= 0 ? "text-success" : "text-danger")}>
                      {delta >= 0 ? "+" : ""}
                      {Math.round(delta * 100)}%
                    </span>
                    <span className="hidden w-24 text-right text-xs text-muted-foreground sm:block">{s.completedAt ? relative(s.completedAt) : ""}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub }: { icon: typeof Eye; label: string; value: string; sub: string }) {
  return (
    <Card className="gap-0 py-4">
      <CardContent className="px-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Icon className="size-4 text-primary" /> {label}
        </div>
        <div className="mt-1 text-2xl font-semibold tabular-nums sm:text-3xl">{value}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

function Heatmap({ daily }: { daily: Analytics["daily"] }) {
  const byDay = new Map(daily.map((d) => [d.day, d]));
  const weeks = 18;
  const [end] = useState(() => {
    const today = new Date();
    return Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  });
  // Columns are Monday-first weeks; the last column holds the current week.
  const firstMonday = end - ((new Date(end).getUTCDay() + 6) % 7) * DAY - (weeks - 1) * 7 * DAY;
  const max = Math.max(1, ...daily.map((d) => d.problems));
  const cols = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => firstMonday + (w * 7 + d) * DAY));
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max gap-[3px]">
        {cols.map((col, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            {col.map((t) => {
              const d = byDay.get(isoDay(t));
              const level = d ? Math.ceil((d.problems / max) * 4) : 0;
              return (
                <motion.div
                  key={t}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: t > end ? 0 : 1 }}
                  transition={{ delay: i * 0.015 }}
                  title={`${isoDay(t)}: ${d?.problems ?? 0} problems`}
                  className="size-3 rounded-[3px] sm:size-3.5"
                  style={{ backgroundColor: level === 0 ? "var(--muted)" : `color-mix(in oklch, var(--primary) ${20 + level * 20}%, transparent)` }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
        Less
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className="size-3 rounded-[3px]" style={{ backgroundColor: l === 0 ? "var(--muted)" : `color-mix(in oklch, var(--primary) ${20 + l * 20}%, transparent)` }} />
        ))}
        More
      </div>
    </div>
  );
}

const trendConfig = {
  problems: { label: "Problems", color: "var(--chart-1)" },
  accuracy: { label: "Accuracy %", color: "var(--chart-2)" },
} satisfies ChartConfig;

function TrendChart({ daily }: { daily: Analytics["daily"] }) {
  const byDay = new Map(daily.map((d) => [d.day, d]));
  const [end] = useState(() => Date.now());
  const rows = Array.from({ length: 30 }, (_, i) => {
    const key = isoDay(end - (29 - i) * DAY);
    const d = byDay.get(key);
    return { day: key.slice(5), problems: d?.problems ?? 0, accuracy: d ? Math.round(d.accuracy * 100) : null };
  });
  return (
    <ChartContainer config={trendConfig} className="aspect-auto h-64 w-full">
      <ComposedChart data={rows} margin={{ left: -20, right: 4 }}>
        <defs>
          <linearGradient id="fillProblems" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-problems)" stopOpacity={0.5} />
            <stop offset="95%" stopColor="var(--color-problems)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} interval={6} fontSize={11} />
        <YAxis yAxisId="l" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
        <YAxis yAxisId="r" orientation="right" domain={[0, 100]} hide />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area yAxisId="l" dataKey="problems" type="monotone" fill="url(#fillProblems)" stroke="var(--color-problems)" strokeWidth={2} />
        <Line yAxisId="r" dataKey="accuracy" type="monotone" stroke="var(--color-accuracy)" strokeWidth={2} dot={false} connectNulls />
      </ComposedChart>
    </ChartContainer>
  );
}

const radarConfig = { mastery: { label: "Mastery %", color: "var(--chart-1)" } } satisfies ChartConfig;

function UnitRadar({ units }: { units: Analytics["units"] }) {
  const rows = units.map((u) => ({ unit: u.title.split(/[ &]/)[0], mastery: Math.round(u.mastery * 100) }));
  return (
    <ChartContainer config={radarConfig} className="mx-auto aspect-square max-h-72 w-full">
      <RadarChart data={rows}>
        <ChartTooltip content={<ChartTooltipContent />} />
        <PolarGrid />
        <PolarAngleAxis dataKey="unit" fontSize={10} />
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <Radar dataKey="mastery" fill="var(--color-mastery)" fillOpacity={0.35} stroke="var(--color-mastery)" strokeWidth={2} />
      </RadarChart>
    </ChartContainer>
  );
}

const levelConfig = { accuracy: { label: "Accuracy %", color: "var(--chart-3)" } } satisfies ChartConfig;

function LevelBars({ levels }: { levels: Analytics["levels"] }) {
  const rows = [1, 2, 3].map((l) => {
    const x = levels.find((v) => v.level === l);
    return { level: ["Warm-up", "Core", "Stretch"][l - 1], accuracy: x ? Math.round(x.accuracy * 100) : 0, problems: x?.problems ?? 0 };
  });
  return (
    <ChartContainer config={levelConfig} className="aspect-auto h-48 w-full">
      <BarChart data={rows} margin={{ left: -20 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="level" tickLine={false} axisLine={false} fontSize={11} />
        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="accuracy" fill="var(--color-accuracy)" radius={6} />
      </BarChart>
    </ChartContainer>
  );
}

function LessonList({ title, icon: Icon, items, metric, empty, warn }: { title: string; icon: typeof Eye; items: Analytics["strongest"]; metric: (v: Analytics["strongest"][number]) => string; empty: string; warn?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className={cn("size-4", warn ? "text-warning" : "text-success")} /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="space-y-1">
            {items.map((v) => (
              <li key={v.exerciseId}>
                <Link href={`${lessonHref(v.exerciseId)}${warn ? "?mode=challenge" : ""}`} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                  <MasteryRing value={v.effectiveMastery} size={28} stroke={3} color={statusMeta[v.status].ring}>
                    {""}
                  </MasteryRing>
                  <span className="min-w-0 flex-1 truncate font-medium">{v.title}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{metric(v)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
