import type { Block, Visual as VisualSpec } from "@fmc/curriculum";
import * as A from "@fmc/web/components/visuals/animated-visuals";
import * as I from "@fmc/web/components/visuals/interactive-visuals";
import * as S from "@fmc/web/components/visuals/static-visuals";
import { Tex } from "@fmc/web/components/math/tex";
import { ChevronRight, Info, Lightbulb, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Md } from "./web/md";

/**
 * Lesson blocks and visuals for the DOM components. They mirror the web app's
 * lesson-blocks.tsx, and reuse its visual components as they are, so a lesson
 * reads the same on the phone as on the site.
 */
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/**
 * The outermost element of every DOM component. Expo's root can lay out wider
 * than the web view, so this holds content to the screen's width.
 */
/**
 * Tells the native screen the content is on screen: once fonts are in and two
 * frames have passed (one for layout, one for the size to reach the native
 * view), so the screen can reveal it without anything jumping.
 */
export function useReady(onReady?: () => Promise<void>) {
  useEffect(() => {
    if (!onReady) return;
    let cancelled = false;
    const fonts = document.fonts?.ready ?? Promise.resolve();
    void Promise.race([fonts, new Promise((r) => setTimeout(r, 1500))]).then(() => requestAnimationFrame(() => requestAnimationFrame(() => !cancelled && void onReady())));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export const screenWidth = { width: "100vw", maxWidth: "100vw", boxSizing: "border-box", overflowX: "hidden" } as const;

/** Matches the native theme, which the app passes in as a prop. */
export function useScheme(scheme: "light" | "dark") {
  useEffect(() => {
    document.documentElement.classList.toggle("dark", scheme === "dark");
  }, [scheme]);
}

const VISUALS: Record<VisualSpec["type"], keyof typeof S | keyof typeof I | keyof typeof A> = {
  numberLine: "NumberLine",
  fractionBars: "FractionBars",
  fractionCircle: "FractionCircle",
  areaModel: "AreaModel",
  arrayGrid: "ArrayGrid",
  percentGrid: "PercentGrid",
  placeValue: "PlaceValue",
  tapeDiagram: "TapeDiagram",
  balance: "Balance",
  factorTree: "FactorTree",
  exponentBlocks: "ExponentBlocks",
  sequenceBars: "SequenceBars",
  triangleAngles: "TriangleAngles",
  rightTriangle: "RightTriangle",
  circleExplorer: "CircleExplorer",
  angleExplorer: "AngleExplorer",
  functionPlot: "FunctionPlot",
  slopeExplorer: "SlopeExplorer",
  lineExplorer: "LineExplorer",
  parabolaExplorer: "ParabolaExplorer",
  transformExplorer: "TransformExplorer",
  exponentialExplorer: "ExponentialExplorer",
  unitCircle: "UnitCircle",
  systemExplorer: "SystemExplorer",
  secantExplorer: "SecantExplorer",
  stepThrough: "StepThrough",
  pascalTriangle: "PascalTriangle",
};

export function Visual({ visual }: { visual: VisualSpec }) {
  const name = VISUALS[visual.type];
  const Component = S[name] ?? I[name] ?? A[name];
  return Component ? <Component {...visual} /> : null;
}

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
          <button
            type="button"
            onClick={() => setShown(done ? 1 : shown + 1)}
            className={cx(
              "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium active:scale-[0.98]",
              done ? "text-foreground active:bg-muted" : "bg-secondary text-secondary-foreground",
            )}
          >
            {done ? (
              <>
                <RotateCcw className="size-4" /> Replay
              </>
            ) : (
              <>
                Next step <ChevronRight className="size-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/** Holds a visual's animation until it scrolls into view, keeping its space meanwhile. */
function PlayInView({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -12% 0px" });
  return (
    <div ref={ref} className={cx(!inView && "invisible")}>
      <Fragment key={inView ? "play" : "wait"}>{children}</Fragment>
    </div>
  );
}

export function LessonBlock({ block }: { block: Block }) {
  switch (block.kind) {
    case "text":
      return <Md md={block.md} className="text-[1.02rem] text-foreground/90" />;
    case "heading":
      return <h2 className="pt-4 font-display text-3xl leading-tight tracking-tight">{block.text}</h2>;
    case "math":
      return (
        <figure className="m-0 rounded-xl border bg-card/60 px-4 py-3">
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
        <div className={cx("flex gap-3 rounded-xl border p-4", s.className)}>
          <s.icon className={cx("mt-0.5 size-5 shrink-0", s.iconClass)} />
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
        <figure className="m-0 space-y-2">
          <PlayInView>
            <Visual visual={block.visual} />
          </PlayInView>
          {block.caption && <Md md={block.caption} className="text-center text-sm text-muted-foreground" />}
        </figure>
      );
  }
}

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-6">
      {blocks.map((b, i) => (
        <motion.div key={i} initial={i < 3 ? false : { opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-40px" }} transition={{ duration: 0.4 }}>
          <LessonBlock block={b} />
        </motion.div>
      ))}
    </div>
  );
}
