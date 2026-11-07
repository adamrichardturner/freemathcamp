"use dom";

import { generateProblem, getExercise, type Level, type Visual as VisualSpec } from "@fmc/curriculum";
import { articleBySlug } from "@fmc/curriculum/articles";
import { VisualDisplayProvider } from "@fmc/web/components/visuals/shared";
import "./katex.generated.css";
import "mafs/core.css";
import type { DOMProps } from "expo/dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { screenWidth, useScheme, Visual } from "./blocks";
import "./content.css";

/** Which visual to show: a lesson's or article's block by its index, or a practice problem's. */
export type VisualTarget =
  | { kind: "lesson"; courseId: string; exerciseId: string; index: number }
  | { kind: "article"; slug: string; index: number }
  | { kind: "problem"; courseId: string; exerciseId: string; seed: number; level: Level; solution: boolean };

/** Looks a visual up from its target (curriculum visuals hold functions, which can't cross the bridge). */
function findVisual(target: VisualTarget): VisualSpec | undefined {
  if (target.kind === "problem") {
    const ref = getExercise(target.courseId, target.exerciseId);
    const problem = ref ? generateProblem(ref, target.seed, target.level) : null;
    return (target.solution && problem?.solutionVisual) || problem?.visual;
  }
  const blocks = target.kind === "lesson" ? getExercise(target.courseId, target.exerciseId)?.exercise.lesson : articleBySlug(target.slug)?.body;
  const block = blocks?.[target.index];
  return block?.kind === "visual" ? block.visual : undefined;
}

const PAD = 16;

/**
 * One visual opened up to fill the screen. Graphs grow to the height left over
 * once their controls are laid out, and can be pinched to zoom and dragged to
 * pan; anything else (number lines, diagrams) can be pinched to zoom as a page.
 * `resetKey` changing puts the view back as it started.
 */
export default function VisualView({ target, scheme, resetKey = 0 }: { target: VisualTarget; scheme: "light" | "dark"; resetKey?: number; dom?: DOMProps }) {
  useScheme(scheme);
  const visual = findVisual(target);
  const box = useRef<HTMLDivElement>(null);
  const [graphHeight, setGraphHeight] = useState(() => Math.round(window.innerHeight * 0.6));

  // Lessons keep the page fixed at the phone's width; here it may be pinched larger.
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    meta?.setAttribute("content", "width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=5, user-scalable=yes");
  }, []);

  // Give the graph whatever height the controls around it leave, and follow the screen as it rotates.
  useLayoutEffect(() => {
    const fit = () => {
      const el = box.current;
      if (!el) return;
      const spare = window.innerHeight - 2 * PAD - el.getBoundingClientRect().height;
      setGraphHeight((h) => Math.max(240, Math.round(h + spare)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [visual]);

  if (!visual) return null;
  return (
    <div className="flex min-h-screen flex-col justify-center" style={{ ...screenWidth, padding: PAD }}>
      <div ref={box}>
        <VisualDisplayProvider value={{ expanded: true, graphHeight }}>
          <Visual key={resetKey} visual={visual} />
        </VisualDisplayProvider>
      </div>
    </div>
  );
}
