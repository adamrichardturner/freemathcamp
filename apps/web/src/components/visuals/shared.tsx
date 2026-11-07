"use client";

import type { Tone } from "@fmc/curriculum";
import { Maximize2 } from "lucide-react";
import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
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

/**
 * How a visual is being shown. Inline in a lesson it sits at its normal size,
 * with a button to open it larger when the host passes `onExpand` (the phone
 * app does); opened up (`expanded`) its graph fills `graphHeight` and can be
 * pinched to zoom and dragged to pan.
 */
export type VisualDisplay = { expanded?: boolean; graphHeight?: number; onExpand?: () => void };

const DisplayContext = createContext<VisualDisplay>({});
export const VisualDisplayProvider = DisplayContext.Provider;
export const useVisualDisplay = () => useContext(DisplayContext);

/** An element's rendered width, kept current as it resizes (0 until measured). */
export function useWidth<T extends Element>(): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([e]) => e && setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Consistent frame for every visual, with an optional controls area. */
export function VisualFrame({ children, controls, interactive, className }: { children: ReactNode; controls?: ReactNode; interactive?: boolean; className?: string }) {
  const { expanded, onExpand } = useVisualDisplay();
  const expandable = !!onExpand && !expanded;
  return (
    <div className={cn("relative overflow-hidden rounded-xl border bg-card/60 bg-dots", className)}>
      {(interactive || expandable) && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
          {interactive && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-primary uppercase">Interactive</span>}
          {expandable && (
            <button type="button" onClick={onExpand} aria-label="Open larger to zoom" className="grid size-8 place-items-center rounded-full border bg-card/90 text-muted-foreground shadow-sm active:scale-95">
              <Maximize2 className="size-4" />
            </button>
          )}
        </div>
      )}
      {/* Room above the drawing for the open-larger button, so it never sits on a label. */}
      <div className={cn("p-3 sm:p-4", expandable && "pt-12 sm:pt-12")}>{children}</div>
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
