import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, RefreshControl, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LeagueCard } from "@/components/league";
import { useOpenLesson } from "@/components/lesson-link";
import { Segmented } from "@/components/segmented";
import { queueMeta, unitSymbol } from "@/components/status";
import { Card, CardHeader, Empty, Icon, MasteryRing, Pill, ProgressBar, Row, Screen, SectionTitle, Separator, Skeleton, Text, type SymbolName } from "@/components/ui";
import { WeekBars } from "@/components/week-bars";
import type { QueueKind, Recommendation } from "@/lib/api";
import { course, exerciseRef } from "@/lib/course";
import { greeting, minutes, shortMinutes } from "@/lib/format";
import { plain } from "@/lib/plain";
import { useCourseProgress, useDashboard, useNotificationCounts, useSession } from "@/lib/queries";
import { alpha, radius, useTheme, type Tone } from "@/lib/theme";

/** The web's dashboard (/learn): greeting, streak, stats, today's plan, queues, league and progress. */
export default function Home() {
  const { user } = useSession();
  const { data, isLoading, refetch, isRefetching } = useDashboard();
  const { data: progress } = useCourseProgress();
  const counts = useNotificationCounts();
  const { c } = useTheme();

  // The welcome tour, once, as on the web after confirming the email.
  useEffect(() => {
    if (user && !user.onboarded) router.push("/onboarding");
  }, [user]);

  const header = (
    <Stack.Screen
      options={{
        headerRight: () => (
          <Pressable onPress={() => router.push("/notifications")} hitSlop={10} accessibilityLabel={`Notifications${counts.data?.unread ? `, ${counts.data.unread} unread` : ""}`}>
            <Icon name={counts.data?.unread ? "bell.badge.fill" : "bell"} size={20} color={counts.data?.unread ? c.primary : c.foreground} />
          </Pressable>
        ),
      }}
    />
  );

  if (isLoading || !data)
    return (
      <Screen>
        {header}
        <Skeleton height={80} width={240} />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Skeleton height={110} style={{ flex: 1 }} />
          <Skeleton height={110} style={{ flex: 1 }} />
        </View>
        <Skeleton height={200} />
      </Screen>
    );

  const { queues, stats } = data;
  const firstName = user?.displayName.split(" ")[0] ?? "there";
  const goal = user?.dailyGoal ?? 10;
  const isNew = stats.exercisesStarted === 0;

  return (
    <Screen refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}>
      {header}
      <Animated.View entering={FadeInDown.duration(400)} style={{ gap: 4 }}>
        <Text variant="small" muted>
          {greeting()},
        </Text>
        <Text variant="display">{firstName}</Text>
        <Text muted style={{ marginTop: 4 }}>
          {isNew
            ? "Welcome to Foundations. We've lined up the perfect place to start."
            : stats.reviewsDue > 0
              ? `You have ${stats.reviewsDue} review${stats.reviewsDue > 1 ? "s" : ""} due — a quick refresh keeps them locked in.`
              : "Here's your plan for today, tuned to how you've been doing."}
        </Text>
      </Animated.View>

      <StreakBadge current={stats.streak.current} longest={stats.streak.longest} activeToday={stats.streak.activeToday} />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <StatCard icon="graduationcap.fill" tone="success" label="Mastered" value={`${stats.exercisesMastered}`} sub={`of ${stats.exercisesTotal} lessons`} />
        <StatCard icon="sparkles" tone="primary" label="Started" value={`${stats.exercisesStarted}`} sub="in progress or done" />
        <StatCard icon="calendar.badge.checkmark" tone="warning" label="Reviews due" value={`${stats.reviewsDue}`} sub="spaced for memory" />
        <StatCard
          icon="target"
          tone="info"
          label="Today"
          value={`${stats.today.problems}/${goal}`}
          sub={stats.today.problems >= goal ? "Daily goal reached 🎉" : "toward your daily goal"}
          progress={Math.min(1, stats.today.problems / goal)}
        />
      </View>

      <View style={{ gap: 12 }}>
        <SectionTitle title="Today's plan" />
        <Text variant="caption" muted style={{ marginTop: -8 }}>
          Mixed for you: review, repair and new ideas
        </Text>
        {queues.plan.map((r, i) => (
          <PlanCard key={r.exerciseId} rec={r} index={i} featured={i === 0} />
        ))}
      </View>

      <Queues queues={queues} />

      <LeagueCard />

      <Card>
        <CardHeader title="This week" subtitle="Problems per day" />
        <View style={{ padding: 16 }}>
          <WeekBars days={stats.week.map((d) => ({ day: d.day, value: d.problems }))} />
        </View>
      </Card>

      <Card>
        <CardHeader title="Time learning" icon="hourglass" iconTone="chart2" right={<Text variant="small" tone="primary" weight="medium" onPress={() => router.navigate("/progress")}>See trends</Text>} />
        <View style={{ padding: 16, gap: 16 }}>
          <View style={{ flexDirection: "row", gap: 28 }}>
            <View>
              <Text variant="title">{minutes(stats.time.todayMinutes)}</Text>
              <Text variant="caption" muted>
                today
              </Text>
            </View>
            <View>
              <Text variant="title">{minutes(stats.time.weekMinutes)}</Text>
              <Text variant="caption" muted>
                last 7 days
              </Text>
            </View>
          </View>
          <WeekBars days={stats.time.week.map((d) => ({ day: d.day, value: d.minutes }))} format={shortMinutes} gradient={[c.chart2, c.chart1]} min={10} />
        </View>
      </Card>

      <Card>
        <CardHeader title="Course progress" right={<Text variant="small" tone="primary" weight="medium" onPress={() => router.navigate("/course")}>Open map</Text>} />
        <View style={{ padding: 16, gap: 12 }}>
          {course.units.map((u) => {
            const p = progress?.units.find((x) => x.unitId === u.id);
            return (
              <View key={u.id} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: c.muted, alignItems: "center", justifyContent: "center" }}>
                  <Icon name={unitSymbol(u.icon)} size={14} color={c.mutedForeground} />
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                    <Text variant="caption" weight="medium" numberOfLines={1} style={{ flexShrink: 1 }}>
                      {u.title}
                    </Text>
                    <Text variant="caption" muted>
                      {p?.mastered ?? 0}/{u.exercises.length}
                    </Text>
                  </View>
                  <ProgressBar value={p?.mastery ?? 0} gradient={[c.primary, c.chart2]} />
                </View>
              </View>
            );
          })}
        </View>
      </Card>
    </Screen>
  );
}

function StreakBadge({ current, longest, activeToday }: { current: number; longest: number; activeToday: boolean }) {
  const { c } = useTheme();
  return (
    <Card style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 14 }}>
      {current > 0 ? (
        <LinearGradient colors={[c.chart3, c.chart4]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", boxShadow: `0 4px 10px ${alpha(c.chart4, 0.3)}` }}>
          <Icon name="flame.fill" size={24} color="#fff" />
        </LinearGradient>
      ) : (
        <View style={{ width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: c.muted }}>
          <Icon name="flame" size={24} color={c.mutedForeground} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text variant="title">
          {current} <Text variant="small" muted>day streak</Text>
        </Text>
        <Text variant="caption" muted>
          {activeToday ? "Done for today ✓" : current > 0 ? "Practise today to keep it" : "Solve a problem to start one"} · best {longest}
        </Text>
      </View>
    </Card>
  );
}

function StatCard({ icon, tone, label, value, sub, progress }: { icon: SymbolName; tone: Tone; label: string; value: string; sub: string; progress?: number }) {
  return (
    <Card style={{ flexBasis: "47%", flexGrow: 1, padding: 14, gap: 2 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icon name={icon} size={14} tone={tone} />
        <Text variant="caption" muted weight="medium">
          {label}
        </Text>
      </View>
      <Text style={{ fontSize: 28, lineHeight: 34 }} weight="semibold">
        {value}
      </Text>
      <Text variant="caption" muted numberOfLines={1}>
        {sub}
      </Text>
      {progress !== undefined && (
        <View style={{ marginTop: 6 }}>
          <ProgressBar value={progress} tone="info" />
        </View>
      )}
    </Card>
  );
}

function PlanCard({ rec, index, featured }: { rec: Recommendation; index: number; featured: boolean }) {
  const { open, isLocked } = useOpenLesson();
  const ref = exerciseRef(rec.exerciseId);
  if (!ref) return null;
  const m = queueMeta[rec.kind];
  const locked = isLocked(rec.exerciseId);
  return (
    <Animated.View entering={FadeInDown.delay(index * 70).duration(400)}>
      <Pressable onPress={() => open(rec.exerciseId, m.mode)} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }], opacity: locked ? 0.6 : 1 })}>
        <Card featured={featured} style={{ padding: 16, gap: 4 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Pill label={m.label} tone={m.tone} icon={m.icon} />
            {rec.kind !== "next" && <MasteryRing value={rec.effectiveMastery} size={36} stroke={3.5} />}
          </View>
          <Text variant="caption" muted style={{ marginTop: 6 }}>
            {ref.unit.title}
          </Text>
          <Text variant="heading" style={{ fontSize: 18 }}>
            {ref.exercise.title}
          </Text>
          <Text variant="small" muted>
            {rec.reason}
          </Text>
          {rec.brushUp && rec.brushUp.length > 0 && (
            <Text variant="caption" muted style={{ marginTop: 4 }}>
              Brush up: {rec.brushUp.map((id) => exerciseRef(id)?.exercise.title).join(", ")}
            </Text>
          )}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
            <Text variant="caption" muted>
              ~{ref.exercise.estimatedMinutes} min
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text variant="caption" weight="semibold" tone="primary">
                {locked ? "Locked" : featured ? "Start here" : "Start"}
              </Text>
              <Icon name={locked ? "lock.fill" : "arrow.right"} size={12} tone="primary" />
            </View>
          </View>
        </Card>
      </Pressable>
    </Animated.View>
  );
}

const EMPTY: Record<QueueKind, string> = {
  review: "Nothing due — your memory is in great shape. Reviews appear here as they fall due.",
  challenge: "No weak spots right now. Topics you find tricky will show up here with targeted practice.",
  next: "You've started everything! Keep reviewing to reach mastery.",
  continue: "Nothing in progress. Start something new from Today's plan.",
};

function Queues({ queues }: { queues: Record<QueueKind, Recommendation[]> }) {
  const [kind, setKind] = useState<QueueKind>(queues.review.length ? "review" : queues.challenge.length ? "challenge" : "next");
  const { open } = useOpenLesson();
  const { c } = useTheme();
  const items = queues[kind];
  const m = queueMeta[kind];
  return (
    <Card>
      <CardHeader title="Your learning queues" />
      <View style={{ padding: 16, paddingBottom: 8 }}>
        <Segmented
          value={kind}
          onChange={setKind}
          options={(["review", "challenge", "next", "continue"] as QueueKind[]).map((k) => ({ value: k, label: `${queueMeta[k].label} ${queues[k].length}` }))}
        />
      </View>
      {items.length === 0 ? (
        <View style={{ padding: 16, paddingTop: 4 }}>
          <Empty icon={m.icon} title={`No ${m.label.toLowerCase()} items`} text={EMPTY[kind]} />
        </View>
      ) : (
        <View style={{ paddingBottom: 8 }}>
          {items.map((r, i) => {
            const ref = exerciseRef(r.exerciseId)!;
            return (
              <View key={r.exerciseId}>
                {i > 0 && <Separator inset={64} />}
                <Row
                  leading={
                    kind === "next" ? (
                      <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: alpha(c.primary, 0.1), alignItems: "center", justifyContent: "center" }}>
                        <Icon name={unitSymbol(ref.unit.icon)} size={16} tone="primary" />
                      </View>
                    ) : (
                      <MasteryRing value={r.effectiveMastery} size={36} stroke={3.5} />
                    )
                  }
                  title={ref.exercise.title}
                  subtitle={plain(r.reason)}
                  onPress={() => open(r.exerciseId, m.mode)}
                />
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}
