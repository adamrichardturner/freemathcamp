"use client";

import { ChevronRight, List, Lock, Waypoints } from "lucide-react";
import { motion } from "motion/react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { MasteryRing, StatusDot, statusMeta } from "@/components/app/status";
import { UnitIcon } from "@/components/app/unit-icon";
import { Md } from "@/components/math/md";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCourseProgress, useLessonAccess, useSession } from "@/hooks/queries";
import type { ExerciseStatus } from "@/lib/api";
import { course, graph } from "@/lib/course";
import { LearningModeSwitch, MODE_META } from "./learning-mode";
import { LessonLink } from "./lesson-link";
import { cn } from "@/lib/utils";

const PrereqGraph = dynamic(() => import("./prereq-graph").then((m) => m.PrereqGraph), { ssr: false, loading: () => <Skeleton className="h-[70vh] rounded-2xl" /> });

export function CourseMap() {
  const { user, verified } = useSession();
  const { data: progress } = useCourseProgress(verified);
  const access = useLessonAccess();
  const [view, setView] = useState<"list" | "graph">("list");
  const byId = new Map(progress?.exercises.map((e) => [e.exerciseId, e]) ?? []);
  const statusOf = (id: string): ExerciseStatus => byId.get(id)?.status ?? "new";
  const masteryOf = (id: string) => byId.get(id)?.effectiveMastery ?? 0;
  const total = graph.refs.length;
  const mastered = progress?.exercises.filter((e) => e.status === "mastered").length ?? 0;
  const overall = progress ? progress.units.reduce((a, u) => a + u.mastery * u.total, 0) / total : 0;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/15 via-card to-chart-2/10 p-6 sm:p-10">
        <div className="pointer-events-none absolute inset-0 bg-dots opacity-60" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <div className="text-xs font-semibold tracking-widest text-primary uppercase">Course</div>
            <h1 className="mt-1 font-display text-5xl sm:text-6xl">{course.title}</h1>
            <p className="mt-2 text-lg font-medium">{course.tagline}</p>
            <Md md={course.description} className="mt-2 text-muted-foreground" />
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>{course.units.length} units</span>
              <span>{total} lessons</span>
              <span>∞ practice problems</span>
            </div>
          </div>
          {user && (
            <div className="flex items-center gap-4 rounded-2xl border bg-card/80 p-4 backdrop-blur">
              <MasteryRing value={overall} size={84} stroke={7}>
                <span className="text-base">{Math.round(overall * 100)}%</span>
              </MasteryRing>
              <div className="text-sm">
                <div className="font-semibold">Course mastery</div>
                <div className="text-muted-foreground">
                  {mastered} of {total} lessons mastered
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {access.canChooseMode && (
        <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-semibold">How do you want to take this course?</div>
            <p className="text-sm text-muted-foreground">{MODE_META[access.mode].short}</p>
          </div>
          <LearningModeSwitch mode={access.mode} className="self-start sm:self-auto" />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {(Object.keys(statusMeta) as ExerciseStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <StatusDot status={s} /> {statusMeta[s].label}
            </span>
          ))}
        </div>
        <ToggleGroup value={[view]} onValueChange={(v) => v[0] && setView(v[0] as "list" | "graph")} variant="outline" size="sm">
          <ToggleGroupItem value="list">
            <List /> Units
          </ToggleGroupItem>
          <ToggleGroupItem value="graph">
            <Waypoints /> Prerequisite map
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {view === "graph" ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Hover a lesson to light up everything it builds on. Click to open it{access.mode === "path" && access.canChooseMode ? " — dashed lessons unlock as you complete the ones before them" : ""}.</p>
          <PrereqGraph statusOf={statusOf} masteryOf={masteryOf} isLocked={access.isLocked} />
        </div>
      ) : (
        <div className="space-y-10">
          {course.units.map((unit, ui) => {
            const up = progress?.units.find((u) => u.unitId === unit.id);
            return (
              <motion.section key={unit.id} id={unit.id} className="scroll-mt-20" initial={ui < 2 ? false : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }}>
                <div className="mb-4 flex items-start gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-chart-5 text-primary-foreground shadow-md shadow-primary/20">
                    <UnitIcon name={unit.icon} className="size-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-muted-foreground">Unit {ui + 1}</div>
                    <h2 className="text-xl font-semibold">{unit.title}</h2>
                    <Md md={unit.description} className="text-sm text-muted-foreground" />
                  </div>
                  {up && up.started > 0 && <MasteryRing value={up.mastery} size={44} />}
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {unit.exercises.map((e, i) => {
                    const p = byId.get(e.id);
                    const status = p?.status ?? "new";
                    return (
                      <LessonLink
                        key={e.id}
                        id={e.id}
                        className="group flex min-w-0 items-center gap-3 rounded-xl border bg-card p-3.5 transition-all"
                        openClassName="hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                      >
                        {(locked) => (
                          <>
                            {locked ? (
                              <span className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-dashed border-muted-foreground/40">
                                <Lock className="size-4" />
                              </span>
                            ) : (
                              <span
                                className={cn("grid size-9 shrink-0 place-items-center rounded-full border-2 text-sm font-semibold tabular-nums", status === "new" && "text-muted-foreground")}
                                style={{ borderColor: statusMeta[status].ring, backgroundColor: status === "mastered" ? statusMeta[status].ring : undefined, color: status === "mastered" ? "white" : undefined }}
                              >
                                {status === "mastered" ? "✓" : i + 1}
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className={cn("truncate font-medium", !locked && "group-hover:text-primary")}>{e.title}</div>
                              <div className="truncate text-xs text-muted-foreground">
                                {locked ? (
                                  <>Complete {access.lockedBy(e.id)?.title} to unlock</>
                                ) : p && p.itemsSeen > 0 ? (
                                  `${statusMeta[status].label} · ${Math.round(p.effectiveMastery * 100)}%`
                                ) : (
                                  <Md md={e.summary} inline />
                                )}
                              </div>
                            </div>
                            {!locked && <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />}
                          </>
                        )}
                      </LessonLink>
                    );
                  })}
                </div>
              </motion.section>
            );
          })}
        </div>
      )}
    </div>
  );
}
