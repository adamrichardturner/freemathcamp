"use client";

import { linkConceptsInBlocks, type Block } from "@fmc/curriculum";
import { ChevronRight, Info, Lightbulb, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { Fragment, useMemo, useRef, useState, type ReactNode } from "react";
import { useConcepts } from "@/components/articles/concepts";
import { Md } from "@/components/math/md";
import { Tex } from "@/components/math/tex";
import { Button } from "@/components/ui/button";
import { Visual } from "@/components/visuals/visual";
import { cn } from "@/lib/utils";

const calloutStyle = {
  key: { icon: Sparkles, className: "border-primary/30 bg-primary/[0.06]", iconClass: "text-primary" },
  tip: { icon: Lightbulb, className: "border-success/30 bg-success/[0.07]", iconClass: "text-success" },
  warning: { icon: TriangleAlert, className: "border-warning/40 bg-warning/[0.08]", iconClass: "text-warning" },
  info: { icon: Info, className: "border-info/30 bg-info/[0.07]", iconClass: "text-info" },
} as const;

function WorkedExample({ block }: { block: Extract<Block, { kind: "example" }> }) {
  const [shown, setShown] = useState(1);
  const done = shown >= block.steps.length;
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        <span className="size-1.5 rounded-full bg-chart-3" /> {block.title ?? "Worked example"}
      </div>
      <div className="space-y-4 p-4">
        <Md md={block.problem} className="font-medium" />
        <ol className="space-y-3">
          <AnimatePresence initial={false}>
            {block.steps.slice(0, shown).map((s, i) => (
              <motion.li key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
                <div className="min-w-0 flex-1 space-y-1">
                  {s.md && <Md md={s.md} className="text-[0.95rem]" />}
                  {s.tex && <Tex tex={s.tex} display className="text-left" />}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
        {block.steps.length > 1 && (
          <Button variant={done ? "ghost" : "secondary"} size="sm" onClick={() => setShown(done ? 1 : shown + 1)}>
            {done ? (
              <>
                <RotateCcw /> Replay
              </>
            ) : (
              <>
                Next step <ChevronRight />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Anchor id for a heading, shared with the article contents list. */
export const headingId = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Visuals animate as they mount. Holding the animation until the visual scrolls into
 * view means a reader further down a long page still sees it play. The visual keeps
 * its space while it waits, so nothing shifts.
 */
function PlayInView({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -12% 0px" });
  return (
    <div ref={ref} className={cn(!inView && "invisible")}>
      <Fragment key={inView ? "play" : "wait"}>{children}</Fragment>
    </div>
  );
}

export function LessonBlock({ block }: { block: Block }) {
  switch (block.kind) {
    case "text":
      return <Md md={block.md} className="text-[1.02rem] text-foreground/90" />;
    case "heading":
      return (
        <h2 id={headingId(block.text)} className="scroll-mt-24 pt-4 font-display text-3xl leading-tight tracking-tight">
          {block.text}
        </h2>
      );
    case "math":
      return (
        <figure className="rounded-xl border bg-card/60 px-4 py-3">
          <Tex tex={block.tex} display className="text-lg" />
          {block.caption && <Md md={block.caption} className="mt-1 text-center text-sm text-muted-foreground" />}
        </figure>
      );
    case "rule":
      return (
        <div className="relative overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-card to-chart-2/[0.06] p-4">
          <div className="text-xs font-semibold tracking-wider text-primary uppercase">{block.name}</div>
          <Tex tex={block.tex} display className="text-xl" />
          {block.md && <Md md={block.md} className="text-sm text-muted-foreground" />}
        </div>
      );
    case "callout": {
      const s = calloutStyle[block.tone];
      return (
        <div className={cn("flex gap-3 rounded-xl border p-4", s.className)}>
          <s.icon className={cn("mt-0.5 size-5 shrink-0", s.iconClass)} />
          <div className="min-w-0 space-y-1">
            {block.title && <div className="font-semibold">{block.title}</div>}
            <Md md={block.md} className="text-[0.95rem]" />
          </div>
        </div>
      );
    }
    case "example":
      return <WorkedExample block={block} />;
    case "visual":
      return (
        <figure className="space-y-2">
          <PlayInView>
            <Visual visual={block.visual} />
          </PlayInView>
          {block.caption && <Md md={block.caption} className="text-center text-sm text-muted-foreground" />}
        </figure>
      );
  }
}

/**
 * Renders lesson or article blocks. Under a ConceptProvider, the first mention of each
 * concept that has an article becomes a link with a preview card.
 */
export function Lesson({ blocks, exclude }: { blocks: Block[]; exclude?: string }) {
  const concepts = useConcepts();
  const linked = useMemo(() => (concepts ? linkConceptsInBlocks(blocks, concepts.index, { exclude }).blocks : blocks), [blocks, concepts, exclude]);
  return (
    <div className="space-y-6">
      {linked.map((b, i) => (
        <motion.div key={i} initial={i < 3 ? false : { opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.4 }}>
          <LessonBlock block={b} />
        </motion.div>
      ))}
    </div>
  );
}
