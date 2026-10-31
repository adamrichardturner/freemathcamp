"use client";

import { ArrowRight, CalendarClock, Clock, RotateCcw, Target, Trophy } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { ButtonLink } from "@/components/app/button-link";
import { MasteryRing, queueMeta } from "@/components/app/status";
import { Button } from "@/components/ui/button";
import type { SessionSummary } from "@/lib/api";
import { exerciseTitle, lessonHref } from "@/lib/course";
import { duration, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

const headline = (s: SessionSummary) =>
  s.accuracy === 1 ? "Flawless session!" : s.accuracy >= 0.8 ? "Great work!" : s.accuracy >= 0.5 ? "Solid progress" : "Tough one — that's how learning feels";

export function SessionSummaryView({ summary, onAgain, onExit }: { summary: SessionSummary; onAgain: () => void; onExit: () => void }) {
  const gained = summary.mastery.after - summary.mastery.before;
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
              {Math.round(gained * 100)}% mastery
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
        <div>
          <div className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Problem by problem</div>
          <div className="flex gap-1.5">
            {summary.items.map((it) => (
              <div key={it.index} className="flex-1 space-y-1 text-center">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 8 + (1 - it.struggle) * 40 }}
                  transition={{ delay: 0.2 + it.index * 0.06 }}
                  className={cn("mx-auto w-full max-w-10 rounded-md", it.revealed ? "bg-danger/70" : it.cleanSolve ? "bg-success" : it.struggle > 0.5 ? "bg-warning" : "bg-success/60")}
                />
                <div className="text-[10px] text-muted-foreground">{"★".repeat(it.level)}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Taller bars mean smoother solves. Stars show the difficulty the engine picked for you.</p>
        </div>

        {summary.brushUp.length > 0 && (
          <div className="rounded-xl border border-warning/30 bg-warning/[0.07] p-4">
            <div className="text-sm font-semibold">This looked tricky. These earlier ideas might help:</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {summary.brushUp.map((id) => (
                <Link key={id} href={lessonHref(id)} className="rounded-full border bg-background px-3 py-1 text-sm font-medium transition-colors hover:border-primary hover:text-primary">
                  {exerciseTitle(id)}
                </Link>
              ))}
            </div>
          </div>
        )}

        {summary.upNext.length > 0 && (
          <div>
            <div className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">Recommended next</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {summary.upNext.map((r) => {
                const m = queueMeta[r.kind];
                return (
                  <Link key={r.exerciseId} href={`${lessonHref(r.exerciseId)}?mode=${m.mode}`} className="group rounded-xl border p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", m.className)}>
                      <m.icon className="size-3" /> {m.label}
                    </span>
                    <div className="mt-1.5 text-sm font-semibold group-hover:text-primary">{exerciseTitle(r.exerciseId)}</div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="outline" onClick={onAgain}>
            <RotateCcw /> Practice again
          </Button>
          <Button variant="ghost" onClick={onExit}>
            Back to lesson
          </Button>
          <ButtonLink href="/learn" className="ml-auto">
            Dashboard <ArrowRight />
          </ButtonLink>
        </div>
      </div>
    </motion.div>
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
