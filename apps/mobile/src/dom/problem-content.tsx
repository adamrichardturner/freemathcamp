"use dom";

import { generateProblem, getExercise, type Level } from "@fmc/curriculum";
import { Tex } from "@fmc/web/components/math/tex";
import "./katex.generated.css";
import "mafs/core.css";
import type { DOMProps } from "expo/dom";
import { Check, ChevronDown, Lightbulb } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { cx, screenWidth, useScheme, Visual } from "./blocks";
import "./content.css";
import { Md } from "./web/md";

/**
 * The rich parts of a practice problem, mirroring the web's problem card. The
 * problem is regenerated here from its seed (as the API does to mark it), and
 * the native screen around it owns the answer box, buttons and state:
 * "question" is the prompt, its maths, visual and choices; "support" is the
 * hints taken so far and, once resolved, the worked solution.
 */
export default function ProblemContent({
  courseId,
  exerciseId,
  seed,
  level,
  section,
  scheme,
  choice = null,
  resolved = false,
  correct = false,
  hints = 0,
  disabled = false,
  onChoose,
}: {
  courseId: string;
  exerciseId: string;
  seed: number;
  level: Level;
  section: "question" | "support";
  scheme: "light" | "dark";
  choice?: number | null;
  resolved?: boolean;
  correct?: boolean;
  hints?: number;
  disabled?: boolean;
  onChoose?: (index: number) => Promise<void>;
  dom?: DOMProps;
}) {
  useScheme(scheme);
  const problem = useMemo(() => {
    const ref = getExercise(courseId, exerciseId);
    return ref ? generateProblem(ref, seed, level) : null;
  }, [courseId, exerciseId, seed, level]);
  if (!problem) return null;

  if (section === "support")
    return (
      <div className="space-y-3 px-0.5 pb-1" style={screenWidth}>
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
        {resolved && <WorkedSolution steps={problem.solution} open={!correct} />}
      </div>
    );

  const correctIdx = problem.answer.kind === "choice" ? problem.answer.correct : -1;
  const visual = resolved && problem.solutionVisual ? problem.solutionVisual : problem.visual;
  return (
    <div className="space-y-5 px-0.5 pb-1" style={screenWidth}>
      <Md md={problem.prompt} className="text-lg font-medium" />
      {problem.tex && (
        <div className="rounded-xl bg-muted/40 px-4 py-5 text-center">
          <Tex tex={problem.tex} display className="text-2xl" />
        </div>
      )}
      {/* The question's visual never shows the answer; once resolved, the solution's version (if any) takes its place. */}
      {visual && <Visual key={resolved && problem.solutionVisual ? "solution" : "question"} visual={visual} />}
      {problem.choices && (
        <div className="grid gap-2.5">
          {problem.choices.map((c, i) => {
            const showCorrect = resolved && i === correctIdx;
            const showWrong = resolved && choice === i && i !== correctIdx;
            const selected = choice === i && !resolved;
            return (
              <button
                key={i}
                type="button"
                disabled={resolved || disabled}
                onClick={() => void onChoose?.(i)}
                className={cx(
                  "flex items-center gap-3 rounded-xl border-2 bg-background px-4 py-3 text-left text-foreground transition-all active:scale-[0.99]",
                  selected && "border-primary bg-primary/[0.06] shadow-sm shadow-primary/20",
                  showCorrect && "border-success bg-success/10",
                  showWrong && "border-danger/60 bg-danger/5",
                )}
              >
                <span className={cx("grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-xs font-semibold", selected && "bg-primary text-primary-foreground", showCorrect && "bg-success text-white")}>
                  {showCorrect ? <Check className="size-4" /> : String.fromCharCode(65 + i)}
                </span>
                <Md md={c} inline className="text-base" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WorkedSolution({ steps, open: initiallyOpen }: { steps: { md: string; tex?: string }[]; open: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <div className="rounded-xl border bg-background/60 px-4 py-3">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-sm font-semibold text-muted-foreground">
        Worked solution <ChevronDown className={cx("size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ol className="mt-3 space-y-2 pl-0">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <Md md={s.md} inline />
                {s.tex && <Tex tex={s.tex} display className="text-left" />}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
