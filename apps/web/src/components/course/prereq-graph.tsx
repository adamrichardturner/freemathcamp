"use client";

import { Background, Controls, Handle, MarkerType, MiniMap, Position, ReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ancestors } from "@fmc/curriculum";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { useMemo, useState } from "react";
import { statusMeta } from "@/components/app/status";
import type { ExerciseStatus } from "@/lib/api";
import { graph, lessonHref } from "@/lib/course";
import { cn } from "@/lib/utils";

type LessonNode = Node<{ title: string; unit: string; status: ExerciseStatus; mastery: number; dim: boolean; focus: boolean; locked: boolean }, "lesson">;

function LessonNodeView({ data }: NodeProps<LessonNode>) {
  const m = statusMeta[data.status];
  return (
    <div
      className={cn(
        "w-[190px] cursor-pointer rounded-xl border-2 bg-card px-3 py-2 shadow-sm transition-all",
        data.locked && "cursor-not-allowed border-dashed bg-muted text-muted-foreground shadow-none grayscale",
        data.dim && "opacity-25",
        data.focus && "ring-4 ring-primary/30",
      )}
      style={{ borderColor: data.status === "new" ? "var(--border)" : m.ring }}
    >
      <Handle type="target" position={Position.Top} className="!size-1.5 !border-0 !bg-muted-foreground/40" />
      <div className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
        {data.locked && <Lock className="size-2.5 shrink-0" />} {data.unit}
      </div>
      <div className={cn("text-[13px] leading-tight font-semibold", data.locked && "opacity-70")}>{data.title}</div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${data.mastery * 100}%`, backgroundColor: m.ring }} />
      </div>
      <Handle type="source" position={Position.Bottom} className="!size-1.5 !border-0 !bg-muted-foreground/40" />
    </div>
  );
}

const nodeTypes = { lesson: LessonNodeView };

/**
 * A lesson card's size before it is measured. The nodes are rebuilt on every
 * render with no onNodesChange, so React Flow's measurements never reach them;
 * without a size the MiniMap skips every node and shows (and does) nothing.
 */
const NODE_WIDTH = 190;
const NODE_HEIGHT = 64;

/** Mini map colours: "Not started" uses the muted foreground, as var(--border) vanishes at that scale. */
const miniMapColor = (n: Node) => {
  const status = (n.data as LessonNode["data"]).status;
  return status === "new" ? "var(--muted-foreground)" : statusMeta[status].ring;
};

/** Layered layout: depth = longest prerequisite chain, ordered by course position. */
const layout = () => {
  const depth = new Map<string, number>();
  const d = (id: string): number => {
    if (depth.has(id)) return depth.get(id)!;
    const pres = graph.byId.get(id)!.exercise.prerequisites;
    const v = pres.length ? 1 + Math.max(...pres.map(d)) : 0;
    depth.set(id, v);
    return v;
  };
  graph.refs.forEach((r) => d(r.exercise.id));
  const layers = new Map<number, string[]>();
  for (const r of graph.refs) {
    const k = depth.get(r.exercise.id)!;
    layers.set(k, [...(layers.get(k) ?? []), r.exercise.id]);
  }
  const pos = new Map<string, { x: number; y: number }>();
  for (const [k, ids] of layers) ids.forEach((id, i) => pos.set(id, { x: (i - (ids.length - 1) / 2) * 220, y: k * 120 }));
  return pos;
};

export function PrereqGraph({
  statusOf,
  masteryOf,
  isLocked,
}: {
  statusOf: (id: string) => ExerciseStatus;
  masteryOf: (id: string) => number;
  isLocked: (id: string) => boolean;
}) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [hover, setHover] = useState<string | null>(null);
  const positions = useMemo(() => layout(), []);
  const chain = useMemo(() => (hover ? new Set([hover, ...ancestors(graph, hover)]) : null), [hover]);

  const nodes: LessonNode[] = graph.refs.map((r) => ({
    id: r.exercise.id,
    type: "lesson",
    position: positions.get(r.exercise.id)!,
    initialWidth: NODE_WIDTH,
    initialHeight: NODE_HEIGHT,
    data: {
      title: r.exercise.title,
      unit: r.unit.title,
      status: statusOf(r.exercise.id),
      mastery: masteryOf(r.exercise.id),
      dim: !!chain && !chain.has(r.exercise.id),
      focus: hover === r.exercise.id,
      locked: isLocked(r.exercise.id),
    },
  }));
  const edges: Edge[] = graph.refs.flatMap((r) =>
    r.exercise.prerequisites.map((pre) => {
      const lit = !!chain && chain.has(pre) && chain.has(r.exercise.id);
      return {
        id: `${pre}->${r.exercise.id}`,
        source: pre,
        target: r.exercise.id,
        type: "smoothstep",
        animated: lit,
        style: { stroke: lit ? "var(--primary)" : "var(--border)", strokeWidth: lit ? 2.5 : 1.5, opacity: chain && !lit ? 0.15 : 1 },
        markerEnd: { type: MarkerType.ArrowClosed, color: lit ? "var(--primary)" : "var(--muted-foreground)" },
      };
    }),
  );

  return (
    <div className="h-[70vh] min-h-[480px] overflow-hidden rounded-2xl border bg-card">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        colorMode={resolvedTheme === "dark" ? "dark" : "light"}
        fitView
        fitViewOptions={{ nodes: nodes.slice(0, 12), padding: 0.3 }}
        minZoom={0.15}
        nodesDraggable={false}
        nodesConnectable={false}
        onNodeMouseEnter={(_, n) => setHover(n.id)}
        onNodeMouseLeave={() => setHover(null)}
        onNodeClick={(_, n) => !isLocked(n.id) && router.push(lessonHref(n.id))}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={22} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeColor={miniMapColor}
          nodeBorderRadius={6}
          maskColor="color-mix(in oklch, var(--background) 70%, transparent)"
          className="!hidden overflow-hidden rounded-lg border !bg-card sm:!block"
          ariaLabel="Overview of the prerequisite map"
        />
      </ReactFlow>
    </div>
  );
}
