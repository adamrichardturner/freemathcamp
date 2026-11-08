"use client";

import { generateProblem, type Problem } from "@fmc/curriculum";
import { ArrowRight, CalendarClock, Check, ChevronDown, Clock, Eye, LayoutDashboard, Lightbulb, Loader2, RotateCcw, Target, Trophy, X } from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";
import { ButtonLink } from "@/components/app/button-link";
import { MasteryRing, queueMeta } from "@/components/app/status";
import { UnitIcon } from "@/components/app/unit-icon";
import { LessonLink } from "@/components/course/lesson-link";
import { Md } from "@/components/math/md";
import { Tex } from "@/components/math/tex";
import { Button } from "@/components/ui/button";
import type { SessionSummary } from "@/lib/api";
import { exerciseRef, exerciseTitle } from "@/lib/course";
import { duration, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

const headline = (s: SessionSummary) =>
  s.accuracy === 1 ? "Flawless session!" : s.accuracy >= 0.8 ? "Great work!" : s.accuracy >= 0.5 ? "Solid progress" : "Tough one — that's how learning feels";

export function SessionSummaryView({ summary, onAgain, restarting }: { summary: SessionSummary; onAgain: () => void; restarting: boolean }) {
  // Rounded first, so a change too small to show reads as +0% rather than a red "0%".
  const gained = Math.round((summary.mastery.after - summary.mastery.before) * 100);
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-card to-chart-2/10 px-6 py-8 text-center">
        <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", delay: 0.1 }} className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
          <Trophy className="size-7" />
        </motion.div>
        <h3 className="font-display text-3xl sm:text-4xl">{headline(summary)}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{exerciseTitle(summary.exerciseId)}</p>
        <div className="mt-6 flex items-center justify-center gap-6">
          <div className="text-center">
            <MasteryRing value={summary.mastery.before} size={64} stroke={6} color="var(--muted-foreground)" />
            <div className="mt-1 text-xs text-muted-foreground">before</div>
          </div>
          <ArrowRight className="size-5 text-muted-foreground" />
          <div className="text-center">
            <MasteryRing value={summary.mastery.after} size={84} stroke={7}>
              <span className="text-base">{pct(summary.mastery.after)}</span>
            </MasteryRing>
            <div className={cn("mt-1 text-xs font-semibold", gained >= 0 ? "text-success" : "text-danger")}>
              {gained >= 0 ? "+" : ""}
              {gained}% mastery
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x border-y text-center">
        <Stat icon={Target} label="First-try accuracy" value={pct(summary.accuracy)} />
        <Stat icon={Clock} label="Time" value={duration(summary.totalTimeMs)} />
        <Stat icon={CalendarClock} label="Next review" value={summary.intervalDays <= 1 ? "Tomorrow" : `In ${Math.round(summary.intervalDays)} days`} />
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <NextSteps summary={summary} onAgain={onAgain} restarting={restarting} />

        <ProblemBreakdown summary={summary} />

        {summary.brushUp.length > 0 && (
          <div className="rounded-xl border border-warning/30 bg-warning/[0.07] p-4">
            <div className="text-sm font-semibold">This looked tricky. These earlier ideas might help:</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {summary.brushUp.map((id) => (
                <LessonLink key={id} id={id} className="rounded-full border bg-background px-3 py-1 text-sm font-medium transition-colors" openClassName="hover:border-primary hover:text-primary">
                  {exerciseTitle(id)}
                </LessonLink>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Three clear choices: carry on with the next session (a different subject
 * when there is one), practise this lesson again, or go back to the dashboard.
 */
function NextSteps({ summary, onAgain, restarting }: { summary: SessionSummary; onAgain: () => void; restarting: boolean }) {
  const next = summary.upNext[0];
  const ref = next ? exerciseRef(next.exerciseId) : undefined;
  const m = next ? queueMeta[next.kind] : undefined;
  return (
    <div className="space-y-2.5">
      {next && ref && m && (
        <LessonLink
          id={next.exerciseId}
          query={`mode=${m.mode}`}
          className="group flex items-center gap-4 rounded-2xl bg-gradient-to-br from-primary to-[color-mix(in_oklch,var(--primary),var(--chart-5)_35%)] px-4 py-4 text-primary-foreground shadow-lg shadow-primary/25 transition-all sm:px-5"
          openClassName="hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/30"
          lockedClassName="bg-none"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20">
            <UnitIcon name={ref.unit.icon} className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-medium opacity-85">
              Up next · {m.label} · {ref.unit.title}
            </span>
            <span className="block truncate text-base font-semibold sm:text-lg">{ref.exercise.title}</span>
          </span>
          <span className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold sm:inline-flex">Continue</span>
          <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-1" />
        </LessonLink>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          onClick={onAgain}
          disabled={restarting}
          aria-busy={restarting}
          className="h-11 rounded-xl bg-primary/10 text-sm font-semibold text-primary hover:bg-primary/15"
        >
          {restarting ? <Loader2 className="animate-spin" /> : <RotateCcw />} {restarting ? "Starting…" : "Practise again"}
        </Button>
        <ButtonLink href="/learn" variant={next ? "outline" : "default"} className="h-11 rounded-xl text-sm font-semibold">
          <LayoutDashboard /> Dashboard
        </ButtonLink>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="px-2 py-4">
      <Icon className="mx-auto mb-1 size-4 text-muted-foreground" />
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

type SummaryItem = SessionSummary["items"][number];

const LEVEL_LABEL = { 1: "Warm-up", 2: "Core", 3: "Stretch" } as const;

// The same four outcomes the engine scores: clean, slipped, helped, shown.
const OUTCOME = {
  clean: { label: "First try", tally: "first try", icon: Check, dot: "bg-success", badge: "bg-success/12 text-success" },
  slipped: { label: "Extra tries", tally: "after a few tries", icon: X, dot: "bg-warning", badge: "bg-warning/15 text-warning" },
  helped: { label: "Used hints", tally: "with hints", icon: Lightbulb, dot: "bg-chart-2", badge: "bg-chart-2/15 text-chart-2" },
  shown: { label: "Solution shown", tally: "solution shown", icon: Eye, dot: "bg-danger", badge: "bg-danger/12 text-danger" },
} as const;
type Outcome = keyof typeof OUTCOME;

const outcomeOf = (it: SummaryItem): Outcome => (it.revealed ? "shown" : it.wrongAttempts > 0 ? "slipped" : it.hintsUsed > 0 ? "helped" : "clean");

/** Smoothness is the inverse of the engine's struggle score: 100% is a quick, unaided first-try solve. */
const smoothness = (it: SummaryItem) => 1 - it.struggle;
const smoothTone = (v: number) => (v >= 0.75 ? "bg-success" : v >= 0.45 ? "bg-warning" : "bg-danger");

const pace = (ms: number, expectedSeconds: number) => {
  const r = ms / 1000 / expectedSeconds;
  return r <= 0.6 ? "quick" : r <= 1.4 ? "on pace" : "took a while";
};

function ProblemBreakdown({ summary }: { summary: SessionSummary }) {
  const ref = exerciseRef(summary.exerciseId);
  const problems = useMemo(
    () => summary.items.map((it) => (ref && typeof it.seed === "number" ? generateProblem(ref, it.seed, it.level) : null)),
    [ref, summary.items],
  );
  const counts = summary.items.reduce<Record<Outcome, number>>((c, it) => ({ ...c, [outcomeOf(it)]: c[outcomeOf(it)] + 1 }), { clean: 0, slipped: 0, helped: 0, shown: 0 });
  const label = (its: SummaryItem[]) => its.map((it) => `Q${summary.items.indexOf(it) + 1}`).join(", ");
  const top = Math.max(...summary.items.map(smoothness));
  const strongest = summary.items.filter((it) => smoothness(it) >= 0.75 && smoothness(it) >= top - 0.05);
  const revisit = summary.items.filter((it) => it.revealed || it.struggle >= 0.45);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Problem by problem</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {(Object.keys(OUTCOME) as Outcome[])
            .filter((k) => counts[k] > 0)
            .map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", OUTCOME[k].dot)} />
                <span className="font-semibold text-foreground tabular-nums">{counts[k]}</span> {OUTCOME[k].tally}
              </span>
            ))}
        </div>
      </div>

      <ol className="divide-y overflow-hidden rounded-xl border">
        {summary.items.map((it, i) => (
          <ProblemRow key={it.index} item={it} number={i + 1} problem={problems[i] ?? null} expectedSeconds={ref?.exercise.expectedSeconds ?? 60} />
        ))}
      </ol>

      <p className="mt-2 text-xs text-muted-foreground">
        {strongest.length > 0 && (
          <>
            Strongest: <span className="font-medium text-foreground">{label(strongest)}</span>.{" "}
          </>
        )}
        {revisit.length > 0 && (
          <>
            Worth another look: <span className="font-medium text-foreground">{label(revisit)}</span>.{" "}
          </>
        )}
        Smoothness combines first-try accuracy, hints and time. Open a problem to see it again with its worked solution.
      </p>
    </div>
  );
}

function ProblemRow({ item, number, problem, expectedSeconds }: { item: SummaryItem; number: number; problem: Problem | null; expectedSeconds: number }) {
  const outcome = OUTCOME[outcomeOf(item)];
  const smooth = smoothness(item);
  const details = [
    LEVEL_LABEL[item.level],
    `${duration(item.timeMs)} · ${pace(item.timeMs, expectedSeconds)}`,
    item.wrongAttempts > 0 && `${item.wrongAttempts} wrong ${item.wrongAttempts === 1 ? "try" : "tries"}`,
    item.hintsUsed > 0 && `${item.hintsUsed} ${item.hintsUsed === 1 ? "hint" : "hints"}`,
  ].filter(Boolean);

  return (
    <motion.li initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + number * 0.05 }}>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3 transition-colors select-none hover:bg-muted/40 sm:px-4 [&::-webkit-details-marker]:hidden">
          <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", outcome.badge)} aria-label={outcome.label}>
            <outcome.icon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold tabular-nums">Q{number}</span>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", outcome.badge)}>{outcome.label}</span>
            </div>
            {problem && (
              // The maths says more than a generic "Compute." prompt, so show it when there is some.
              <div className="mt-1 truncate text-sm text-muted-foreground">{problem.tex ? <Tex tex={problem.tex} /> : <Md md={problem.prompt} inline />}</div>
            )}
            <div className="mt-1 text-xs text-muted-foreground">{details.join(" · ")}</div>
          </div>
          <div className="w-16 shrink-0 text-right sm:w-24">
            <div className="text-sm font-semibold tabular-nums">{pct(smooth)}</div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(4, smooth * 100)}%` }}
                transition={{ delay: 0.25 + number * 0.05, duration: 0.5 }}
                className={cn("h-full rounded-full", smoothTone(smooth))}
              />
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">smoothness</div>
          </div>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        {problem ? (
          <div className="space-y-3 border-t bg-muted/20 px-4 py-4 sm:pl-15">
            <Md md={problem.prompt} className="font-medium" />
            {problem.tex && <Tex tex={problem.tex} display />}
            <ol className="space-y-2">
              {problem.solution.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <Md md={s.md} inline />
                    {s.tex && <Tex tex={s.tex} display className="text-left" />}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="border-t bg-muted/20 px-4 py-3 text-sm text-muted-foreground">This problem can no longer be shown.</div>
        )}
      </details>
    </motion.li>
  );
}
