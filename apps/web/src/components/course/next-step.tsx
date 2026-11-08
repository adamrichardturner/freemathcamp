"use client";

import { ArrowRight, BookOpen, Dumbbell, Repeat, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import type { PracticeMode } from "@/lib/api";
import type { NextStep } from "@/lib/next-step";
import { cn } from "@/lib/utils";

const TONE: Record<PracticeMode, { icon: typeof Repeat; chip: string; glow: string; from: string; to: string }> = {
  review: { icon: Repeat, chip: "bg-warning/15 text-warning", glow: "shadow-warning/20", from: "var(--warning)", to: "var(--chart-4)" },
  challenge: { icon: Dumbbell, chip: "bg-danger/12 text-danger", glow: "shadow-danger/20", from: "var(--danger)", to: "var(--chart-3)" },
  learn: { icon: Sparkles, chip: "bg-primary/12 text-primary", glow: "shadow-primary/20", from: "var(--primary)", to: "var(--chart-5)" },
};

/**
 * The call to practise, when practice is what's due: a card with a slowly turning
 * gradient edge and a pulsing icon, so it reads as the next move at a glance.
 */
export function PracticeDueBanner({ step, onStart }: { step: Extract<NextStep, { kind: "practice" }>; onStart: () => void }) {
  const reduce = useReducedMotion();
  const t = TONE[step.mode];
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.1 }}
      className={cn("relative overflow-hidden rounded-2xl p-[1.5px] shadow-lg", t.glow)}
    >
      <motion.div
        aria-hidden
        className="absolute top-1/2 left-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2"
        style={{ background: `conic-gradient(from 0deg, ${t.from}, var(--chart-2), transparent 35%, transparent 60%, ${t.from})` }}
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ repeat: Infinity, duration: 7, ease: "linear" }}
      />
      <div className="relative flex flex-col gap-4 rounded-[calc(1rem-1.5px)] bg-card p-5 sm:flex-row sm:items-center sm:gap-5">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <span
            className="relative grid size-12 shrink-0 place-items-center rounded-2xl text-white shadow-md"
            style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
          >
            {!reduce && (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-2xl border-2"
                style={{ borderColor: t.from }}
                animate={{ scale: [1, 1.45], opacity: [0.6, 0] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut" }}
              />
            )}
            <t.icon className="size-6" />
          </span>
          <div className="min-w-0">
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", t.chip)}>
              <t.icon className="size-3" /> {step.label}
            </span>
            <div className="mt-1 text-lg leading-snug font-semibold">{step.title}</div>
            <p className="mt-0.5 text-sm text-muted-foreground">{step.text}</p>
          </div>
        </div>
        <Button size="lg" className="group h-11 shrink-0 px-6" onClick={onStart}>
          {step.cta}
          <motion.span className="inline-flex" animate={reduce ? undefined : { x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}>
            <ArrowRight />
          </motion.span>
        </Button>
      </div>
    </motion.div>
  );
}

/** A small "do this first" marker for a tab: a step number, or a pulsing dot when it's due. */
export function StepMarker({ n, due, done }: { n: number; due?: boolean; done?: boolean }) {
  const reduce = useReducedMotion();
  if (due)
    return (
      <span className="relative flex size-2" aria-hidden>
        {!reduce && <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />}
        <span className="relative inline-flex size-2 rounded-full bg-primary" />
      </span>
    );
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-4 place-items-center rounded-full text-[10px] font-bold tabular-nums transition-colors",
        done ? "bg-success/15 text-success" : "bg-foreground/10 text-current group-data-active:bg-primary group-data-active:text-primary-foreground",
      )}
    >
      {n}
    </span>
  );
}

/** "Due" beside the Practice tab's label, popping in. */
export function DueChip() {
  return (
    <motion.span
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.3 }}
      className="rounded-full bg-primary px-1.5 py-px text-[10px] leading-4 font-semibold text-primary-foreground"
    >
      Due
    </motion.span>
  );
}

/** One line under the tabs on a fresh lesson saying what the page is for, in order. */
export function LessonFirstHint({ minutes, onPractise }: { minutes: number; onPractise: () => void }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground"
    >
      <BookOpen className="size-4 text-primary" />
      <span>
        <span className="font-medium text-foreground">Start here.</span> Read the lesson (~{minutes} min), then
      </span>
      <button type="button" onClick={onPractise} className="font-medium text-primary underline-offset-2 hover:underline">
        practise it
      </button>
      <span>to lock it in.</span>
    </motion.p>
  );
}
