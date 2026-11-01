"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { TimePeriod, TimeSeries } from "@/lib/api";
import { minutes } from "@/lib/format";
import { cn } from "@/lib/utils";

export type TimeUnit = "day" | "week" | "month";

const SERIES: Record<TimeUnit, keyof TimeSeries> = { day: "daily", week: "weekly", month: "monthly" };
const UNIT_LABEL: Record<TimeUnit, string> = { day: "Day", week: "Week", month: "Month" };
/** What the chart covers, for card descriptions. */
export const UNIT_WINDOW: Record<TimeUnit, string> = { day: "last 30 days", week: "last 12 weeks", month: "last 12 months" };

const utc = (period: string) => new Date(`${period}T00:00:00Z`);
const tick: Record<TimeUnit, (p: string) => string> = {
  day: (p) => utc(p).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
  week: (p) => utc(p).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
  month: (p) => utc(p).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }),
};
const label: Record<TimeUnit, (p: string) => string> = {
  day: (p) => utc(p).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }),
  week: (p) => `Week of ${tick.week(p)}`,
  month: (p) => utc(p).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
};

/** Round steps in minutes, so the axis reads 15m, 30m, 1h, 2h… rather than wherever the maximum lands. */
const STEPS = [5, 10, 15, 30, 60, 120, 180, 300, 600, 1200, 3000, 6000, 12000, 30000, 60000];
const niceTicks = (max: number) => {
  const step = STEPS.find((s) => max / s <= 4) ?? STEPS.at(-1)!;
  return Array.from({ length: Math.max(1, Math.ceil(max / step)) + 1 }, (_, i) => i * step);
};
const axisLabel = (m: number) => (m >= 60 ? `${m / 60}h` : `${m}m`);

const config = { minutes: { label: "Time on site", color: "var(--chart-2)" } } satisfies ChartConfig;

/** Day / Week / Month switch shared by every time-on-site chart. */
export function UnitToggle({ unit, onChange, className }: { unit: TimeUnit; onChange: (u: TimeUnit) => void; className?: string }) {
  return (
    <ToggleGroup value={[unit]} onValueChange={(v) => v[0] && onChange(v[0] as TimeUnit)} variant="outline" size="sm" aria-label="Group time by" className={className}>
      {(Object.keys(UNIT_LABEL) as TimeUnit[]).map((u) => (
        <ToggleGroupItem key={u} value={u}>
          {UNIT_LABEL[u]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

export const useTimeUnit = (initial: TimeUnit = "day") => useState<TimeUnit>(initial);

/** Minutes active on the site per day, week or month. `perLearner` adds the average for each active learner to the tooltip. */
export function TimeChart({ series, unit, perLearner, className }: { series: TimeSeries; unit: TimeUnit; perLearner?: boolean; className?: string }) {
  const ticks = niceTicks(Math.max(1, ...series[SERIES[unit]].map((p) => p.minutes)));
  const rows: (TimePeriod & { perLearner: number | null })[] = series[SERIES[unit]].map((p) => ({ ...p, perLearner: p.users ? p.minutes / p.users : null }));
  return (
    <ChartContainer config={config} className={cn("aspect-auto h-56 w-full", className)}>
      <BarChart data={rows} margin={{ left: -12, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="period" tickLine={false} axisLine={false} minTickGap={20} fontSize={11} tickFormatter={tick[unit]} />
        <YAxis tickLine={false} axisLine={false} fontSize={11} ticks={ticks} domain={[0, ticks.at(-1)!]} tickFormatter={axisLabel} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => label[unit](String(payload?.[0]?.payload?.period ?? ""))}
              formatter={(value, _name, item) => {
                const row = item.payload as (typeof rows)[number];
                return (
                  <div className="flex w-full flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="size-2.5 rounded-[2px] bg-(--color-minutes)" /> Time on site
                      </span>
                      <span className="font-mono font-medium text-foreground tabular-nums">{minutes(Number(value))}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {row.visits} {row.visits === 1 ? "visit" : "visits"}
                      {perLearner && row.users ? ` · ${row.users} ${row.users === 1 ? "learner" : "learners"} · ${minutes(row.perLearner ?? 0)} each` : ""}
                    </div>
                  </div>
                );
              }}
            />
          }
        />
        <Bar dataKey="minutes" fill="var(--color-minutes)" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ChartContainer>
  );
}
