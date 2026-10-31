"use client";

import type { Tone } from "@fmc/curriculum";
import type { ReactNode } from "react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export const toneVar: Record<Tone, string> = {
  primary: "var(--primary)",
  accent: "var(--chart-2)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  muted: "var(--muted-foreground)",
};

export const tone = (t?: Tone) => toneVar[t ?? "primary"];

/** Consistent frame for every visual, with an optional controls area. */
export function VisualFrame({ children, controls, interactive, className }: { children: ReactNode; controls?: ReactNode; interactive?: boolean; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl border bg-card/60 bg-dots", className)}>
      {interactive && (
        <span className="absolute top-2 right-2 z-10 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-primary uppercase">
          Interactive
        </span>
      )}
      <div className="p-3 sm:p-4">{children}</div>
      {controls && <div className="grid gap-4 border-t bg-muted/40 px-4 py-3 sm:grid-cols-2">{controls}</div>}
    </div>
  );
}

export function LabeledSlider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format = (v) => `${v}`,
}: {
  label: ReactNode;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="flex items-center justify-between font-medium">
        <span>{label}</span>
        <span className="rounded-md bg-background px-1.5 py-0.5 font-mono text-xs tabular-nums">{format(value)}</span>
      </span>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(Array.isArray(v) ? (v[0] ?? value) : (v as number))} />
    </label>
  );
}

export const fmt = (x: number, dp = 2) => {
  const r = Math.round(x * 10 ** dp) / 10 ** dp;
  return Object.is(r, -0) ? "0" : `${r}`;
};
