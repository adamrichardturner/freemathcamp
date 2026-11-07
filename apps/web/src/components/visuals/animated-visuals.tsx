"use client";

import type { Visual } from "@fmc/curriculum";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Md } from "@/components/math/md";
import { Tex } from "@/components/math/tex";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VisualFrame } from "./shared";

type V<T extends Visual["type"]> = Extract<Visual, { type: T }>;

const STEP_MS = 2400;

/* ---------------- Step-through derivation ---------------- */

export function StepThrough({ steps }: V<"stepThrough">) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5 });
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(!reduced);
  const last = steps.length - 1;
  const done = index >= last;
  const running = playing && inView && !done;

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setIndex((i) => Math.min(i + 1, last)), STEP_MS);
    return () => clearTimeout(t);
  }, [running, index, last]);

  const go = (i: number) => {
    setPlaying(false);
    setIndex(Math.max(0, Math.min(last, i)));
  };

  return (
    <VisualFrame>
      <div ref={ref} className="space-y-4">
        <ol className="space-y-1.5" aria-live="polite">
          <AnimatePresence initial={false}>
            {steps.slice(0, index + 1).map((s, i) => (
              <motion.li
                key={i}
                layout
                initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
                animate={{ opacity: i === index ? 1 : 0.45, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className={cn("rounded-lg px-3 py-2 transition-colors", i === index && "bg-primary/[0.07] ring-1 ring-primary/20")}
              >
                <Tex tex={s.tex} display className={cn("transition-[font-size] duration-300", i === index ? "text-xl" : "text-base")} />
                {s.note && i === index && <Md md={s.note} className="mt-1 text-center text-sm text-muted-foreground" />}
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
        <div className="flex items-center gap-3 border-t pt-3">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" aria-label="Previous step" disabled={index === 0} onClick={() => go(index - 1)}>
              <ChevronLeft />
            </Button>
            <Button
              variant="secondary"
              size="icon-sm"
              aria-label={done ? "Replay" : running ? "Pause" : "Play"}
              onClick={() => {
                if (done) {
                  setIndex(0);
                  setPlaying(true);
                } else setPlaying(!playing);
              }}
            >
              {done ? <RotateCcw /> : running ? <Pause /> : <Play />}
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Next step" disabled={done} onClick={() => go(index + 1)}>
              <ChevronRight />
            </Button>
          </div>
          <div className="flex flex-1 items-center gap-1.5" role="tablist" aria-label="Steps">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Step ${i + 1}`}
                onClick={() => go(i)}
                className="group relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
              >
                {/* The current segment fills over the step's duration, like a story progress bar. */}
                <motion.span
                  key={i === index && running ? `run-${index}` : `rest-${i}`}
                  className="absolute inset-y-0 left-0 rounded-full bg-primary"
                  initial={i === index && running ? { width: "0%" } : false}
                  animate={{ width: i <= index ? "100%" : "0%" }}
                  transition={i === index && running ? { duration: STEP_MS / 1000, ease: "linear" } : { duration: 0.3 }}
                />
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {index + 1}/{steps.length}
          </span>
        </div>
      </div>
    </VisualFrame>
  );
}

/* ---------------- Pascal's triangle ---------------- */

const binomial = (n: number, k: number) => {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - i + 1)) / i;
  return Math.round(r);
};

export function PascalTriangle({ rows, highlightRow }: V<"pascalTriangle">) {
  const [hover, setHover] = useState<[number, number] | null>(null);
  const isParent = (n: number, k: number) => hover !== null && n === hover[0] - 1 && (k === hover[1] - 1 || k === hover[1]);
  return (
    <VisualFrame>
      <div className="flex flex-col items-center gap-1.5 py-2" onMouseLeave={() => setHover(null)}>
        {Array.from({ length: rows }, (_, n) => (
          <div key={n} className="flex items-center gap-1.5">
            {/* Row labels, and the spacer balancing them, only where there's room: a phone needs the width for the numbers. */}
            <span className="mr-2 hidden w-12 text-right text-xs text-muted-foreground tabular-nums sm:inline">row {n}</span>
            {Array.from({ length: n + 1 }, (_, k) => {
              const value = binomial(n, k);
              const hovered = hover?.[0] === n && hover[1] === k;
              return (
                <motion.button
                  key={k}
                  type="button"
                  aria-label={`Row ${n}, entry ${k}: ${value}`}
                  onMouseEnter={() => setHover([n, k])}
                  onFocus={() => setHover([n, k])}
                  initial={{ opacity: 0, scale: 0.4, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: n * 0.18 + k * 0.04, type: "spring", stiffness: 260, damping: 18 }}
                  className={cn(
                    "grid h-8 min-w-8 place-items-center rounded-full border px-1.5 text-sm font-semibold tabular-nums transition-colors sm:h-9 sm:min-w-9",
                    n === highlightRow ? "border-primary/50 bg-primary/15 text-primary" : "bg-card",
                    isParent(n, k) && "border-chart-2 bg-chart-2/20 text-foreground",
                    hovered && "border-warning bg-warning/20 text-foreground",
                  )}
                >
                  {value}
                </motion.button>
              );
            })}
            <span className="ml-2 hidden w-12 sm:inline" />
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {hover && hover[0] > 0 && hover[1] > 0 && hover[1] < hover[0]
          ? `${binomial(hover[0] - 1, hover[1] - 1)} + ${binomial(hover[0] - 1, hover[1])} = ${binomial(hover[0], hover[1])}`
          : "Point at a number to see the two above it that add to make it."}
      </p>
    </VisualFrame>
  );
}
