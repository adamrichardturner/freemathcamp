"use client";

import type { Visual } from "@fmc/curriculum";
import { Circle, Coordinates, Line, Mafs, MovablePoint, Plot, Point, Polygon, Text, useTransformContext, vec } from "mafs";
import { Play } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Tex } from "@/components/math/tex";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { fmt, LabeledSlider, tone, useVisualDisplay, VisualFrame } from "./shared";

type V<T extends Visual["type"]> = Extract<Visual, { type: T }>;

const HEIGHT = 300;
const P = "var(--primary)";
const ACCENT = "var(--chart-2)";
const WARN = "var(--warning)";
const MUTED = "var(--muted-foreground)";

/** The smallest 1, 2 or 5 × 10ⁿ step that is at least `min`. */
function niceStep(min: number) {
  if (!(min > 0)) return 1;
  const pow = 10 ** Math.floor(Math.log10(min));
  return [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= min * (1 - 1e-9)) ?? 10 * pow;
}

/**
 * Gridline spacing for an axis: a 1, 2 or 5 × 10ⁿ step that gives at most
 * about sixteen lines, so wide ranges (y from −30 to 20, say) stay readable
 * instead of labelling every integer on top of each other.
 */
export function axisStep(span: number, maxLines = 16) {
  const raw = Math.abs(span) / maxLines;
  if (!(raw > 0) || raw <= 1) return 1;
  return niceStep(raw);
}

/** Least room, in pixels, between neighbouring axis labels. */
const LABEL_GAP = { x: 34, y: 24 };

/**
 * Cartesian axes spaced by the graph's size on screen rather than its range,
 * so the labels never crowd on a phone and stay readable as the graph zooms.
 * Inline the lines keep to whole units (or `min`); opened up and zoomed in
 * they can go finer.
 */
function Axes({ min = 1 }: { min?: number }) {
  const { viewTransform } = useTransformContext();
  const { expanded } = useVisualDisplay();
  const [ox, oy] = vec.transform([0, 0], viewTransform);
  const [ux] = vec.transform([1, 0], viewTransform);
  const [, uy] = vec.transform([0, 1], viewTransform);
  const floor = expanded ? Math.min(min, 0.1) : min;
  const step = (gap: number, px: number) => Math.max(floor, niceStep(gap / Math.max(px, 1e-6)));
  return <Coordinates.Cartesian subdivisions={false} xAxis={{ lines: step(LABEL_GAP.x, Math.abs(ux - ox)) }} yAxis={{ lines: step(LABEL_GAP.y, Math.abs(uy - oy)) }} />;
}

/**
 * Every graph's canvas. Inline it is a fixed size and stays still, so the page
 * scrolls past it; opened up it fills the given height and can be pinched to
 * zoom and dragged to pan.
 */
function Graph({ viewBox, contain, children }: { viewBox: { x: [number, number]; y: [number, number] }; contain?: boolean; children: ReactNode }) {
  const { expanded, graphHeight } = useVisualDisplay();
  return (
    // Inline, a swipe that starts on the graph still scrolls the page (see the CSS for data-graph).
    <div data-graph={expanded ? "zoom" : "still"}>
      <Mafs height={expanded && graphHeight ? graphHeight : HEIGHT} viewBox={viewBox} preserveAspectRatio={contain ? "contain" : false} zoom={expanded ? { min: 0.2, max: 8 } : false} pan={!!expanded}>
        {children}
      </Mafs>
    </div>
  );
}

/** Signed term for equations: "+ 3" / "− 3". */
const sgn = (x: number, dp = 2) => (x < 0 ? `- ${fmt(-x, dp)}` : `+ ${fmt(x, dp)}`);

export function FunctionPlot({ functions, points = [], circles = [], viewBox, equalAspect }: V<"functionPlot">) {
  const box = viewBox ?? { x: [-6, 6], y: [-6, 6] };
  return (
    <VisualFrame>
      <Graph viewBox={box} contain={equalAspect}>
        <Axes />
        {circles.map((c, i) => (
          <Circle key={`c${i}`} center={[c.x, c.y]} radius={c.r} color={tone(c.tone ?? "primary")} weight={3} fillOpacity={0.06} />
        ))}
        {functions.map((f, i) => (
          <Plot.OfX key={i} y={f.fn} color={tone(f.tone ?? (i === 0 ? "primary" : "accent"))} weight={3} style={f.dashed ? "dashed" : "solid"} />
        ))}
        {points.map((p, i) => (
          <g key={i}>
            <Point
              x={p.x}
              y={p.y}
              color={tone(p.tone)}
              svgCircleProps={p.open ? { style: { fill: "var(--card)", stroke: tone(p.tone), strokeWidth: 2.5 } } : undefined}
            />
            {p.label && (
              <Text x={p.x} y={p.y} attach="ne" attachDistance={12} size={14} color={tone(p.tone)}>
                {p.label}
              </Text>
            )}
          </g>
        ))}
      </Graph>
      {functions.some((f) => f.label) && (
        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
          {functions.map(
            (f, i) =>
              f.label && (
                <span key={i} className="flex items-center gap-1.5">
                  <span className="h-1 w-4 rounded" style={{ backgroundColor: tone(f.tone ?? (i === 0 ? "primary" : "accent")) }} />
                  {f.label}
                </span>
              ),
          )}
        </div>
      )}
    </VisualFrame>
  );
}

export function SlopeExplorer({ a = [-2, -1], b = [3, 2] }: V<"slopeExplorer">) {
  const [p1, setP1] = useState<vec.Vector2>(a);
  const [p2, setP2] = useState<vec.Vector2>(b);
  const snap = (p: vec.Vector2): vec.Vector2 => [Math.round(p[0]), Math.round(p[1])];
  const rise = p2[1] - p1[1], run = p2[0] - p1[0];
  const m = run === 0 ? null : rise / run;
  return (
    <VisualFrame interactive>
      <Graph viewBox={{ x: [-6, 6], y: [-5, 5] }}>
        <Axes />
        {m !== null && <Line.ThroughPoints point1={p1} point2={p2} color={MUTED} style="dashed" weight={2} />}
        <Line.Segment point1={p1} point2={[p2[0], p1[1]]} color={ACCENT} weight={3} />
        <Line.Segment point1={[p2[0], p1[1]]} point2={p2} color={WARN} weight={3} />
        <Text x={(p1[0] + p2[0]) / 2} y={p1[1]} attach={rise >= 0 ? "s" : "n"} attachDistance={14} color={ACCENT} size={14}>
          run = {run}
        </Text>
        <Text x={p2[0]} y={(p1[1] + p2[1]) / 2} attach={run >= 0 ? "e" : "w"} attachDistance={10} color={WARN} size={14}>
          rise = {rise}
        </Text>
        <MovablePoint point={p1} onMove={(p) => setP1(snap(p))} color={P} />
        <MovablePoint point={p2} onMove={(p) => setP2(snap(p))} color={P} />
      </Graph>
      <p className="mt-2 text-center">
        {m === null ? (
          <span className="text-sm text-muted-foreground">Vertical line — slope is undefined (run = 0)</span>
        ) : (
          <Tex tex={`m = \\frac{\\text{rise}}{\\text{run}} = \\frac{${rise}}{${run}} = ${fmt(m)}`} />
        )}
      </p>
    </VisualFrame>
  );
}

export function LineExplorer({ m: m0 = 0.5, b: b0 = 1 }: V<"lineExplorer">) {
  const [m, setM] = useState(m0);
  const [b, setB] = useState(b0);
  return (
    <VisualFrame
      interactive
      controls={
        <>
          <LabeledSlider label={<Tex tex="m" />} value={m} onChange={setM} min={-4} max={4} step={0.25} />
          <LabeledSlider label={<Tex tex="b" />} value={b} onChange={setB} min={-5} max={5} step={0.5} />
        </>
      }
    >
      <Graph viewBox={{ x: [-6, 6], y: [-6, 6] }}>
        <Axes />
        <Plot.OfX y={(x) => m * x + b} color={P} weight={3} />
        <Line.Segment point1={[0, b]} point2={[1, b]} color={ACCENT} weight={3} />
        <Line.Segment point1={[1, b]} point2={[1, b + m]} color={WARN} weight={3} />
        <Point x={0} y={b} color={P} />
        <Text x={0} y={b} attach="nw" attachDistance={12} size={13} color={P}>
          (0, {fmt(b)})
        </Text>
      </Graph>
      <p className="mt-2 text-center">
        <Tex tex={`y = ${fmt(m)}x ${sgn(b)}`} />
      </p>
    </VisualFrame>
  );
}

export function ParabolaExplorer({ a: a0 = 1, h: h0 = 2, k: k0 = -3 }: V<"parabolaExplorer">) {
  const [a, setA] = useState(a0);
  const [h, setH] = useState(h0);
  const [k, setK] = useState(k0);
  const disc = -4 * a * k; // for a(x-h)^2 + k = 0
  const roots = a !== 0 && disc / (4 * a * a) >= 0 ? [h - Math.sqrt(-k / a), h + Math.sqrt(-k / a)] : [];
  return (
    <VisualFrame
      interactive
      controls={
        <>
          <LabeledSlider label={<Tex tex="a" />} value={a} onChange={setA} min={-3} max={3} step={0.25} />
          <LabeledSlider label={<Tex tex="h" />} value={h} onChange={setH} min={-5} max={5} step={0.5} />
          <LabeledSlider label={<Tex tex="k" />} value={k} onChange={setK} min={-6} max={6} step={0.5} />
        </>
      }
    >
      <Graph viewBox={{ x: [-7, 7], y: [-7, 7] }}>
        <Axes />
        <Line.ThroughPoints point1={[h, 0]} point2={[h, 1]} color={MUTED} style="dashed" weight={1.5} />
        <Plot.OfX y={(x) => a * (x - h) ** 2 + k} color={P} weight={3} />
        <Point x={h} y={k} color={WARN} />
        <Text x={h} y={k} attach={a >= 0 ? "s" : "n"} attachDistance={14} size={13} color={WARN}>
          vertex ({fmt(h)}, {fmt(k)})
        </Text>
        {roots.map((r, i) => Number.isFinite(r) && <Point key={i} x={r} y={0} color={ACCENT} />)}
      </Graph>
      <div className="mt-2 flex flex-col items-center gap-1 text-sm">
        <Tex tex={`y = ${fmt(a)}(x ${sgn(-h)})^2 ${sgn(k)}`} />
        <span className="text-muted-foreground">
          <Tex tex={`= ${fmt(a)}x^2 ${sgn(-2 * a * h)}x ${sgn(a * h * h + k)}`} />
        </span>
      </div>
    </VisualFrame>
  );
}

const parents = {
  square: { fn: (x: number) => x * x, tex: "x^2", label: "x²" },
  abs: { fn: Math.abs, tex: "|x|", label: "|x|" },
  sqrt: { fn: (x: number) => (x >= 0 ? Math.sqrt(x) : NaN), tex: "\\sqrt{x}", label: "√x" },
  sin: { fn: Math.sin, tex: "\\sin x", label: "sin x" },
  exp: { fn: Math.exp, tex: "e^{x}", label: "eˣ" },
} as const;

export function TransformExplorer({ base: base0 }: V<"transformExplorer">) {
  const [base, setBase] = useState<keyof typeof parents>(base0);
  const [a, setA] = useState(1);
  const [h, setH] = useState(0);
  const [k, setK] = useState(0);
  const f = parents[base];
  const inner = h === 0 ? "x" : `x ${sgn(-h)}`;
  const applied = base === "square" ? `(${inner})^2` : base === "abs" ? `|${inner}|` : base === "sqrt" ? `\\sqrt{${inner}}` : base === "sin" ? `\\sin(${inner})` : `e^{${inner}}`;
  return (
    <VisualFrame
      interactive
      controls={
        <>
          <div className="sm:col-span-2">
            <ToggleGroup value={[base]} onValueChange={(v) => v[0] && setBase(v[0] as keyof typeof parents)} variant="outline" size="sm" className="flex-wrap">
              {Object.entries(parents).map(([k2, p]) => (
                <ToggleGroupItem key={k2} value={k2}>
                  {p.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <LabeledSlider label="Stretch a" value={a} onChange={setA} min={-3} max={3} step={0.25} />
          <LabeledSlider label="Shift right h" value={h} onChange={setH} min={-5} max={5} step={0.5} />
          <LabeledSlider label="Shift up k" value={k} onChange={setK} min={-5} max={5} step={0.5} />
        </>
      }
    >
      <Graph viewBox={{ x: [-7, 7], y: [-6, 6] }}>
        <Axes />
        <Plot.OfX y={f.fn} color={MUTED} style="dashed" weight={2} />
        <Plot.OfX y={(x) => a * f.fn(x - h) + k} color={P} weight={3} />
      </Graph>
      <p className="mt-2 text-center">
        <Tex tex={`y = ${a === 1 ? "" : a === -1 ? "-" : fmt(a)}${applied} ${k === 0 ? "" : sgn(k)}`} />
        <span className="ml-3 text-xs text-muted-foreground">dashed: parent</span>
      </p>
    </VisualFrame>
  );
}

export function ExponentialExplorer({ base: b0 = 2 }: V<"exponentialExplorer">) {
  const [b, setB] = useState(b0);
  const growth = b > 1 ? "growth" : b < 1 ? "decay" : "constant";
  return (
    <VisualFrame interactive controls={<LabeledSlider label="Growth factor b" value={b} onChange={setB} min={0.25} max={3} step={0.05} />}>
      <Graph viewBox={{ x: [-4, 4], y: [-1, 8] }}>
        <Axes />
        <Plot.OfX y={(x) => x + 1} color={MUTED} style="dashed" weight={1.5} />
        <Plot.OfX y={(x) => b ** x} color={P} weight={3} />
        <Point x={0} y={1} color={ACCENT} />
        <Point x={1} y={b} color={WARN} />
        <Text x={1} y={b} attach="e" attachDistance={12} size={13} color={WARN}>
          (1, {fmt(b)})
        </Text>
      </Graph>
      <p className="mt-2 text-center text-sm">
        <Tex tex={`y = ${fmt(b)}^{x}`} /> — exponential <span className="font-semibold text-primary">{growth}</span>
        <span className="text-muted-foreground"> (dashed: linear y = x + 1)</span>
      </p>
    </VisualFrame>
  );
}

export function UnitCircle({ angle: a0 = 40 }: V<"unitCircle">) {
  const [p, setP] = useState<vec.Vector2>([Math.cos((a0 * Math.PI) / 180), Math.sin((a0 * Math.PI) / 180)]);
  const theta = Math.atan2(p[1], p[0]);
  const deg = ((theta * 180) / Math.PI + 360) % 360;
  const snapDeg = Math.round(deg);
  return (
    <VisualFrame interactive>
      <Graph viewBox={{ x: [-1.5, 1.5], y: [-1.3, 1.3] }} contain>
        <Axes min={0.5} />
        <Plot.Parametric xy={(t) => [Math.cos(t), Math.sin(t)]} t={[0, 2 * Math.PI]} color={MUTED} weight={2} />
        <Polygon points={[[0, 0], [p[0], 0], p]} color={P} fillOpacity={0.12} weight={0} />
        <Line.Segment point1={[0, 0]} point2={p} color={P} weight={3} />
        <Line.Segment point1={[0, 0]} point2={[p[0], 0]} color={ACCENT} weight={4} />
        <Line.Segment point1={[p[0], 0]} point2={p} color={WARN} weight={4} />
        <Plot.Parametric xy={(t) => [0.22 * Math.cos(t), 0.22 * Math.sin(t)]} t={[0, ((deg || 0.001) * Math.PI) / 180]} color={P} weight={2} />
        <MovablePoint point={p} onMove={setP} constrain={(q) => vec.normalize(q)} color={P} />
      </Graph>
      <div className="mt-2 grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
        <div className="rounded-lg bg-muted/60 p-2">
          <div className="text-xs text-muted-foreground">angle</div>
          <div className="font-semibold tabular-nums">{snapDeg}°</div>
        </div>
        <div className="rounded-lg bg-muted/60 p-2">
          <div className="text-xs text-muted-foreground">radians</div>
          <div className="font-semibold tabular-nums">{fmt(theta < 0 ? theta + 2 * Math.PI : theta)}</div>
        </div>
        <div className="rounded-lg p-2" style={{ backgroundColor: "color-mix(in oklch, var(--chart-2) 18%, transparent)" }}>
          <div className="text-xs text-muted-foreground">cos θ (x)</div>
          <div className="font-semibold tabular-nums">{fmt(p[0], 3)}</div>
        </div>
        <div className="rounded-lg p-2" style={{ backgroundColor: "color-mix(in oklch, var(--warning) 22%, transparent)" }}>
          <div className="text-xs text-muted-foreground">sin θ (y)</div>
          <div className="font-semibold tabular-nums">{fmt(p[1], 3)}</div>
        </div>
      </div>
    </VisualFrame>
  );
}

export function SystemExplorer({ lines }: V<"systemExplorer">) {
  const [l1, setL1] = useState(lines[0]);
  const [l2, setL2] = useState(lines[1]);
  const parallel = l1.m === l2.m;
  const x = parallel ? NaN : (l2.b - l1.b) / (l1.m - l2.m);
  const y = l1.m * x + l1.b;
  return (
    <VisualFrame
      interactive
      controls={
        <>
          <LabeledSlider label={<span style={{ color: P }}>Line 1 slope</span>} value={l1.m} onChange={(m) => setL1({ ...l1, m })} min={-3} max={3} step={0.5} />
          <LabeledSlider label={<span style={{ color: P }}>Line 1 intercept</span>} value={l1.b} onChange={(b) => setL1({ ...l1, b })} min={-5} max={5} step={0.5} />
          <LabeledSlider label={<span style={{ color: ACCENT }}>Line 2 slope</span>} value={l2.m} onChange={(m) => setL2({ ...l2, m })} min={-3} max={3} step={0.5} />
          <LabeledSlider label={<span style={{ color: ACCENT }}>Line 2 intercept</span>} value={l2.b} onChange={(b) => setL2({ ...l2, b })} min={-5} max={5} step={0.5} />
        </>
      }
    >
      <Graph viewBox={{ x: [-7, 7], y: [-6, 6] }}>
        <Axes />
        <Plot.OfX y={(t) => l1.m * t + l1.b} color={P} weight={3} />
        <Plot.OfX y={(t) => l2.m * t + l2.b} color={ACCENT} weight={3} />
        {!parallel && <Point x={x} y={y} color={WARN} />}
      </Graph>
      <p className="mt-2 text-center text-sm">
        {parallel ? (
          <span className="font-medium text-warning">{l1.b === l2.b ? "Same line — infinitely many solutions" : "Parallel lines — no solution"}</span>
        ) : (
          <>
            Intersection <Tex tex={`(${fmt(x)},\\ ${fmt(y)})`} /> satisfies both equations
          </>
        )}
      </p>
    </VisualFrame>
  );
}

export function SecantExplorer({ fn, x: x0, h: h0 = 2, label, viewBox }: V<"secantExplorer">) {
  const [h, setH] = useState(h0);
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const y0 = fn(x0), y1 = fn(x0 + h);
  const slope = (y1 - y0) / h;
  // A symmetric difference with a tiny step is plenty for the smooth curves used here.
  const tangent = (fn(x0 + 1e-5) - fn(x0 - 1e-5)) / 2e-5;
  const shrink = () => {
    cancelAnimationFrame(frame.current);
    const from = h0, start = performance.now(), ms = 2600;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - (1 - t) ** 3;
      setH(Math.round((from - (from - 0.05) * eased) * 100) / 100);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };
  return (
    <VisualFrame
      interactive
      controls={
        <>
          <LabeledSlider label={<Tex tex="h" />} value={h} onChange={setH} min={0.05} max={Math.max(3, h0)} step={0.05} />
          <div className="flex items-end">
            <Button variant="secondary" size="sm" onClick={shrink} className="w-full sm:w-auto">
              <Play /> Shrink h towards 0
            </Button>
          </div>
        </>
      }
    >
      <Graph viewBox={viewBox ?? { x: [-2, 5], y: [-2, 10] }}>
        <Axes />
        <Plot.OfX y={fn} color={P} weight={3} />
        <Plot.OfX y={(x) => y0 + tangent * (x - x0)} color={MUTED} style="dashed" weight={2} />
        <Plot.OfX y={(x) => y0 + slope * (x - x0)} color={WARN} weight={2.5} />
        <Line.Segment point1={[x0, y0]} point2={[x0 + h, y0]} color={ACCENT} weight={2} />
        <Line.Segment point1={[x0 + h, y0]} point2={[x0 + h, y1]} color={ACCENT} weight={2} />
        <Point x={x0} y={y0} color={P} />
        <Point x={x0 + h} y={y1} color={WARN} />
      </Graph>
      <div className="mt-2 flex flex-col items-center gap-1 text-sm">
        <Tex tex={`\\frac{f(${fmt(x0)} + h) - f(${fmt(x0)})}{h} = \\frac{${fmt(y1 - y0, 3)}}{${fmt(h)}} = ${fmt(slope, 3)}`} />
        <span className="text-xs text-muted-foreground">
          {label ? `${label} · ` : ""}secant (orange) slope {fmt(slope, 3)} · tangent (dashed) slope {fmt(tangent, 3)}
        </span>
      </div>
    </VisualFrame>
  );
}
