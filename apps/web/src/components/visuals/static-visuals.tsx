"use client";

import type { Visual } from "@fmc/curriculum";
import { motion } from "motion/react";
import { useState } from "react";
import { Tex } from "@/components/math/tex";
import { cn } from "@/lib/utils";
import { fmt, LabeledSlider, tone, VisualFrame } from "./shared";

type V<T extends Visual["type"]> = Extract<Visual, { type: T }>;

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));

/* ---------------- Number line ---------------- */

export function NumberLine({ min, max, step = 1, points = [], jumps = [], highlight }: V<"numberLine">) {
  const W = 640, pad = 28, y = 70;
  const x = (v: number) => pad + ((v - min) / (max - min)) * (W - 2 * pad);
  const count = Math.round((max - min) / step);
  const ticks = Array.from({ length: count + 1 }, (_, i) => min + i * step);
  const labelEvery = Math.ceil(count / 20);
  const denom = Math.round(1 / step);
  const fractional = step < 1 && Math.abs(1 / step - denom) < 1e-9 && max - min <= 2;
  const label = (v: number) => {
    if (!fractional || Number.isInteger(v)) return fmt(v);
    const n = Math.round(v * denom), g = gcd(n, denom);
    return `${n / g}/${denom / g}`;
  };
  return (
    <VisualFrame>
      <svg viewBox={`0 0 ${W} 110`} className="w-full" role="img" aria-label={`Number line from ${min} to ${max}`}>
        <defs>
          <marker id="nl-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
          </marker>
        </defs>
        <line x1={8} x2={W - 8} y1={y} y2={y} stroke="currentColor" strokeWidth={1.5} markerStart="url(#nl-arrow)" markerEnd="url(#nl-arrow)" className="text-foreground/70" />
        {highlight && (
          <g style={{ color: tone(highlight.tone) }}>
            <motion.line
              x1={x(highlight.from)}
              x2={x(highlight.to)}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeWidth={6}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8 }}
            />
            <circle cx={x(highlight.from)} cy={y} r={7} fill={highlight.openStart ? "var(--card)" : "currentColor"} stroke="currentColor" strokeWidth={2.5} />
            {highlight.to < max && <circle cx={x(highlight.to)} cy={y} r={7} fill={highlight.openEnd ? "var(--card)" : "currentColor"} stroke="currentColor" strokeWidth={2.5} />}
          </g>
        )}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={x(t)} x2={x(t)} y1={y - (t === 0 ? 9 : 6)} y2={y + (t === 0 ? 9 : 6)} stroke="currentColor" strokeWidth={t === 0 ? 2 : 1} className="text-foreground/60" />
            {i % labelEvery === 0 && (
              <text x={x(t)} y={y + 26} textAnchor="middle" className="fill-muted-foreground text-[12px] tabular-nums">
                {label(t)}
              </text>
            )}
          </g>
        ))}
        {jumps.map((j, i) => {
          const x1 = x(j.from), x2 = x(j.to), h = Math.min(48, Math.abs(x2 - x1) / 2.2 + 12);
          return (
            <g key={i} style={{ color: tone(j.tone) }}>
              <motion.path
                d={`M ${x1} ${y - 4} Q ${(x1 + x2) / 2} ${y - h * 1.6} ${x2} ${y - 4}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                markerEnd="url(#nl-arrow)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.9, delay: 0.2 + i * 0.3 }}
              />
              {j.label && (
                <text x={(x1 + x2) / 2} y={y - h * 0.85 - 6} textAnchor="middle" fill="currentColor" className="text-[13px] font-semibold">
                  {j.label}
                </text>
              )}
            </g>
          );
        })}
        {points.map((p, i) => (
          <motion.g key={i} style={{ color: tone(p.tone) }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1 * i, type: "spring" }}>
            <circle cx={x(p.value)} cy={y} r={6.5} fill="currentColor" stroke="var(--card)" strokeWidth={2} />
            {p.label && (
              <text x={x(p.value)} y={y - 14} textAnchor="middle" fill="currentColor" className="text-[13px] font-semibold">
                {p.label}
              </text>
            )}
          </motion.g>
        ))}
      </svg>
    </VisualFrame>
  );
}

/* ---------------- Fractions ---------------- */

export function FractionBars({ fractions, labels = true }: V<"fractionBars">) {
  const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
  return (
    <VisualFrame>
      <div className="space-y-2.5">
        {fractions.map(([n, d], row) => {
          const wholes = Math.max(1, Math.ceil(n / d));
          return (
            <div key={row} className="flex items-center gap-3">
              {labels && <Tex tex={`\\tfrac{${n}}{${d}}`} className="w-10 shrink-0 text-center text-lg" />}
              <div className="flex flex-1 gap-1.5">
                {Array.from({ length: wholes }, (_, w) => (
                  <div key={w} className="flex h-9 flex-1 overflow-hidden rounded-md border-2 border-foreground/25 bg-background">
                    {Array.from({ length: d }, (_, i) => {
                      const filled = w * d + i < n;
                      return (
                        <motion.div
                          key={i}
                          className={cn("flex-1 border-r border-foreground/20 last:border-r-0")}
                          initial={{ opacity: 0.2 }}
                          animate={{ opacity: 1, backgroundColor: filled ? colors[row % colors.length] : "transparent" }}
                          transition={{ delay: 0.04 * (w * d + i) + row * 0.1 }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </VisualFrame>
  );
}

export function FractionCircle({ numerator, denominator }: V<"fractionCircle">) {
  const r = 80, c = 100;
  const slice = (i: number) => {
    const a0 = (i / denominator) * 2 * Math.PI - Math.PI / 2;
    const a1 = ((i + 1) / denominator) * 2 * Math.PI - Math.PI / 2;
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return `M ${c} ${c} L ${c + r * Math.cos(a0)} ${c + r * Math.sin(a0)} A ${r} ${r} 0 ${large} 1 ${c + r * Math.cos(a1)} ${c + r * Math.sin(a1)} Z`;
  };
  return (
    <VisualFrame>
      <svg viewBox="0 0 200 200" className="mx-auto h-48 w-48" role="img" aria-label={`Circle cut into ${denominator} slices`}>
        {Array.from({ length: denominator }, (_, i) =>
          denominator === 1 ? (
            <circle key={i} cx={c} cy={c} r={r} fill={i < numerator ? "var(--primary)" : "var(--muted)"} stroke="var(--card)" strokeWidth={3} />
          ) : (
            <motion.path
              key={i}
              d={slice(i)}
              fill={i < numerator ? "var(--primary)" : "var(--muted)"}
              stroke="var(--card)"
              strokeWidth={3}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ transformOrigin: "100px 100px" }}
              transition={{ delay: i * 0.05 }}
            />
          ),
        )}
      </svg>
    </VisualFrame>
  );
}

/* ---------------- Multiplication ---------------- */

const splitPlace = (n: number) => {
  const parts: number[] = [];
  let place = 1;
  while (n > 0) {
    const d = n % 10;
    if (d) parts.unshift(d * place);
    n = Math.floor(n / 10);
    place *= 10;
  }
  return parts.length ? parts : [0];
};

export function AreaModel({ a, b }: V<"areaModel">) {
  const A = splitPlace(a), B = splitPlace(b);
  const W = 520, H = 300, pad = 46;
  const sx = (W - pad - 8) / a, sy = (H - pad - 8) / b;
  const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-5)"];
  const widths = A.map((pa) => Math.max(pa * sx, 34));
  const xStarts = widths.map((_, i) => pad + widths.slice(0, i).reduce((s, w) => s + w, 0));
  const heights = B.map((pb) => Math.max(pb * sy, 30));
  const yStarts = heights.map((_, j) => pad + heights.slice(0, j).reduce((s, h) => s + h, 0));
  return (
    <VisualFrame>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Area model of ${a} times ${b}`}>
        {A.map((pa, i) => {
          const x0 = xStarts[i]!, w = widths[i]!;
          return (
            <g key={i}>
              <text x={x0 + w / 2} y={pad - 14} textAnchor="middle" className="fill-foreground text-[15px] font-semibold">{pa}</text>
              {B.map((pb, j) => {
                const y0 = yStarts[j]!, h = heights[j]!;
                return (
                  <g key={j}>
                    {i === 0 && <text x={pad - 10} y={y0 + h / 2 + 5} textAnchor="end" className="fill-foreground text-[15px] font-semibold">{pb}</text>}
                    <motion.rect
                      x={x0 + 1.5}
                      y={y0 + 1.5}
                      width={w - 3}
                      height={h - 3}
                      rx={6}
                      fill={colors[(i + j) % colors.length]}
                      fillOpacity={0.22}
                      stroke={colors[(i + j) % colors.length]}
                      strokeWidth={2}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: (i + j) * 0.12 }}
                    />
                    <text x={x0 + w / 2} y={y0 + h / 2 + 5} textAnchor="middle" className="fill-foreground text-[14px] font-medium tabular-nums">
                      {pa * pb}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 text-center text-sm text-muted-foreground">
        <Tex tex={`${a}\\times${b} = ${A.flatMap((x) => B.map((y) => x * y)).join(" + ")} = ${a * b}`} />
      </div>
    </VisualFrame>
  );
}

export function ArrayGrid({ rows, cols, groupBy }: V<"arrayGrid">) {
  const s = 30;
  return (
    <VisualFrame>
      <svg viewBox={`0 0 ${cols * s + 20} ${rows * s + 20}`} className="mx-auto max-h-64 w-full max-w-md" role="img" aria-label={`${rows} rows of ${cols}`}>
        {groupBy === "rows" &&
          Array.from({ length: rows }, (_, r) => (
            <rect key={r} x={4} y={10 + r * s + 3} width={cols * s + 12} height={s - 6} rx={(s - 6) / 2} fill="var(--primary)" fillOpacity={0.08} stroke="var(--primary)" strokeOpacity={0.3} />
          ))}
        {Array.from({ length: rows * cols }, (_, i) => {
          const r = Math.floor(i / cols), c = i % cols;
          return (
            <motion.circle
              key={i}
              cx={10 + c * s + s / 2}
              cy={10 + r * s + s / 2}
              r={s * 0.3}
              fill={r % 2 ? "var(--chart-2)" : "var(--primary)"}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.012, type: "spring", stiffness: 300 }}
            />
          );
        })}
      </svg>
    </VisualFrame>
  );
}

/* ---------------- Place value, percent, tape ---------------- */

export function PlaceValue({ value, highlight }: V<"placeValue">) {
  const names = ["ones", "tens", "hundreds", "thousands", "ten-thousands", "hundred-thousands", "millions", "ten-millions"];
  const digits = String(value).split("");
  return (
    <VisualFrame>
      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
        {digits.map((d, i) => {
          const place = digits.length - 1 - i;
          const on = highlight === i;
          return (
            <motion.div
              key={i}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "flex w-12 flex-col items-center rounded-lg border-2 bg-background px-1 py-2 sm:w-16",
                on ? "border-primary bg-primary/10 shadow-md shadow-primary/20" : "border-border",
              )}
            >
              <span className={cn("font-mono text-2xl font-semibold sm:text-3xl", on && "text-primary")}>{d}</span>
              <span className="mt-1 text-center text-[9px] leading-tight text-muted-foreground sm:text-[10px]">{names[place]}</span>
              <span className="text-[10px] tabular-nums text-muted-foreground/70">×{(10 ** place).toLocaleString()}</span>
            </motion.div>
          );
        })}
      </div>
    </VisualFrame>
  );
}

export function PercentGrid({ percent }: V<"percentGrid">) {
  return (
    <VisualFrame>
      <div className="mx-auto grid w-full max-w-[260px] grid-cols-10 gap-[3px]">
        {Array.from({ length: 100 }, (_, i) => (
          <motion.div
            key={i}
            className="aspect-square rounded-[3px]"
            initial={{ backgroundColor: "var(--muted)" }}
            animate={{ backgroundColor: i < percent ? "var(--primary)" : "var(--muted)" }}
            transition={{ delay: i * 0.008 }}
          />
        ))}
      </div>
      <p className="mt-3 text-center text-sm font-medium">
        <Tex tex={`${percent}\\% = \\tfrac{${percent}}{100}`} />
      </p>
    </VisualFrame>
  );
}

export function TapeDiagram({ parts, totalLabel }: V<"tapeDiagram">) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  return (
    <VisualFrame>
      <div className="space-y-2">
        <div className="flex h-14 overflow-hidden rounded-lg border-2 border-foreground/20">
          {parts.map((p, i) => (
            <motion.div
              key={i}
              initial={{ flexGrow: 0 }}
              animate={{ flexGrow: p.value }}
              transition={{ duration: 0.7, delay: i * 0.1 }}
              className="flex min-w-0 basis-0 items-center justify-center border-r-2 border-card px-1 text-sm font-semibold last:border-r-0"
              style={{ backgroundColor: `color-mix(in oklch, ${tone(p.tone)} ${p.tone === "muted" ? 18 : 30}%, transparent)` }}
            >
              <span className="truncate">{p.label}</span>
            </motion.div>
          ))}
        </div>
        {totalLabel && (
          <div className="relative pt-2 text-center">
            <div className="absolute inset-x-0 top-0 h-3 rounded-b-lg border-x-2 border-b-2 border-foreground/40" />
            <span className="relative mt-2 inline-block text-sm font-semibold">
              total = {totalLabel}
              {parts.length > 1 && <span className="text-muted-foreground"> ({total} parts)</span>}
            </span>
          </div>
        )}
      </div>
    </VisualFrame>
  );
}

/* ---------------- Equations ---------------- */

export function Balance({ left, right, note }: V<"balance">) {
  const toTex = (s: string) => s.replace(/−/g, "-");
  return (
    <VisualFrame>
      <div className="mx-auto max-w-md select-none">
        <div className="flex items-end justify-between gap-6 px-2">
          {[left, right].map((side, i) => (
            <motion.div
              key={i}
              initial={{ y: i ? -6 : 6 }}
              animate={{ y: 0 }}
              transition={{ type: "spring", stiffness: 80, damping: 6 }}
              className="flex flex-1 flex-col items-center"
            >
              <div className="mb-1 min-w-24 rounded-lg border-2 border-primary/40 bg-primary/10 px-3 py-2 text-center text-lg">
                <Tex tex={toTex(side)} />
              </div>
              <div className="h-2 w-full rounded-full bg-foreground/70" />
            </motion.div>
          ))}
        </div>
        <div className="relative mx-auto h-1.5 w-[92%] rounded bg-foreground/70" />
        <div className="mx-auto h-14 w-0 border-l-[3px] border-foreground/70" />
        <div className="mx-auto h-0 w-0 border-x-[22px] border-b-[18px] border-x-transparent border-b-foreground/70" />
        {note && <p className="mt-3 text-center text-sm text-muted-foreground">{note}</p>}
      </div>
    </VisualFrame>
  );
}

type TreeNode = { value: number; prime: boolean; children?: [TreeNode, TreeNode] };

const buildTree = (n: number): TreeNode => {
  for (let p = 2; p * p <= n; p++) if (n % p === 0) return { value: n, prime: false, children: [{ value: p, prime: true }, buildTree(n / p)] };
  return { value: n, prime: true };
};

export function FactorTree({ value }: V<"factorTree">) {
  const nodes: { x: number; y: number; value: number; prime: boolean; px?: number; py?: number }[] = [];
  const walk = (t: TreeNode, x: number, y: number, depth: number, px?: number, py?: number) => {
    nodes.push({ x, y, value: t.value, prime: t.prime && depth > 0 ? true : t.prime, px, py });
    if (t.children) {
      walk(t.children[0], x - 46, y + 62, depth + 1, x, y);
      walk(t.children[1], x + 46, y + 62, depth + 1, x, y);
    }
  };
  walk(buildTree(value), 60, 30, 0);
  const maxX = Math.max(...nodes.map((n) => n.x)) + 40, maxY = Math.max(...nodes.map((n) => n.y)) + 34;
  const minX = Math.min(...nodes.map((n) => n.x)) - 40;
  return (
    <VisualFrame>
      <svg viewBox={`${minX} 0 ${maxX - minX} ${maxY}`} className="mx-auto max-h-80 w-full max-w-lg" role="img" aria-label={`Factor tree of ${value}`}>
        {nodes.map((n, i) => n.px !== undefined && <motion.line key={`l${i}`} x1={n.px} y1={n.py! + 16} x2={n.x} y2={n.y - 16} stroke="var(--border)" strokeWidth={2} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: i * 0.08 }} />)}
        {nodes.map((n, i) => (
          <motion.g key={i} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <circle cx={n.x} cy={n.y} r={19} fill={n.prime ? "var(--primary)" : "var(--card)"} stroke={n.prime ? "var(--primary)" : "var(--border)"} strokeWidth={2} />
            <text x={n.x} y={n.y + 5} textAnchor="middle" className={cn("text-[13px] font-semibold tabular-nums", n.prime ? "fill-primary-foreground" : "fill-foreground")}>
              {n.value}
            </text>
          </motion.g>
        ))}
      </svg>
    </VisualFrame>
  );
}

export function ExponentBlocks({ base, exponent }: V<"exponentBlocks">) {
  const b = Math.min(Math.abs(base), 6);
  const layers = exponent >= 3 ? b : 1;
  const rows = exponent >= 2 ? b : 1;
  return (
    <VisualFrame>
      <div className="flex flex-wrap items-end justify-center gap-3">
        {Array.from({ length: layers }, (_, l) => (
          <div key={l} className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${b}, minmax(0, 1fr))` }}>
            {Array.from({ length: rows * b }, (_, i) => (
              <motion.div
                key={i}
                className="size-4 rounded-[3px] sm:size-5"
                style={{ backgroundColor: `color-mix(in oklch, var(--primary) ${60 + (l * 40) / Math.max(1, layers)}%, var(--chart-2))` }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: (l * rows * b + i) * 0.015 }}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-sm">
        <Tex tex={`${base}^{${exponent}} = ${Array(exponent).fill(base).join(" \\times ")} = ${base ** exponent}`} />
      </p>
    </VisualFrame>
  );
}

export function SequenceBars({ terms }: V<"sequenceBars">) {
  const max = Math.max(...terms.map(Math.abs), 1);
  const hasNeg = terms.some((t) => t < 0);
  return (
    <VisualFrame>
      <div className={cn("flex h-44 items-end justify-center gap-2 sm:gap-3", hasNeg && "items-center")}>
        {terms.map((t, i) => (
          <div key={i} className="flex h-full w-full max-w-14 flex-col items-center justify-end gap-1">
            <span className="text-xs font-semibold tabular-nums">{fmt(t, 3)}</span>
            <motion.div
              className="w-full rounded-t-md bg-gradient-to-t from-primary to-chart-5"
              initial={{ height: 0 }}
              animate={{ height: `${(Math.abs(t) / max) * 75}%` }}
              transition={{ delay: i * 0.08, type: "spring", stiffness: 120, damping: 16 }}
              style={{ opacity: t < 0 ? 0.5 : 1 }}
            />
            <Tex tex={`a_{${i + 1}}`} className="text-xs text-muted-foreground" />
          </div>
        ))}
      </div>
    </VisualFrame>
  );
}

/* ---------------- Geometry ---------------- */

export function TriangleAngles({ angles, hidden }: V<"triangleAngles">) {
  const [A, B] = angles.map((a) => (a * Math.PI) / 180) as [number, number, number];
  const base = 300;
  // Apex from the two base angles (law of sines geometry).
  const h = (base * Math.tan(A) * Math.tan(B)) / (Math.tan(A) + Math.tan(B));
  const ax = h / Math.tan(A);
  const scale = Math.min(1, 170 / h);
  const P = [[40, 210], [40 + base * scale, 210], [40 + ax * scale, 210 - h * scale]] as const;
  const labels = angles.map((a, i) => (i === hidden ? "?" : `${a}°`));
  const offsets = [[34, -10], [-34, -10], [0, 34]] as const;
  return (
    <VisualFrame>
      <svg viewBox="0 0 380 230" className="mx-auto w-full max-w-md" role="img" aria-label="Triangle with angles">
        <motion.polygon points={P.map((p) => p.join(",")).join(" ")} fill="var(--primary)" fillOpacity={0.1} stroke="var(--primary)" strokeWidth={2.5} strokeLinejoin="round" initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
        {P.map((p, i) => (
          <text key={i} x={p[0] + offsets[i]![0]} y={p[1] + offsets[i]![1]} textAnchor="middle" className={cn("text-[15px] font-semibold", i === hidden ? "fill-warning" : "fill-foreground")}>
            {labels[i]}
          </text>
        ))}
      </svg>
    </VisualFrame>
  );
}

export function RightTriangle({ a: a0 = 3, b: b0 = 4, showSquares, labels }: V<"rightTriangle">) {
  const [a, setA] = useState(a0);
  const [b, setB] = useState(b0);
  const c = Math.hypot(a, b);
  const unit = showSquares ? 18 : 220 / Math.max(a, b);
  // With squares drawn, leave room left (square on a), below (on b) and up-right (on c).
  const ox = showSquares ? 20 + a * unit : 50, oy = showSquares ? 20 + (a + b) * unit : 30 + a * unit;
  // Right angle at (ox, oy); leg a vertical (opposite), leg b horizontal (adjacent).
  const top = [ox, oy - a * unit], right = [ox + b * unit, oy];
  const W = showSquares ? ox + (a + b) * unit + 20 : ox + b * unit + 60;
  const H = showSquares ? oy + b * unit + 20 : oy + 40;
  const nx = (a * unit) / (c * unit), ny = (b * unit) / (c * unit);
  const sq = (pts: number[][]) => pts.map((p) => p.join(",")).join(" ");
  return (
    <VisualFrame
      interactive={showSquares}
      controls={
        showSquares ? (
          <>
            <LabeledSlider label="Leg a" value={a} onChange={setA} min={1} max={8} />
            <LabeledSlider label="Leg b" value={b} onChange={setB} min={1} max={8} />
          </>
        ) : undefined
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto max-h-80 w-full" role="img" aria-label="Right triangle">
        {showSquares && (
          <g>
            <rect x={ox - a * unit} y={oy - a * unit} width={a * unit} height={a * unit} fill="var(--chart-2)" fillOpacity={0.25} stroke="var(--chart-2)" strokeWidth={2} />
            <text x={ox - (a * unit) / 2} y={oy - (a * unit) / 2 + 5} textAnchor="middle" className="fill-foreground text-[13px] font-semibold">{a * a}</text>
            <rect x={ox} y={oy} width={b * unit} height={b * unit} fill="var(--chart-3)" fillOpacity={0.25} stroke="var(--chart-3)" strokeWidth={2} />
            <text x={ox + (b * unit) / 2} y={oy + (b * unit) / 2 + 5} textAnchor="middle" className="fill-foreground text-[13px] font-semibold">{b * b}</text>
            <polygon
              points={sq([top, right, [right[0]! + nx * c * unit, right[1]! - ny * c * unit], [top[0]! + nx * c * unit, top[1]! - ny * c * unit]])}
              fill="var(--primary)"
              fillOpacity={0.18}
              stroke="var(--primary)"
              strokeWidth={2}
            />
            <text x={(top[0]! + right[0]!) / 2 + (nx * c * unit) / 2} y={(top[1]! + right[1]!) / 2 - (ny * c * unit) / 2 + 5} textAnchor="middle" className="fill-foreground text-[13px] font-semibold">
              {fmt(c * c)}
            </text>
          </g>
        )}
        <polygon points={sq([[ox, oy], top, right])} fill="var(--primary)" fillOpacity={0.12} stroke="var(--foreground)" strokeWidth={2.5} strokeLinejoin="round" />
        <polyline points={sq([[ox + 12, oy], [ox + 12, oy - 12], [ox, oy - 12]])} fill="none" stroke="var(--foreground)" strokeWidth={1.5} />
        {!showSquares && (
          <g className="fill-foreground text-[14px] font-semibold">
            <text x={ox - 10} y={oy - (a * unit) / 2} textAnchor="end">{labels?.a ?? "a"}</text>
            <text x={ox + (b * unit) / 2} y={oy + 24} textAnchor="middle">{labels?.b ?? "b"}</text>
            <text x={ox + (b * unit) / 2 + 14} y={oy - (a * unit) / 2 - 10} textAnchor="start">{labels?.c ?? "c"}</text>
            {labels?.angle && (
              <>
                <path d={`M ${right[0]! - 34} ${oy} A 34 34 0 0 1 ${right[0]! - 34 * Math.cos(Math.atan(a / b))} ${oy - 34 * Math.sin(Math.atan(a / b))}`} fill="none" stroke="var(--warning)" strokeWidth={2} />
                <text x={right[0]! - 52} y={oy - 8} textAnchor="middle" className="fill-warning">{labels.angle}</text>
              </>
            )}
          </g>
        )}
      </svg>
      {showSquares && (
        <p className="text-center text-sm">
          <Tex tex={`${a}^2 + ${b}^2 = ${a * a} + ${b * b} = ${a * a + b * b} = c^2 \\;\\Rightarrow\\; c = ${Number.isInteger(c) ? c : `\\sqrt{${a * a + b * b}} \\approx ${fmt(c)}`}`} />
        </p>
      )}
    </VisualFrame>
  );
}

export function CircleExplorer({ r: r0 = 2 }: V<"circleExplorer">) {
  const [r, setR] = useState(r0);
  const px = 18 * r;
  return (
    <VisualFrame interactive controls={<LabeledSlider label="Radius r" value={r} onChange={setR} min={0.5} max={5} step={0.5} />}>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
        <svg viewBox="-100 -100 200 200" className="size-48" role="img" aria-label={`Circle of radius ${r}`}>
          <motion.circle r={px} animate={{ r: px }} fill="var(--primary)" fillOpacity={0.15} stroke="var(--primary)" strokeWidth={3} />
          <motion.line x1={0} y1={0} animate={{ x2: px }} y2={0} stroke="var(--warning)" strokeWidth={2.5} />
          <circle r={3} fill="var(--foreground)" />
          <text x={px / 2} y={-6} textAnchor="middle" className="fill-warning text-[11px] font-semibold">r = {r}</text>
        </svg>
        <div className="space-y-2 text-sm">
          <Tex tex={`C = 2\\pi r = ${fmt(2 * r)}\\pi \\approx ${fmt(2 * Math.PI * r)}`} display />
          <Tex tex={`A = \\pi r^2 = ${fmt(r * r)}\\pi \\approx ${fmt(Math.PI * r * r)}`} display />
        </div>
      </div>
    </VisualFrame>
  );
}

export function AngleExplorer({ angle: a0 = 130 }: V<"angleExplorer">) {
  const [angle, setAngle] = useState(a0);
  const rad = (angle * Math.PI) / 180;
  const R = 80;
  const kind = angle === 0 ? "zero" : angle < 90 ? "acute" : angle === 90 ? "right" : angle < 180 ? "obtuse" : angle === 180 ? "straight" : angle < 360 ? "reflex" : "full turn";
  const large = angle > 180 ? 1 : 0;
  const end = [Math.cos(rad) * R, -Math.sin(rad) * R];
  const arc = `M 30 0 A 30 30 0 ${large} 0 ${Math.cos(rad) * 30} ${-Math.sin(rad) * 30}`;
  return (
    <VisualFrame interactive controls={<LabeledSlider label="Angle" value={angle} onChange={setAngle} min={0} max={359} format={(v) => `${v}°`} />}>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-around">
        <svg viewBox="-100 -100 200 200" className="size-52" role="img" aria-label={`${angle} degree angle`}>
          <circle r={R} fill="none" stroke="var(--border)" strokeDasharray="3 4" />
          <path d={arc} fill="none" stroke="var(--primary)" strokeWidth={3} />
          <line x1={0} y1={0} x2={R} y2={0} stroke="var(--foreground)" strokeWidth={3} strokeLinecap="round" />
          <line x1={0} y1={0} x2={end[0]} y2={end[1]} stroke="var(--primary)" strokeWidth={3} strokeLinecap="round" />
          <circle r={4} fill="var(--foreground)" />
        </svg>
        <div className="space-y-1 text-center sm:text-left">
          <div className="font-display text-5xl">{angle}°</div>
          <div className="text-sm font-semibold text-primary capitalize">{kind} angle</div>
          {angle <= 180 && <div className="text-sm text-muted-foreground">On a straight line it pairs with {180 - angle}°</div>}
          <div className="text-sm text-muted-foreground">Around a point it leaves {360 - angle}°</div>
        </div>
      </div>
    </VisualFrame>
  );
}
