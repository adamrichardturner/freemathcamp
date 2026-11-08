import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, RefreshControl, View } from "react-native";
import { LeagueCard } from "@/components/league";
import { useOpenLesson } from "@/components/lesson-link";
import { Segmented } from "@/components/segmented";
import { Reveal } from "@/components/reveal";
import { queueMeta, unitSymbol } from "@/components/status";
import { Card, CardHeader, Empty, Grid, Icon, MasteryRing, Pill, ProgressBar, Row, Screen, SectionTitle, Separator, Skeleton, Text, type SymbolName } from "@/components/ui";
import { WeekBars } from "@/components/week-bars";
import type { CompletedToday, CourseProgress, Dashboard, DayPlan, QueueKind, Recommendation } from "@/lib/api";
import { course, exerciseRef } from "@/lib/course";
import { greeting, minutes, shortMinutes } from "@/lib/format";
import { plain } from "@/lib/plain";
import { useCourseProgress, useDashboard, useNotificationCounts, useSession } from "@/lib/queries";
import { useLayout, widths } from "@/lib/layout";
import { alpha, radius, useTheme, type Tone } from "@/lib/theme";

/** The web's dashboard (/learn): greeting, streak, stats, today's plan, queues, league and progress. */
export default function Home() {
  const { user } = useSession();
  const { data, refetch, isRefetching } = useDashboard();
  const { data: progress, isFetched: progressFetched } = useCourseProgress();
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

  // Course progress fills the unit bars, so it lands with the rest rather than after.
  return (
    <Screen width={widths.wide} refreshControl={data ? <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} /> : undefined}>
      {header}
      <Reveal ready={!!data && progressFetched} gap={20} skeleton={<HomeSkeleton />}>
        {data && <HomeBody data={data} progress={progress} />}
      </Reveal>
    </Screen>
  );
}

function HomeBody({ data, progress }: { data: Dashboard; progress?: CourseProgress }) {
  const { user } = useSession();
  const { c } = useTheme();
  const { columns } = useLayout();
  const { queues, stats, day } = data;
  const firstName = user?.displayName.split(" ")[0] ?? "there";
  const isNew = stats.exercisesStarted === 0;

  return (
    <>
      <View style={{ gap: 4 }}>
        <Text variant="small" muted>
          {greeting()},
        </Text>
        <Text variant="display">{firstName}</Text>
        <Text muted style={{ marginTop: 4 }}>
          {isNew
            ? "Welcome to Foundations. We've lined up the perfect place to start."
            : day.complete
              ? "You've met today's goal. Anything more today is a bonus."
              : stats.reviewsDue > 0
              ? `You have ${stats.reviewsDue} review${stats.reviewsDue > 1 ? "s" : ""} due — a quick refresh keeps them locked in.`
              : "Here's your plan for today, tuned to how you've been doing."}
        </Text>
      </View>

      <StreakBadge current={stats.streak.current} longest={stats.streak.longest} activeToday={stats.streak.activeToday} />

      <Grid columns={columns(2, 4)}>
        <StatCard icon="graduationcap.fill" tone="success" label="Mastered" value={`${stats.exercisesMastered}`} sub={`of ${stats.exercisesTotal} lessons`} />
        <StatCard icon="sparkles" tone="primary" label="Started" value={`${stats.exercisesStarted}`} sub="in progress or done" />
        <StatCard icon="calendar.badge.checkmark" tone="warning" label="Reviews due" value={`${stats.reviewsDue}`} sub="spaced for memory" />
        <StatCard
          icon="target"
          tone="info"
          label="Today"
          value={`${day.done}/${day.goal}`}
          sub={day.complete ? "Daily goal reached 🎉" : "toward your daily goal"}
          progress={Math.min(1, day.done / day.goal)}
        />
      </Grid>

      <TodayPlan day={data.day} />

      <Queues queues={queues} />

      <LeagueCard />

      <Grid columns={columns(1, 2)}>
      <Card style={{ flex: 1 }}>
        <CardHeader title="This week" subtitle="Problems per day" />
        <View style={{ padding: 16 }}>
          <WeekBars days={stats.week.map((d) => ({ day: d.day, value: d.problems }))} />
        </View>
      </Card>

      <Card style={{ flex: 1 }}>
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
      </Grid>

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
    </>
  );
}

/** The greeting, streak, stats and plan, pulsing, while the dashboard loads. */
function HomeSkeleton() {
  const { columns } = useLayout();
  return (
    <>
      <View style={{ gap: 8 }}>
        <Skeleton height={16} width={110} />
        <Skeleton height={38} width={200} />
        <Skeleton height={18} width="90%" />
      </View>
      <Skeleton height={76} />
      <Grid columns={columns(2, 4)}>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} height={110} />
        ))}
      </Grid>
      <Skeleton height={200} />
      <Skeleton height={260} />
    </>
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
    <Card style={{ flex: 1, padding: 14, gap: 2 }}>
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

/** Today's share of the plan, as the web's: the next session up front, the rest after it, then what's upcoming. */
function TodayPlan({ day }: { day: DayPlan }) {
  const { columns } = useLayout();
  const left = Math.max(0, day.goal - day.done);
  // Once the goal is met, the first upcoming session becomes the next step.
  const upNext = day.complete ? day.upcoming[0] : day.today[0];
  const then = day.complete ? [] : day.today.slice(1);
  const upcoming = day.complete ? day.upcoming.slice(1) : day.upcoming;
  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 2 }}>
        <SectionTitle title="Today's plan" />
        <Text variant="caption" muted>
          {day.complete ? "Goal reached. A fresh plan arrives tomorrow." : `About ${left} more problem${left === 1 ? "" : "s"} to reach your daily goal`}
        </Text>
      </View>
      {day.completed.length > 0 && <CompletedList items={day.completed} />}
      {upNext ? (
        <UpNextCard rec={upNext} optional={day.complete} />
      ) : (
        <Empty icon="map" title="Nothing lined up" text="Open the course to pick a lesson." />
      )}
      {then.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text variant="label" muted>
            Then
          </Text>
          <Grid columns={columns(1, 2)}>
            {then.map((r) => (
              <PlanCard key={r.exerciseId} rec={r} />
            ))}
          </Grid>
        </View>
      )}
      {upcoming.length > 0 && (
        <View style={{ gap: 8, marginTop: 4 }}>
          <View style={{ gap: 2 }}>
            <SectionTitle title="Upcoming" />
            <Text variant="caption" muted>
              {day.complete ? "Optional. A head start on what's next." : "Lined up after today's plan"}
            </Text>
          </View>
          <Grid columns={columns(1, 2)}>
            {upcoming.map((r) => (
              <PlanCard key={r.exerciseId} rec={r} />
            ))}
          </Grid>
        </View>
      )}
    </View>
  );
}

/** Sessions finished today, ticked off. */
function CompletedList({ items }: { items: CompletedToday[] }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
      <Text variant="caption" muted weight="medium">
        Done today
      </Text>
      {items.map((x) => {
        const ref = exerciseRef(x.exerciseId);
        if (!ref) return null;
        return (
          <View key={x.exerciseId} style={{ flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, borderWidth: 1, borderColor: alpha(c.success, 0.25), backgroundColor: alpha(c.success, 0.1), paddingVertical: 4, paddingLeft: 5, paddingRight: 10 }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: c.success, alignItems: "center", justifyContent: "center" }}>
              <Icon name="checkmark" size={9} color="#fff" weight="bold" />
            </View>
            <Text variant="caption" weight="medium">
              {ref.exercise.title}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** The one thing to press next, set apart from the rest of the plan with a clear button. */
function UpNextCard({ rec, optional }: { rec: Recommendation; optional?: boolean }) {
  const { c } = useTheme();
  const { open, isLocked } = useOpenLesson();
  const ref = exerciseRef(rec.exerciseId);
  if (!ref) return null;
  const m = queueMeta[rec.kind];
  const locked = isLocked(rec.exerciseId);
  const action = locked ? "Locked" : rec.kind === "review" ? "Start review" : rec.kind === "next" ? "Start lesson" : "Start practice";
  return (
    <View>
      <Pressable onPress={() => open(rec.exerciseId, m.mode)} accessibilityRole="button" accessibilityLabel={`Up next: ${ref.exercise.title}. ${action}`} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }], opacity: locked ? 0.6 : 1 })}>
        <View style={{ borderRadius: radius["2xl"], borderCurve: "continuous", borderWidth: 1.5, borderColor: alpha(c.primary, 0.4), overflow: "hidden", backgroundColor: c.card, boxShadow: `0 8px 24px ${alpha(c.primary, 0.14)}` }}>
          <LinearGradient colors={[alpha(c.primary, 0.18), alpha(c.primary, 0.06), alpha(c.chart2, 0.1)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 18, gap: 14 }}>
            <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
              <LinearGradient colors={[c.primary, c.chart5]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 50, height: 50, borderRadius: 15, alignItems: "center", justifyContent: "center", boxShadow: `0 4px 12px ${alpha(c.primary, 0.3)}` }}>
                <Icon name={unitSymbol(ref.unit.icon)} size={22} color={c.primaryForeground} />
              </LinearGradient>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.primary }} />
                    <Text variant="caption" weight="bold" tone="primary" style={{ letterSpacing: 0.8 }}>
                      {optional ? "UP NEXT · BONUS" : "UP NEXT"}
                    </Text>
                  </View>
                  <Pill label={m.label} tone={m.tone} icon={m.icon} />
                </View>
                <Text variant="display" style={{ fontSize: 26, lineHeight: 30 }}>
                  {ref.exercise.title}
                </Text>
                <Text variant="small" muted>
                  {ref.unit.title} · ~{ref.exercise.estimatedMinutes} min
                </Text>
                <Text variant="small" muted numberOfLines={2}>
                  {plain(rec.reason)}
                </Text>
              </View>
            </View>
            <View style={{ height: 48, borderRadius: radius.xl, borderCurve: "continuous", backgroundColor: locked ? c.muted : c.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: locked ? undefined : `0 4px 14px ${alpha(c.primary, 0.3)}` }}>
              <Text weight="semibold" style={{ color: locked ? c.mutedForeground : c.primaryForeground }}>
                {action}
              </Text>
              <Icon name={locked ? "lock.fill" : "arrow.right"} size={15} color={locked ? c.mutedForeground : c.primaryForeground} />
            </View>
          </LinearGradient>
        </View>
      </Pressable>
    </View>
  );
}

function PlanCard({ rec }: { rec: Recommendation }) {
  const { open, isLocked } = useOpenLesson();
  const ref = exerciseRef(rec.exerciseId);
  if (!ref) return null;
  const m = queueMeta[rec.kind];
  const locked = isLocked(rec.exerciseId);
  return (
    <View style={{ flex: 1 }}>
      <Pressable onPress={() => open(rec.exerciseId, m.mode)} style={({ pressed }) => ({ flex: 1, transform: [{ scale: pressed ? 0.985 : 1 }], opacity: locked ? 0.6 : 1 })}>
        <Card style={{ flex: 1, padding: 16, gap: 4 }}>
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
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: "auto", paddingTop: 10 }}>
            <Text variant="caption" muted>
              ~{ref.exercise.estimatedMinutes} min
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text variant="caption" weight="semibold" tone="primary">
                {locked ? "Locked" : "Start"}
              </Text>
              <Icon name={locked ? "lock.fill" : "arrow.right"} size={12} tone="primary" />
            </View>
          </View>
        </Card>
      </Pressable>
    </View>
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
