"use client";

import type { ConceptEntry } from "@fmc/curriculum";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, Clock, Dumbbell, Dices, Lock, LockKeyhole, Repeat, Sparkles, Waypoints } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ButtonLink } from "@/components/app/button-link";
import { MasteryRing, StatusBadge, StatusDot, statusMeta } from "@/components/app/status";
import { UnitIcon } from "@/components/app/unit-icon";
import { VerifyEmailCard } from "@/components/app/verify-email-card";
import { SuggestedReading } from "@/components/articles/suggested-reading";
import { Lesson } from "@/components/course/lesson-blocks";
import { Md } from "@/components/math/md";
import { PracticeSession } from "@/components/practice/practice-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { keys, useCourseProgress, useExerciseDetail, useLessonAccess, useSession } from "@/hooks/queries";
import { api, type ExerciseStatus, type PracticeMode } from "@/lib/api";
import { COURSE_ID, exerciseRef, graph, lessonHref } from "@/lib/course";
import { pct, relative } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LearningModeSwitch } from "./learning-mode";
import { LessonLink } from "./lesson-link";

export function ExerciseView({ exerciseId, reading = [] }: { exerciseId: string; reading?: ConceptEntry[] }) {
  const ref = exerciseRef(exerciseId)!;
  const { exercise, unit } = ref;
  const params = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const { user, ready, verified } = useSession();
  const { data: detail, isFetched: detailFetched } = useExerciseDetail(exerciseId, verified);
  const { data: courseProgress } = useCourseProgress(verified);
  const access = useLessonAccess();
  const locked = access.isLocked(exerciseId);
  const requestedMode = params.get("mode") as PracticeMode | null;
  const [tab, setTab] = useState(requestedMode ? "practice" : "lesson");
  // Arriving from a recommendation (?mode=…) drops straight into practice.
  const [practising, setPractising] = useState<PracticeMode | null>(requestedMode);
  const statusById = new Map(courseProgress?.exercises.map((e) => [e.exerciseId, e.status]) ?? []);

  const viewed = useMutation({
    mutationFn: () => api.post(`/courses/${COURSE_ID}/exercises/${exerciseId}/lesson-viewed`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.exercise(exerciseId) }),
  });
  const markedRef = useRef(false);
  const { mutate: markViewed } = viewed;
  useEffect(() => {
    if (verified && access.known && !locked && !markedRef.current) {
      markedRef.current = true;
      markViewed();
    }
  }, [verified, access.known, locked, markViewed]);

  // Everything that depends on the learner (locks, progress, the prerequisite nudge)
  // lands at once: until then a skeleton covers the lesson, which stays in the page
  // (for search engines and no-JS readers) but hidden, so nothing jumps.
  const settled = ready && (!verified || (detailFetched && access.known));

  const progress = settled ? detail?.progress : undefined;
  const prev = graph.refs[ref.order - 1];
  const next = graph.refs[ref.order + 1];
  const dependents = graph.dependents.get(exerciseId) ?? [];
  const weakPrereqs = (detail?.prerequisites ?? []).filter((p) => p.status === "new" || p.status === "struggling");

  const startPractice = (mode: PracticeMode) => {
    setTab("practice");
    setPractising(mode);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/courses/foundations" className="hover:text-foreground">
          Foundations
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="flex items-center gap-1.5">
          <UnitIcon name={unit.icon} className="size-3.5" /> {unit.title}
        </span>
      </nav>

      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <h1 className="font-display text-4xl leading-tight sm:text-5xl">{exercise.title}</h1>
          <Md md={exercise.summary} className="mt-2 text-lg text-muted-foreground" />
          <div className="mt-3 flex min-h-6 flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" /> ~{exercise.estimatedMinutes} min
            </span>
            {progress && <StatusBadge status={progress.status} />}
            {progress?.dueAt && progress.sessionsCompleted > 0 && <span>· review {relative(progress.dueAt)}</span>}
          </div>
        </div>
      </header>

      <div className="relative">
        {!settled && <LessonSkeleton />}
        <div aria-busy={!settled} className={cn("transition-[opacity,translate] duration-300 ease-out", settled ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0")}>
          {progress && progress.itemsSeen > 0 && (
            <div className="flex items-center gap-3 mb-6 w-fit rounded-2xl border bg-card px-4 py-3">
              <MasteryRing value={progress.effectiveMastery} size={52} stroke={5} color={statusMeta[progress.status].ring}>
                <span className="text-xs">{pct(progress.effectiveMastery)}</span>
              </MasteryRing>
              <div className="text-xs text-muted-foreground">
                <div className="font-semibold text-foreground">Mastery today</div>
                {progress.itemsSeen} problems · {progress.sessionsCompleted} sessions
                <br />
                struggle {pct(progress.struggle)}
              </div>
            </div>
          )}
          {settled && locked ? (
            <LockedLesson exerciseId={exerciseId} />
          ) : (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
              <Tabs value={tab} onValueChange={(v) => setTab(v as string)} className="min-w-0">
                <TabsList className="mb-4">
                  <TabsTrigger value="lesson" className="gap-1.5">
                    <BookOpen className="size-4" /> Lesson
                  </TabsTrigger>
                  <TabsTrigger value="practice" className="gap-1.5">
                    <Dumbbell className="size-4" /> Practice
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="lesson" className="space-y-8">
                  {exercise.prerequisites.length > 0 && weakPrereqs.length > 0 && <PrereqNudge ids={weakPrereqs.map((p) => p.exerciseId)} />}
                  <Lesson blocks={exercise.lesson} />
                  <div className="flex flex-col items-center gap-3 rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-chart-2/10 p-6 text-center">
                    <Sparkles className="size-6 text-primary" />
                    <div>
                      <div className="text-lg font-semibold">Ready to try it?</div>
                      <p className="text-sm text-muted-foreground">Problems adapt to you as you go — no two sessions are the same.</p>
                    </div>
                    <Button size="lg" className="h-11 px-6" onClick={() => startPractice(progress?.status === "struggling" ? "challenge" : "learn")}>
                      Start practising <ArrowRight />
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="practice">
                  {!ready ? (
                    <div className="h-64 animate-pulse rounded-2xl border bg-card" />
                  ) : !user ? (
                    <SignInToPractice exerciseId={exerciseId} />
                  ) : !verified ? (
                    <VerifyEmailCard user={user} compact />
                  ) : practising ? (
                    <PracticeSession
                      key={practising}
                      exerciseId={exerciseId}
                      mode={practising}
                      onExit={() => {
                        setPractising(null);
                        router.replace(lessonHref(exerciseId), { scroll: false });
                      }}
                    />
                  ) : (
                    <ModePicker status={progress?.status ?? "new"} sessions={progress?.sessionsCompleted ?? 0} recommended={requestedMode} onStart={startPractice} />
                  )}
                </TabsContent>
              </Tabs>

              <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
                {exercise.prerequisites.length > 0 && (
                  <Card className="gap-3">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Waypoints className="size-4 text-primary" /> Builds on
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">Not required — but if this topic is new to you, these give you the background.</p>
                    </CardHeader>
                    <CardContent>
                      <LinkList ids={exercise.prerequisites} statusOf={(id) => statusById.get(id)} />
                    </CardContent>
                  </Card>
                )}
                <Card className="gap-3">
                  <CardHeader>
                    <CardTitle className="text-sm">Key ideas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      {exercise.keyIdeas.map((k, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                          <Md md={k} inline />
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <SuggestedReading items={reading} from={exerciseId} />
                {dependents.length > 0 && (
                  <Card className="gap-3">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Lock className="size-4 text-chart-2" /> Leads to
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <LinkList ids={dependents.slice(0, 6)} statusOf={(id) => statusById.get(id)} />
                    </CardContent>
                  </Card>
                )}
                {detail && detail.timeline.length > 1 && <MasteryTimeline points={detail.timeline} />}
              </aside>
            </div>
          )}
          <div className="mt-8 flex items-center justify-between gap-3 border-t pt-6">
            {prev ? <SiblingLink id={prev.exercise.id} direction="prev" /> : <span />}
            {next && <SiblingLink id={next.exercise.id} direction="next" />}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Previous / next lesson button; a locked neighbour renders as a disabled button with a padlock. */
function SiblingLink({ id, direction }: { id: string; direction: "prev" | "next" }) {
  const { isLocked } = useLessonAccess();
  const title = exerciseRef(id)?.exercise.title;
  if (isLocked(id))
    return (
      <Button variant="ghost" disabled className="max-w-[45%]" title="Complete this lesson to unlock the next one">
        <span className="truncate">{title}</span> <Lock />
      </Button>
    );
  return (
    <ButtonLink href={lessonHref(id)} variant="ghost" className="max-w-[45%]">
      {direction === "prev" && <ArrowLeft />} <span className="truncate">{title}</span> {direction === "next" && <ArrowRight />}
    </ButtonLink>
  );
}

function LockedLesson({ exerciseId }: { exerciseId: string }) {
  const { lockedBy, mode } = useLessonAccess();
  const before = lockedBy(exerciseId);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-3xl border border-dashed bg-muted/30 px-6 py-12 text-center sm:py-16">
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-50" />
      <div className="relative mx-auto flex max-w-md flex-col items-center gap-4">
        <span className="grid size-16 place-items-center rounded-2xl border bg-card text-muted-foreground shadow-sm">
          <LockKeyhole className="size-8" />
        </span>
        <div>
          <h2 className="text-2xl font-semibold">This lesson is locked</h2>
          <p className="mt-1 text-muted-foreground">
            You&apos;re in Path mode, so lessons open in order. Finish a practice session on <span className="font-medium text-foreground">{before?.title}</span> to unlock it.
          </p>
        </div>
        {before && (
          <ButtonLink href={lessonHref(before.id)} size="lg" className="h-11 px-6">
            Go to {before.title} <ArrowRight />
          </ButtonLink>
        )}
        <div className="mt-2 flex flex-col items-center gap-2 border-t pt-5">
          <p className="text-xs text-muted-foreground">Prefer to explore freely? Audit mode opens every lesson.</p>
          <LearningModeSwitch mode={mode} />
        </div>
      </div>
    </motion.div>
  );
}

function PrereqNudge({ ids }: { ids: string[] }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-info/30 bg-info/[0.06] p-4 sm:flex-row sm:items-center">
      <Waypoints className="size-5 shrink-0 text-info" />
      <p className="flex-1 text-sm">
        <span className="font-semibold">New to this?</span> It builds on{" "}
        {ids.map((id, i) => (
          <span key={id}>
            {i > 0 && (i === ids.length - 1 ? " and " : ", ")}
            <LessonLink id={id} className="font-medium text-info underline-offset-2" openClassName="hover:underline" lockedClassName="border-0 bg-transparent hover:bg-transparent">
              {exerciseRef(id)?.exercise.title}
            </LessonLink>
          </span>
        ))}
        . Feel free to dive in anyway.
      </p>
    </div>
  );
}

function LinkList({ ids, statusOf }: { ids: string[]; statusOf: (id: string) => ExerciseStatus | undefined }) {
  return (
    <ul className="-mx-2 space-y-0.5">
      {ids.map((id) => {
        const r = exerciseRef(id);
        if (!r) return null;
        const status = statusOf(id) ?? "new";
        return (
          <li key={id}>
            <LessonLink id={id} className="group flex items-center gap-2.5 rounded-lg border border-transparent px-2 py-1.5 text-sm" openClassName="hover:bg-muted">
              {(locked) => (
                <>
                  {locked ? <Lock className="size-3 shrink-0" /> : <StatusDot status={status} />}
                  <span className={cn("min-w-0 flex-1 truncate", !locked && "group-hover:text-primary")}>{r.exercise.title}</span>
                  {!locked && <ChevronRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />}
                </>
              )}
            </LessonLink>
          </li>
        );
      })}
    </ul>
  );
}

const MODES: { mode: PracticeMode; icon: typeof Dices; title: string; text: string }[] = [
  { mode: "learn", icon: Sparkles, title: "Learn", text: "Six problems that start at your level and adapt as you go." },
  { mode: "review", icon: Repeat, title: "Review", text: "A quick five-problem refresher to strengthen memory." },
  { mode: "challenge", icon: Dumbbell, title: "Challenge", text: "Eight problems that start gently and build back confidence on weak spots." },
];

function ModePicker({ status, sessions, recommended, onStart }: { status: ExerciseStatus; sessions: number; recommended: PracticeMode | null; onStart: (m: PracticeMode) => void }) {
  const rec = recommended ?? (status === "struggling" ? "challenge" : status === "review" ? "review" : "learn");
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {MODES.map((m, i) => {
          const disabled = m.mode === "review" && sessions === 0;
          return (
            <motion.button
              key={m.mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              disabled={disabled}
              onClick={() => onStart(m.mode)}
              className={cn(
                "group relative flex flex-col items-start gap-2 rounded-2xl border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md disabled:pointer-events-none disabled:opacity-50",
                rec === m.mode && "border-primary/50 ring-4 ring-primary/10",
              )}
            >
              {rec === m.mode && <span className="absolute top-3 right-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">Recommended</span>}
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <m.icon className="size-5" />
              </span>
              <span className="font-semibold">{m.title}</span>
              <span className="text-sm text-muted-foreground">{disabled ? "Available after your first session." : m.text}</span>
            </motion.button>
          );
        })}
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Press <kbd className="rounded border bg-muted px-1">Enter</kbd> to check answers, <kbd className="rounded border bg-muted px-1">1</kbd>–<kbd className="rounded border bg-muted px-1">4</kbd> to
        pick options.
      </p>
    </div>
  );
}

function SignInToPractice({ exerciseId }: { exerciseId: string }) {
  const next = encodeURIComponent(`${lessonHref(exerciseId)}?mode=learn`);
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-8 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Dumbbell className="size-6" />
      </span>
      <div>
        <h3 className="text-xl font-semibold">Practise with adaptive problems</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Create a free account so we can track your progress, adapt difficulty and schedule reviews at the right time.</p>
      </div>
      <div className="flex gap-2">
        <ButtonLink href={`/register?next=${next}`}>Create free account</ButtonLink>
        <ButtonLink href={`/login?next=${next}`} variant="outline">
          Sign in
        </ButtonLink>
      </div>
    </div>
  );
}

function MasteryTimeline({ points }: { points: { at: string; mastery: number; struggle: number }[] }) {
  const W = 260,
    H = 70;
  const x = (i: number) => (i / (points.length - 1)) * W;
  const path = (k: "mastery" | "struggle") => points.map((p, i) => `${i ? "L" : "M"} ${x(i)} ${H - p[k] * H}`).join(" ");
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          Your journey
          <span className="flex gap-3 text-[10px] font-normal text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-3 bg-primary" /> mastery
            </span>
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-3 bg-warning" /> struggle
            </span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <svg viewBox={`-2 -2 ${W + 4} ${H + 4}`} className="w-full">
          <path d={`${path("mastery")} L ${W} ${H} L 0 ${H} Z`} fill="var(--primary)" fillOpacity={0.1} />
          <path d={path("mastery")} fill="none" stroke="var(--primary)" strokeWidth={2} />
          <path d={path("struggle")} fill="none" stroke="var(--warning)" strokeWidth={1.5} strokeDasharray="3 3" />
        </svg>
      </CardContent>
    </Card>
  );
}

/** The shape of a lesson, pulsing, while the learner's progress loads. */
function LessonSkeleton() {
  return (
    <div aria-hidden className="absolute inset-x-0 top-0 z-10 grid gap-8 bg-background lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-4">
        <Skeleton className="h-9 w-56 rounded-lg" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-4 w-10/12" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
      <div className="hidden space-y-4 lg:block">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    </div>
  );
}
