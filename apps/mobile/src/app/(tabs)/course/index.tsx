import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, View } from "react-native";
import { LearningModeSwitch, MODE_META } from "@/components/learning-mode";
import { useOpenLesson } from "@/components/lesson-link";
import { LessonFlag } from "@/components/next-step";
import { Reveal } from "@/components/reveal";
import { statusMeta, unitSymbol } from "@/components/status";
import { Button, Card, Icon, IconChip, MasteryRing, Row, Screen, Skeleton, Text } from "@/components/ui";
import type { ExerciseStatus, ProgressView } from "@/lib/api";
import { course, graph } from "@/lib/course";
import { useLayout } from "@/lib/layout";
import { plain } from "@/lib/plain";
import { keys, useCourseProgress, useRefreshOnFocus, useSession } from "@/lib/queries";
import { alpha, radius, useTheme } from "@/lib/theme";

/** The web's course map: the course, its mode, and every unit's lessons with their status. */
export default function CourseMap() {
  const { c } = useTheme();
  const { fit, medium } = useLayout();
  const { user } = useSession();
  const { data: progress, isFetched, refetch, isRefetching } = useCourseProgress();
  useRefreshOnFocus(keys.progress);
  const { open, isLocked, lockedBy, mode, known } = useOpenLesson();
  const byId = new Map(progress?.exercises.map((e) => [e.exerciseId, e]) ?? []);
  const total = graph.refs.length;
  const mastered = progress?.exercises.filter((e) => e.status === "mastered").length ?? 0;
  const overall = progress ? progress.units.reduce((a, u) => a + u.mastery * u.total, 0) / total : 0;
  const [now] = useState(() => Date.now());
  // Practice that's due now, and the first fresh lesson open to the learner: flagged so it's plain where to go next.
  const isDue = (p: ProgressView | undefined) => !!p && p.sessionsCompleted > 0 && (p.status === "struggling" || (!!p.dueAt && new Date(p.dueAt).getTime() <= now));
  const startHere = user && known ? graph.refs.find((r) => !isLocked(r.exercise.id) && (byId.get(r.exercise.id)?.sessionsCompleted ?? 0) === 0)?.exercise.id : undefined;
  const firstDue = user ? graph.refs.find((r) => isDue(byId.get(r.exercise.id)))?.exercise.id : undefined;
  const jumpTo = firstDue ?? startHere;

  return (
    <Screen title="Foundations" refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}>
      {/* The mastery ring, statuses and locks all depend on progress; they land together. */}
      <Reveal ready={isFetched && known} gap={20} skeleton={<CourseSkeleton />}>
        <View style={{ borderRadius: radius["3xl"], borderCurve: "continuous", overflow: "hidden", borderWidth: 1, borderColor: c.border }}>
          <LinearGradient colors={[alpha(c.primary, 0.16), c.card, alpha(c.chart2, 0.1)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20, gap: 8 }}>
            <Text variant="label" tone="primary">
              Course
            </Text>
            <Text weight="medium" style={{ fontSize: 18 }}>
              {course.tagline}
            </Text>
            <Text variant="small" muted>
              {plain(course.description)}
            </Text>
            <View style={{ flexDirection: "row", gap: 14, marginTop: 4 }}>
              {[`${course.units.length} units`, `${total} lessons`, "∞ practice problems"].map((x) => (
                <Text key={x} variant="caption" muted>
                  {x}
                </Text>
              ))}
            </View>
            {user && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 10, padding: 12, borderRadius: radius["2xl"], backgroundColor: alpha(c.card, 0.8), borderWidth: 1, borderColor: c.border }}>
                <MasteryRing value={overall} size={64} stroke={6}>
                  <Text weight="semibold">{Math.round(overall * 100)}%</Text>
                </MasteryRing>
                <View>
                  <Text weight="semibold">Course mastery</Text>
                  <Text variant="small" muted>
                    {mastered} of {total} lessons mastered
                  </Text>
                </View>
              </View>
            )}
            {jumpTo && (
              <Button
                title={`${firstDue ? "Practice due" : "Continue"}: ${graph.refs.find((r) => r.exercise.id === jumpTo)?.exercise.title ?? ""}`}
                iconRight="arrow.right"
                style={{ marginTop: 6, ...fit(), alignSelf: medium ? "flex-start" : "stretch" }}
                onPress={() => open(jumpTo)}
              />
            )}
          </LinearGradient>
        </View>

        <Card style={{ padding: 16, gap: 10 }}>
          <Text variant="small" weight="semibold">
            How do you want to take this course?
          </Text>
          <Text variant="small" muted>
            {MODE_META[mode].short}
          </Text>
          <LearningModeSwitch mode={mode} />
        </Card>

        <Pressable onPress={() => router.push("/course/articles")}>
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
            <IconChip name="book.pages.fill" tone="chart2" />
            <View style={{ flex: 1 }}>
              <Text weight="semibold">Articles</Text>
              <Text variant="caption" muted>
                Longer explainers, one question each
              </Text>
            </View>
            <Icon name="chevron.right" size={13} tone="muted" weight="semibold" />
          </Card>
        </Pressable>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {(Object.keys(statusMeta) as ExerciseStatus[]).map((s) => (
            <View key={s} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: s === "new" ? alpha(c.mutedForeground, 0.4) : statusMeta[s].ring(c) }} />
              <Text variant="caption" muted>
                {statusMeta[s].label}
              </Text>
            </View>
          ))}
        </View>

        {course.units.map((unit, ui) => {
          const up = progress?.units.find((u) => u.unitId === unit.id);
          return (
            <View key={unit.id} style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
                <IconChip name={unitSymbol(unit.icon)} size={48} gradient />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="caption" muted weight="semibold">
                    Unit {ui + 1}
                  </Text>
                  <Text variant="title" style={{ fontSize: 20 }}>
                    {unit.title}
                  </Text>
                  <Text variant="small" muted>
                    {plain(unit.description)}
                  </Text>
                </View>
                {up && up.started > 0 && <MasteryRing value={up.mastery} size={44} />}
              </View>
              <Card>
                {unit.exercises.map((e, i) => {
                  const p = byId.get(e.id);
                  const status = p?.status ?? "new";
                  const locked = isLocked(e.id);
                  const ring = statusMeta[status].ring(c);
                  const due = !locked && isDue(p);
                  const here = !locked && e.id === startHere;
                  return (
                    <View key={e.id} style={i > 0 ? { borderTopWidth: 1, borderColor: c.border } : undefined}>
                      <Row
                        onPress={() => open(e.id)}
                        chevron={!locked && !due && !here}
                        right={
                          here ? (
                            <LessonFlag label={p && p.itemsSeen > 0 ? "Continue" : "Start here"} tone="primary" />
                          ) : due ? (
                            <LessonFlag label={status === "struggling" ? "Practise" : "Review"} tone={status === "struggling" ? "danger" : "warning"} />
                          ) : undefined
                        }
                        leading={
                          locked ? (
                            <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderStyle: "dashed", borderColor: alpha(c.mutedForeground, 0.4), alignItems: "center", justifyContent: "center" }}>
                              <Icon name="lock.fill" size={13} tone="muted" />
                            </View>
                          ) : (
                            <View style={{ width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: ring, backgroundColor: status === "mastered" ? ring : undefined, alignItems: "center", justifyContent: "center" }}>
                              <Text variant="small" weight="semibold" muted={status === "new"} style={status === "mastered" ? { color: "#fff" } : undefined}>
                                {status === "mastered" ? "✓" : i + 1}
                              </Text>
                            </View>
                          )
                        }
                        title={e.title}
                        subtitle={locked ? `Complete ${lockedBy(e.id)?.title} to unlock` : p && p.itemsSeen > 0 ? `${statusMeta[status].label} · ${Math.round(p.effectiveMastery * 100)}%` : plain(e.summary)}
                      />
                    </View>
                  );
                })}
              </Card>
            </View>
          );
        })}
      </Reveal>
    </Screen>
  );
}

/** The course card and a unit of lessons, pulsing, while progress loads. */
function CourseSkeleton() {
  return (
    <>
      <Skeleton height={250} style={{ borderRadius: radius["3xl"] }} />
      <Skeleton height={64} />
      {Array.from({ length: 2 }, (_, u) => (
        <View key={u} style={{ gap: 10 }}>
          <Skeleton height={44} width="70%" />
          <Skeleton height={260} />
        </View>
      ))}
    </>
  );
}
