import { articleBySlug, readingForLesson } from "@fmc/curriculum/articles";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LearningModeSwitch } from "@/components/learning-mode";
import { FloatingPracticeButton, LessonFirstHint, PracticeDueBanner } from "@/components/next-step";
import { useOpenLesson } from "@/components/lesson-link";
import { Reveal } from "@/components/reveal";
import { Lesson, Rich } from "@/components/rich";
import { statusMeta, unitSymbol } from "@/components/status";
import { Button, Card, CardHeader, Icon, IconChip, MasteryRing, Pill, Row, Screen, Separator, Skeleton, Text, type SymbolName } from "@/components/ui";
import { api, type ExerciseStatus, type PracticeMode } from "@/lib/api";
import { COURSE_ID, exerciseRef, graph } from "@/lib/course";
import { pct, relative } from "@/lib/format";
import { nextStep } from "@/lib/next-step";
import { plain } from "@/lib/plain";
import { keys, useCourseProgress, useExerciseDetail } from "@/lib/queries";
import { alpha, radius, useTheme } from "@/lib/theme";
import { useLayout } from "@/lib/layout";

const MODES: {
  mode: PracticeMode;
  icon: SymbolName;
  title: string;
  text: string;
}[] = [
  {
    mode: "learn",
    icon: "sparkles",
    title: "Learn",
    text: "Six problems that start at your level and adapt as you go.",
  },
  {
    mode: "review",
    icon: "arrow.trianglehead.2.clockwise",
    title: "Review",
    text: "A quick five-problem refresher to strengthen memory.",
  },
  {
    mode: "challenge",
    icon: "dumbbell.fill",
    title: "Challenge",
    text: "Eight problems that start gently and build back confidence on weak spots.",
  },
];

/** The web's lesson page: the lesson itself, then practice, with what it builds on and leads to. */
export default function LessonScreen() {
  const { id, mode } = useLocalSearchParams<{
    id: string;
    mode?: PracticeMode;
  }>();
  const ref = exerciseRef(id);
  const { c } = useTheme();
  const { medium, fit } = useLayout();
  const qc = useQueryClient();
  const { data: detail, isFetched: detailFetched } = useExerciseDetail(id);
  const { data: courseProgress } = useCourseProgress();
  const { isLocked, known, lockedBy, mode: courseMode, open } = useOpenLesson();
  const locked = isLocked(id);

  // The page is revealed in one go once the learner's progress has arrived and every web
  // view in it (summary, lesson, key ideas) has laid out, so nothing pops in or pushes the page down.
  const dataReady = known && detailFetched;

  const practise = (m: PracticeMode) => router.push({ pathname: "/practice/[id]", params: { id, mode: m } });

  // Every visit opens on the lesson. A recommendation (mode) or a review falling due
  // raises a call to practise above it rather than skipping past it.
  const [now] = useState(() => Date.now());
  // When the lesson was viewed before this visit: read once, before this visit's own view lands.
  const [viewedAt, setViewedAt] = useState<string | null | undefined>(undefined);
  if (detailFetched && viewedAt === undefined) setViewedAt(detail?.progress?.lessonViewedAt ?? null);
  // Once the banner scrolls out of sight, a floating button keeps the call to practise in reach.
  const [bannerBottom, setBannerBottom] = useState(0);
  const [floating, setFloating] = useState(false);

  const viewed = useMutation({
    mutationFn: () => api.post(`/courses/${COURSE_ID}/exercises/${id}/lesson-viewed`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.exercise(id) }),
  });
  const marked = useRef(false);
  useEffect(() => {
    if (known && !locked && !marked.current) {
      marked.current = true;
      viewed.mutate();
    }
  }, [known, locked, viewed]);

  if (!ref) return null;
  const { exercise, unit } = ref;
  const progress = detail?.progress;
  const statusById = new Map(courseProgress?.exercises.map((e) => [e.exerciseId, e.status]) ?? []);
  const prev = graph.refs[ref.order - 1];
  const next = graph.refs[ref.order + 1];
  const dependents = graph.dependents.get(id) ?? [];
  const weakPrereqs = (detail?.prerequisites ?? []).filter((p) => p.status === "new" || p.status === "struggling");
  const step = nextStep({ progress, requested: mode, viewedAt, now });
  const recommended: PracticeMode = step.mode;
  const reading = readingForLesson(COURSE_ID, id)
    .map((s) => articleBySlug(s))
    .filter((a) => !!a)
    .slice(0, 8);

  return (
    <View style={{ flex: 1 }}>
      <Screen
        flush
        scrollEventThrottle={64}
        onScroll={(e) => {
          const past = bannerBottom > 0 && e.nativeEvent.contentOffset.y > bannerBottom;
          if (past !== floating) setFloating(past);
        }}
      >
        <Animated.View entering={FadeInDown.duration(350)} style={{ paddingHorizontal: 16, gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icon name={unitSymbol(unit.icon)} size={13} tone="muted" />
            <Text variant="small" muted>
              {unit.title}
            </Text>
          </View>
          <Text variant="display">{exercise.title}</Text>
        </Animated.View>

        <Reveal ready={dataReady} gap={20} skeleton={<LessonSkeleton />}>
          <View style={{ paddingHorizontal: 16, gap: 8 }}>
            <Rich md={exercise.summary} size="lg" muted />
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 8,
                minHeight: 26,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Icon name="clock" size={13} tone="muted" />
                <Text variant="small" muted>
                  ~{exercise.estimatedMinutes} min
                </Text>
              </View>
              {progress && <Pill label={statusMeta[progress.status].label} tone={statusMeta[progress.status].tone} icon={progress.status === "mastered" ? "checkmark.circle.fill" : undefined} />}
              {progress?.dueAt && progress.sessionsCompleted > 0 && (
                <Text variant="small" muted>
                  · review {relative(progress.dueAt)}
                </Text>
              )}
            </View>
          </View>
          {progress && progress.itemsSeen > 0 && (
            <View style={{ paddingHorizontal: 16 }}>
              <Card
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                }}
              >
                <MasteryRing value={progress.effectiveMastery} size={52} stroke={5} color={statusMeta[progress.status].ring(c)}>
                  <Text variant="caption" weight="semibold">
                    {pct(progress.effectiveMastery)}
                  </Text>
                </MasteryRing>
                <View>
                  <Text variant="small" weight="semibold">
                    Mastery today
                  </Text>
                  <Text variant="caption" muted>
                    {progress.itemsSeen} problems · {progress.sessionsCompleted} sessions · struggle {pct(progress.struggle)}
                  </Text>
                </View>
              </Card>
            </View>
          )}

          {!locked && step.kind === "practice" && (
            <View onLayout={(e) => setBannerBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}>
              <PracticeDueBanner step={step} onStart={() => practise(step.mode)} />
            </View>
          )}
          {!locked && step.kind === "lesson" && !(progress && progress.sessionsCompleted > 0) && <LessonFirstHint minutes={exercise.estimatedMinutes} />}

          {locked ? (
            <View style={{ paddingHorizontal: 16 }}>
              <Card
                style={{
                  padding: 24,
                  alignItems: "center",
                  gap: 14,
                  borderStyle: "dashed",
                }}
              >
                <IconChip name="lock.fill" tone="muted" size={60} />
                <Text variant="title" style={{ textAlign: "center" }}>
                  This lesson is locked
                </Text>
                <Text muted style={{ textAlign: "center" }}>
                  You're in Path mode, so lessons open in order. Finish a practice session on <Text weight="medium">{lockedBy(id)?.title}</Text> to unlock it.
                </Text>
                {lockedBy(id) && (
                  <Button
                    title={`Go to ${lockedBy(id)!.title}`}
                    iconRight="arrow.right"
                    style={fit(260)}
                    onPress={() =>
                      router.replace({
                        pathname: "/lesson/[id]",
                        params: { id: lockedBy(id)!.id },
                      })
                    }
                  />
                )}
                <Text variant="caption" muted style={{ textAlign: "center", marginTop: 6 }}>
                  Prefer to explore freely? Audit mode opens every lesson.
                </Text>
                <LearningModeSwitch mode={courseMode} />
              </Card>
            </View>
          ) : (
            <>
              {exercise.prerequisites.length > 0 && weakPrereqs.length > 0 && (
                <View
                  style={{
                    marginHorizontal: 16,
                    flexDirection: "row",
                    gap: 10,
                    padding: 14,
                    borderRadius: radius.xl,
                    borderWidth: 1,
                    borderColor: alpha(c.info, 0.3),
                    backgroundColor: alpha(c.info, 0.06),
                  }}
                >
                  <Icon name="point.3.connected.trianglepath.dotted" size={18} tone="info" />
                  <Text variant="small" style={{ flex: 1 }}>
                    <Text variant="small" weight="semibold">
                      New to this?
                    </Text>{" "}
                    It builds on{" "}
                    {weakPrereqs.map((p, i) => (
                      <Text key={p.exerciseId} variant="small" weight="medium" tone="info" onPress={() => open(p.exerciseId)}>
                        {i > 0 ? (i === weakPrereqs.length - 1 ? " and " : ", ") : ""}
                        {exerciseRef(p.exerciseId)?.exercise.title}
                      </Text>
                    ))}
                    . Feel free to dive in anyway.
                  </Text>
                </View>
              )}

              <Lesson source={{ kind: "lesson", courseId: COURSE_ID, exerciseId: id }} />

              <View style={{ paddingHorizontal: 16, gap: 16 }}>
                <Card featured style={{ padding: 20, alignItems: "center", gap: 8 }}>
                  <Icon name="sparkles" size={24} tone="primary" />
                  <Text variant="heading">Ready to try it?</Text>
                  <Text variant="small" muted style={{ textAlign: "center" }}>
                    Problems adapt to you as you go — no two sessions are the same.
                  </Text>
                  <Button
                    title={step.kind === "practice" ? step.cta : "Start practising"}
                    iconRight="arrow.right"
                    size="lg"
                    style={{
                      marginTop: 6,
                      alignSelf: medium ? "center" : "stretch",
                      minWidth: medium ? 320 : undefined,
                    }}
                    onPress={() => practise(step.mode)}
                  />
                </Card>

                <View style={{ gap: 10 }}>
                  <Text variant="heading">Practice modes</Text>
                  {MODES.map((m) => {
                    const disabled = m.mode === "review" && (progress?.sessionsCompleted ?? 0) === 0;
                    const rec = recommended === m.mode;
                    return (
                      <Pressable
                        key={m.mode}
                        disabled={disabled}
                        onPress={() => practise(m.mode)}
                        style={({ pressed }) => ({
                          opacity: disabled ? 0.5 : 1,
                          transform: [{ scale: pressed ? 0.985 : 1 }],
                        })}
                      >
                        <Card
                          style={[
                            {
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 12,
                              padding: 14,
                            },
                            rec && {
                              borderColor: alpha(c.primary, 0.5),
                              borderWidth: 1.5,
                            },
                          ]}
                        >
                          <IconChip name={m.icon} />
                          <View style={{ flex: 1, gap: 2 }}>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <Text weight="semibold">{m.title}</Text>
                              {rec && <Pill label="Recommended" solid />}
                            </View>
                            <Text variant="caption" muted>
                              {disabled ? "Available after your first session." : m.text}
                            </Text>
                          </View>
                        </Card>
                      </Pressable>
                    );
                  })}
                </View>

                {exercise.prerequisites.length > 0 && (
                  <LinkCard
                    title="Builds on"
                    icon="point.3.connected.trianglepath.dotted"
                    subtitle="Not required — but if this topic is new to you, these give you the background."
                    ids={exercise.prerequisites}
                    statusOf={(x) => statusById.get(x)}
                  />
                )}

                <Card>
                  <CardHeader title="Key ideas" />
                  <View style={{ padding: 16, paddingTop: 10, gap: 8 }}>
                    {exercise.keyIdeas.map((k, i) => (
                      <View key={i} style={{ flexDirection: "row", gap: 10 }}>
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: c.primary,
                            marginTop: 9,
                          }}
                        />
                        <View style={{ flex: 1 }}>
                          <Rich md={k} size="sm" />
                        </View>
                      </View>
                    ))}
                  </View>
                </Card>

                {reading.length > 0 && (
                  <Card>
                    <CardHeader title="Suggested reading" icon="book.pages" iconTone="chart2" />
                    <View style={{ paddingVertical: 6 }}>
                      {reading.map((a, i) => (
                        <View key={a.slug}>
                          {i > 0 && <Separator inset={16} />}
                          <Row
                            title={a.title}
                            subtitle={plain(a.definition)}
                            onPress={() =>
                              router.push({
                                pathname: "/article/[slug]",
                                params: { slug: a.slug },
                              })
                            }
                          />
                        </View>
                      ))}
                    </View>
                  </Card>
                )}

                {dependents.length > 0 && <LinkCard title="Leads to" icon="lock.open" ids={dependents.slice(0, 6)} statusOf={(x) => statusById.get(x)} />}
              </View>
            </>
          )}

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 12,
              paddingHorizontal: 16,
              paddingTop: 8,
            }}
          >
            {prev ? <Sibling id={prev.exercise.id} direction="prev" /> : <View />}
            {next && <Sibling id={next.exercise.id} direction="next" />}
          </View>
        </Reveal>
      </Screen>
      {dataReady && !locked && step.kind === "practice" && floating && <FloatingPracticeButton step={step} onStart={() => practise(step.mode)} />}
    </View>
  );
}

function LinkCard({ title, icon, subtitle, ids, statusOf }: { title: string; icon: SymbolName; subtitle?: string; ids: string[]; statusOf: (id: string) => ExerciseStatus | undefined }) {
  const { c } = useTheme();
  const { open, isLocked } = useOpenLesson();
  return (
    <Card>
      <CardHeader title={title} icon={icon} subtitle={subtitle} />
      <View style={{ paddingVertical: 6 }}>
        {ids.map((x, i) => {
          const r = exerciseRef(x);
          if (!r) return null;
          const status = statusOf(x) ?? "new";
          const locked = isLocked(x);
          return (
            <View key={x}>
              {i > 0 && <Separator inset={40} />}
              <Row
                leading={
                  locked ? (
                    <Icon name="lock.fill" size={12} tone="muted" />
                  ) : (
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: status === "new" ? alpha(c.mutedForeground, 0.4) : statusMeta[status].ring(c),
                      }}
                    />
                  )
                }
                title={r.exercise.title}
                onPress={() => open(x)}
              />
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function Sibling({ id, direction }: { id: string; direction: "prev" | "next" }) {
  const { isLocked } = useOpenLesson();
  const title = exerciseRef(id)?.exercise.title ?? "";
  const locked = isLocked(id);
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={locked}
      icon={direction === "prev" ? "arrow.left" : undefined}
      iconRight={direction === "next" ? (locked ? "lock.fill" : "arrow.right") : undefined}
      title={title}
      style={{ maxWidth: "48%" }}
      onPress={() => router.replace({ pathname: "/lesson/[id]", params: { id } })}
    />
  );
}

/** Where the lesson goes while it loads: the shape of a lesson, gently pulsing. */
function LessonSkeleton() {
  return (
    <View style={{ paddingHorizontal: 16, gap: 14 }}>
      <Skeleton height={18} width="92%" />
      <Skeleton height={18} width="78%" />
      <Skeleton height={240} style={{ marginTop: 6 }} />
      <Skeleton height={18} width="88%" />
      <Skeleton height={18} width="64%" />
      <Skeleton height={130} style={{ marginTop: 6 }} />
    </View>
  );
}
