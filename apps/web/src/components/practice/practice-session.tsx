"use client";

import { evaluate, generateProblem, type Problem } from "@fmc/curriculum";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Check, Eye, Lightbulb, Loader2, TrendingDown, TrendingUp, X } from "lucide-react";
import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Md } from "@/components/math/md";
import { Tex } from "@/components/math/tex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Visual } from "@/components/visuals/visual";
import { useInvalidateLearner } from "@/hooks/queries";
import { api, ApiError, type AttemptResponse, type PracticeItem, type PracticeMode, type Resolution, type RevealResponse, type SessionSummary, type StartPracticeResponse } from "@/lib/api";
import { COURSE_ID, exerciseRef } from "@/lib/course";
import { playSound, preloadSounds } from "@/lib/sound";
import { cn } from "@/lib/utils";
import { SessionSummaryView } from "./session-summary";

type ItemState =
  | { phase: "answering" }
  | { phase: "resolved"; correct: boolean; resolution: Resolution; revealedAnswer?: string };

interface ItemResult {
  struggle: number;
  cleanSolve: boolean;
  revealed: boolean;
}

const LEVEL_LABEL = { 1: "Warm-up", 2: "Core", 3: "Stretch" } as const;

export function PracticeSession({ exerciseId, mode, onExit }: { exerciseId: string; mode: PracticeMode; onExit: () => void }) {
  const ref = exerciseRef(exerciseId)!;
  const invalidate = useInvalidateLearner();
  const [session, setSession] = useState<StartPracticeResponse | null>(null);
  const [item, setItem] = useState<PracticeItem | null>(null);
  const [state, setState] = useState<ItemState>({ phase: "answering" });
  const [results, setResults] = useState<ItemResult[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [mastery, setMastery] = useState(0);

  const start = useMutation({
    mutationFn: () => api.post<StartPracticeResponse>("/practice", { courseId: COURSE_ID, exerciseId, mode }),
    onSuccess: (s) => {
      setSession(s);
      setItem(s.item);
      setMastery(s.mastery);
      setState({ phase: "answering" });
      setResults([]);
      setSummary(null);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't start practice."),
  });

  const complete = useMutation({
    mutationFn: () => api.post<SessionSummary>(`/practice/${session!.sessionId}/complete`),
    onSuccess: (s) => {
      setSummary(s);
      void invalidate();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't save your session."),
  });

  // Start exactly once, even under StrictMode's double effects: a second start
  // would abandon the first session server-side.
  const started = useRef(false);
  const { mutate: startMutate } = start;
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    startMutate();
  }, [startMutate]);

  useEffect(preloadSounds, []);

  const problem = useMemo(() => (item ? generateProblem(ref, item.seed, item.level) : null), [item, ref]);

  const onResolved = (correct: boolean, resolution: Resolution, revealedAnswer?: string) => {
    setState({ phase: "resolved", correct, resolution, revealedAnswer });
    setMastery(resolution.mastery.after);
    setResults((r) => [...r, { struggle: resolution.struggle, cleanSolve: resolution.cleanSolve, revealed: !!revealedAnswer }]);
  };

  const next = () => {
    if (state.phase !== "resolved") return;
    const r = state.resolution;
    if (r.done || !r.next) return complete.mutate();
    if (r.levelChange > 0) toast.success(`Stepping up to ${LEVEL_LABEL[r.next.level]} problems`, { icon: <TrendingUp className="size-4" /> });
    if (r.levelChange < 0) toast(`Easing back to ${LEVEL_LABEL[r.next.level]} problems`, { icon: <TrendingDown className="size-4" /> });
    setItem(r.next);
    setState({ phase: "answering" });
  };

  if (summary) return <SessionSummaryView summary={summary} onAgain={() => !start.isPending && start.mutate()} restarting={start.isPending} onExit={onExit} />;

  if (!session || !item || !problem)
    return (
      <div className="grid min-h-80 place-items-center rounded-2xl border bg-card">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );

  return (
    <div className="space-y-4">
      <SessionHeader total={session.targetItems} results={results} current={item.index} level={item.level} mastery={mastery} mode={mode} onExit={onExit} />
      <AnimatePresence mode="wait">
        <motion.div key={item.seed} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
          <ProblemCard
            sessionId={session.sessionId}
            item={item}
            problem={problem}
            state={state}
            onResolved={onResolved}
            onNext={next}
            finishing={complete.isPending}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function SessionHeader({ total, results, current, level, mastery, mode, onExit }: { total: number; results: ItemResult[]; current: number; level: 1 | 2 | 3; mastery: number; mode: PracticeMode; onExit: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-1 items-center gap-1.5">
        {Array.from({ length: total }, (_, i) => {
          const r = results[i];
          return (
            <motion.div
              key={i}
              layout
              className={cn(
                "h-2 flex-1 rounded-full",
                r ? (r.revealed ? "bg-danger/70" : r.cleanSolve ? "bg-success" : r.struggle > 0.5 ? "bg-warning" : "bg-success/60") : i === current ? "bg-primary/50" : "bg-muted",
              )}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="rounded-full bg-muted px-2 py-1 font-medium capitalize">{mode === "challenge" ? "Challenge" : mode}</span>
        <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 font-semibold text-primary">
          {"★".repeat(level)}
          <span className="text-primary/40">{"★".repeat(3 - level)}</span>
          <span className="ml-0.5 hidden sm:inline">{LEVEL_LABEL[level]}</span>
        </span>
        <span className="hidden rounded-full bg-muted px-2 py-1 font-medium tabular-nums sm:inline">Mastery {Math.round(mastery * 100)}%</span>
        <Button variant="ghost" size="icon-sm" onClick={onExit} aria-label="Exit practice">
          <X />
        </Button>
      </div>
    </div>
  );
}

function ProblemCard({
  sessionId,
  item,
  problem,
  state,
  onResolved,
  onNext,
  finishing,
}: {
  sessionId: string;
  item: PracticeItem;
  problem: Problem;
  state: ItemState;
  onResolved: (correct: boolean, r: Resolution, revealed?: string) => void;
  onNext: () => void;
  finishing: boolean;
}) {
  const [answer, setAnswer] = useState("");
  const [choice, setChoice] = useState<number | null>(null);
  const [hints, setHints] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [startedAt] = useState(() => Date.now());
  const shake = useAnimationControls();
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const resolved = state.phase === "resolved";
  const isChoice = problem.answer.kind === "choice";

  useEffect(() => {
    if (!resolved) return inputRef.current?.focus();
    nextRef.current?.focus({ preventScroll: true });
    // Resolving swaps the question for the solution, which changes the card's height. Once the
    // new layout has settled, bring the solution and the Next button to the bottom of the
    // viewport (the card's scroll margin keeps a small gap, and clears the mobile tab bar).
    // The solution keeps settling for a moment (typeset maths, visuals), so re-align as it grows.
    const card = cardRef.current;
    if (!card) return;
    const behavior: ScrollBehavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    const align = () => card.scrollIntoView({ block: "end", behavior });
    const frame = requestAnimationFrame(align);
    const observer = new ResizeObserver(align);
    observer.observe(card);
    const settle = setTimeout(() => observer.disconnect(), 800);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(settle);
      observer.disconnect();
    };
  }, [resolved]);

  const elapsed = () => Date.now() - startedAt;

  const attempt = useMutation({
    mutationFn: (value: string) => api.post<AttemptResponse>(`/practice/${sessionId}/attempts`, { index: item.index, answer: value, timeMs: elapsed(), hintsUsed: hints }),
    onSuccess: (r) => {
      void playSound(r.correct ? "correct" : "wrong");
      if (r.correct) return onResolved(true, r);
      setWrong(r.wrongAttempts);
      setFeedback(r.feedback ?? (r.wrongAttempts >= 2 ? "Not quite. Try a hint, or reveal the solution." : "Not quite — have another go."));
      void shake.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.4 } });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't check that answer."),
  });

  const reveal = useMutation({
    mutationFn: () => api.post<RevealResponse>(`/practice/${sessionId}/reveal`, { index: item.index, timeMs: elapsed(), hintsUsed: hints }),
    onSuccess: (r) => onResolved(false, r, r.answer),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't reveal the answer."),
  });

  // One request per problem at a time: checking and revealing lock each other and the answer.
  const busy = attempt.isPending || reveal.isPending;

  const submit = useCallback(() => {
    if (resolved || busy) return;
    const value = isChoice ? (choice === null ? "" : `${choice}`) : answer.trim();
    if (!value) return;
    setFeedback(null);
    attempt.mutate(value);
  }, [resolved, busy, attempt, isChoice, choice, answer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isChoice || resolved || busy || !problem.choices) return;
      const n = Number(e.key);
      if (n >= 1 && n <= problem.choices.length) setChoice(n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isChoice, resolved, busy, problem.choices]);

  const preview = !isChoice && answer.trim() ? evaluate(answer.replace(/%\s*$/, "")) : null;

  return (
    <motion.div ref={cardRef} animate={shake} className="scroll-mb-[calc(5rem+env(safe-area-inset-bottom))] overflow-hidden rounded-2xl border bg-card shadow-sm md:scroll-mb-6">
      <div className="space-y-5 p-5 sm:p-7">
        <Md md={problem.prompt} className="text-lg font-medium" />
        {problem.tex && (
          <div className="rounded-xl bg-muted/40 px-4 py-5 text-center">
            <Tex tex={problem.tex} display className="text-2xl sm:text-3xl" />
          </div>
        )}
        {/* The question's visual never shows the answer; once resolved, the solution's version (if any) takes its place. */}
        {resolved && problem.solutionVisual ? (
          <motion.div key="solution-visual" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Visual visual={problem.solutionVisual} />
          </motion.div>
        ) : (
          problem.visual && <Visual visual={problem.visual} />
        )}

        {isChoice && problem.choices ? (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {problem.choices.map((c, i) => {
              const correctIdx = problem.answer.kind === "choice" ? problem.answer.correct : -1;
              const showCorrect = resolved && i === correctIdx;
              const showWrong = resolved && choice === i && i !== correctIdx;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={resolved || busy}
                  onClick={() => setChoice(i)}
                  onDoubleClick={submit}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl border-2 bg-background px-4 py-3 text-left transition-all hover:border-primary/50 hover:bg-primary/[0.03] disabled:cursor-default",
                    busy && !resolved && "disabled:cursor-wait disabled:opacity-70",
                    choice === i && !resolved && "border-primary bg-primary/[0.06] shadow-sm shadow-primary/20",
                    showCorrect && "border-success bg-success/10",
                    showWrong && "border-danger/60 bg-danger/5",
                  )}
                >
                  <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-xs font-semibold", choice === i && !resolved && "bg-primary text-primary-foreground", showCorrect && "bg-success text-white")}>
                    {showCorrect ? <Check className="size-4" /> : String.fromCharCode(65 + i)}
                  </span>
                  <Md md={c} inline className="text-base" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={answer}
                readOnly={busy}
                disabled={resolved}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (resolved ? !finishing && onNext() : submit())}
                placeholder={problem.inputHint ?? "Your answer"}
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                maxLength={200}
                aria-label="Your answer"
                className="h-12 rounded-xl text-lg"
              />
            </div>
            <div className="flex min-h-5 items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{problem.inputHint ? `Format: ${problem.inputHint}` : "Fractions (3/4), decimals, sqrt(2) and pi all work"}</span>
              {preview !== null && answer.trim() !== `${preview}` && <span className="tabular-nums">= {Math.round(preview * 1e6) / 1e6}</span>}
            </div>
          </div>
        )}

        <AnimatePresence>
          {feedback && !resolved && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              <X className="size-4 shrink-0" /> {feedback}
            </motion.div>
          )}
        </AnimatePresence>

        {hints > 0 && (
          <div className="space-y-2">
            {problem.hints.slice(0, hints).map((h, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 rounded-lg border border-warning/30 bg-warning/[0.07] px-3 py-2 text-sm">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" />
                <Md md={h} inline />
              </motion.div>
            ))}
          </div>
        )}

        {resolved && <ResolvedPanel problem={problem} state={state} />}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t bg-muted/30 px-5 py-3 sm:px-7">
        {!resolved ? (
          <>
            {hints < problem.hints.length && (
              <Button variant="ghost" size="sm" onClick={() => setHints((h) => h + 1)} disabled={busy}>
                <Lightbulb /> Hint {problem.hints.length > 1 ? `(${hints + 1}/${problem.hints.length})` : ""}
              </Button>
            )}
            <Button variant={wrong >= 2 ? "secondary" : "ghost"} size="sm" onClick={() => !busy && reveal.mutate()} disabled={busy}>
              {reveal.isPending ? <Loader2 className="animate-spin" /> : <Eye />} Show solution
            </Button>
            <Button className="ml-auto h-10 px-5" onClick={submit} disabled={busy || (isChoice ? choice === null : !answer.trim())} aria-busy={attempt.isPending}>
              {attempt.isPending ? <Loader2 className="animate-spin" /> : <Check />} Check
            </Button>
          </>
        ) : (
          <Button ref={nextRef} className="ml-auto h-10 px-5" onClick={onNext} disabled={finishing} aria-busy={finishing}>
            {finishing ? <Loader2 className="animate-spin" /> : null}
            {state.resolution.done ? "See results" : "Next problem"} <ArrowRight />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function ResolvedPanel({ problem, state }: { problem: Problem; state: Extract<ItemState, { phase: "resolved" }> }) {
  const delta = state.resolution.mastery.after - state.resolution.mastery.before;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <div className={cn("flex flex-wrap items-center gap-3 rounded-xl px-4 py-3", state.correct ? "bg-success/12" : "bg-warning/12")}>
        <motion.span
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className={cn("grid size-9 place-items-center rounded-full text-white", state.correct ? "bg-success" : "bg-warning")}
        >
          {state.correct ? <Check className="size-5" /> : <Eye className="size-5" />}
        </motion.span>
        <div className="flex-1">
          <div className="font-semibold">
            {state.correct ? (state.resolution.cleanSolve ? pickPraise(problem.prompt.length) : "Got it!") : "Here's how it works"}
          </div>
          {state.revealedAnswer && (
            <div className="text-sm">
              Answer: <Md md={state.revealedAnswer.includes("$") ? state.revealedAnswer : `$${state.revealedAnswer}$`} inline className="font-semibold" />
            </div>
          )}
        </div>
        {/* A second-try solve is weak evidence, so mastery can dip slightly: say so kindly. */}
        {delta >= 0.005 ? (
          <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success tabular-nums">mastery +{Math.round(delta * 100)}%</span>
        ) : (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{state.correct ? "Solve it first time to grow mastery" : "We'll revisit this"}</span>
        )}
      </div>
      <details open={!state.correct} className="group rounded-xl border bg-background/60 px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-muted-foreground select-none">Worked solution</summary>
        <ol className="mt-3 space-y-2">
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
      </details>
    </motion.div>
  );
}

const PRAISE = ["Nailed it!", "Perfect!", "Spot on!", "Exactly right!", "Brilliant!", "Clean solve!"];
const pickPraise = (seed: number) => PRAISE[seed % PRAISE.length]!;
