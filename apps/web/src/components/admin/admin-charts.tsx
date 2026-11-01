"use client";

import { ArrowDownUp } from "lucide-react";
import { useState } from "react";
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import type { AdminOverview } from "@/lib/api";
import { pct } from "@/lib/format";
import { cn } from "@/lib/utils";

const shortDay = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

const growthConfig = {
  signups: { label: "New accounts", color: "var(--chart-1)" },
  activeUsers: { label: "Active learners", color: "var(--chart-2)" },
} satisfies ChartConfig;

const practiceConfig = {
  problems: { label: "Problems", color: "var(--chart-1)" },
  accuracy: { label: "First-try %", color: "var(--chart-3)" },
} satisfies ChartConfig;

const signInConfig = {
  password: { label: "Email and password", color: "var(--chart-1)" },
  google: { label: "Google", color: "var(--chart-2)" },
  both: { label: "Both", color: "var(--chart-4)" },
} satisfies ChartConfig;

const progressConfig = { users: { label: "Learners", color: "var(--chart-2)" } } satisfies ChartConfig;
const levelConfig = { accuracy: { label: "First-try %", color: "var(--chart-3)" } } satisfies ChartConfig;

export function AdminCharts({ overview }: { overview: AdminOverview }) {
  const daily = overview.daily.map((d) => ({ ...d, accuracy: d.accuracy === null ? null : Math.round(d.accuracy * 100) }));
  const signIn = (["password", "google", "both"] as const).map((k) => ({ method: k, count: overview.signIn[k], fill: `var(--color-${k})` }));
  const levels = overview.levels.map((l) => ({ level: ["Warm-up", "Core", "Stretch"][l.level - 1], accuracy: l.accuracy === null ? 0 : Math.round(l.accuracy * 100), problems: l.problems }));
  const modes = overview.modes;

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Growth</CardTitle>
          <CardDescription>New accounts and learners who practised, last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={growthConfig} className="aspect-auto h-64 w-full">
            <BarChart data={daily} margin={{ left: -20, right: 4 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} minTickGap={24} fontSize={11} tickFormatter={shortDay} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(d) => shortDay(String(d))} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="signups" fill="var(--color-signups)" radius={4} />
              <Bar dataKey="activeUsers" fill="var(--color-activeUsers)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Practice</CardTitle>
          <CardDescription>Problems answered and first-try accuracy, last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={practiceConfig} className="aspect-auto h-64 w-full">
            <ComposedChart data={daily} margin={{ left: -20, right: 4 }}>
              <defs>
                <linearGradient id="adminProblems" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-problems)" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="var(--color-problems)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} minTickGap={24} fontSize={11} tickFormatter={shortDay} />
              <YAxis yAxisId="l" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
              <YAxis yAxisId="r" orientation="right" domain={[0, 100]} hide />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(d) => shortDay(String(d))} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area yAxisId="l" dataKey="problems" type="monotone" fill="url(#adminProblems)" stroke="var(--color-problems)" strokeWidth={2} />
              <Line yAxisId="r" dataKey="accuracy" type="monotone" stroke="var(--color-accuracy)" strokeWidth={2} dot={false} connectNulls />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How people sign in</CardTitle>
          <CardDescription>
            Course mode: {modes.path.toLocaleString()} in Path, {modes.audit.toLocaleString()} in Audit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={signInConfig} className="mx-auto aspect-auto h-60 w-full max-w-sm">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="method" hideLabel />} />
              <Pie data={signIn} dataKey="count" nameKey="method" innerRadius={52} outerRadius={84} strokeWidth={2} stroke="var(--card)" />
              <ChartLegend content={<ChartLegendContent nameKey="method" />} />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Course progress</CardTitle>
          <CardDescription>Learners by share of Foundations mastered</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={progressConfig} className="aspect-auto h-60 w-full">
            <BarChart data={overview.progress} layout="vertical" margin={{ left: 0, right: 8 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
              <YAxis type="category" dataKey="label" width={64} tickLine={false} axisLine={false} fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="users" fill="var(--color-users)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>By difficulty</CardTitle>
          <CardDescription>First-try accuracy at each level, across everyone</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={levelConfig} className="aspect-auto h-44 w-full">
            <BarChart data={levels} margin={{ left: -20 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="level" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={11} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="accuracy" fill="var(--color-accuracy)" radius={6} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </section>
  );
}

type SortKey = "order" | "learners" | "problems" | "accuracy" | "mastered";

/** Every lesson with how much it's practised, how hard it is and how many have mastered it. */
export function LessonTable({ lessons }: { lessons: AdminOverview["lessons"] }) {
  const [sort, setSort] = useState<SortKey>("learners");
  const [filter, setFilter] = useState("");
  const needle = filter.trim().toLowerCase();
  const rows = lessons
    .map((l, order) => ({ ...l, order }))
    .filter((l) => !needle || l.title.toLowerCase().includes(needle) || l.unit.toLowerCase().includes(needle))
    .sort((a, b) => (sort === "order" ? a.order - b.order : sort === "accuracy" ? (a.accuracy ?? 2) - (b.accuracy ?? 2) : b[sort] - a[sort] || a.order - b.order));
  const header = (key: SortKey, label: string, className?: string) => (
    <th className={cn("px-3 py-2 font-medium", className)}>
      <button type="button" onClick={() => setSort(key)} className={cn("inline-flex items-center gap-1 hover:text-foreground", sort === key && "text-foreground")} aria-pressed={sort === key}>
        {label}
        <ArrowDownUp className="size-3" />
      </button>
    </th>
  );
  return (
    <Card>
      <CardHeader className="sm:grid-cols-[1fr_auto]">
        <div>
          <CardTitle>Lessons</CardTitle>
          <CardDescription>Sorted by {sort === "order" ? "course order" : sort === "accuracy" ? "lowest first-try accuracy" : sort}</CardDescription>
        </div>
        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter lessons or units" aria-label="Filter lessons" className="w-full sm:w-56" />
      </CardHeader>
      <CardContent className="px-0">
        <div className="max-h-[28rem] overflow-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="sticky top-0 z-10 bg-card text-left text-xs text-muted-foreground">
              <tr className="border-b">
                {header("order", "Lesson", "pl-4")}
                {header("learners", "Learners", "text-right")}
                {header("problems", "Problems", "text-right")}
                {header("accuracy", "First try", "text-right")}
                {header("mastered", "Mastered", "pr-4 text-right")}
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.exerciseId} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="py-2 pr-3 pl-4">
                    <div className="font-medium">{l.title}</div>
                    <div className="text-xs text-muted-foreground">{l.unit}</div>
                  </td>
                  <td className="px-3 text-right tabular-nums">{l.learners}</td>
                  <td className="px-3 text-right tabular-nums">{l.problems.toLocaleString()}</td>
                  <td className="px-3 text-right tabular-nums">{l.accuracy === null ? "—" : pct(l.accuracy)}</td>
                  <td className="pr-4 pl-3 text-right tabular-nums">{l.mastered}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No lessons match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
