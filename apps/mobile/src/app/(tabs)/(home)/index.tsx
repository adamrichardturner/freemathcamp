import { LinearGradient } from "expo-linear-gradient";
import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { ChipTabs } from "@/components/chip-tabs";
import { LeagueCard } from "@/components/league";
import { useOpenLesson } from "@/components/lesson-link";
import { Reveal } from "@/components/reveal";
import { queueMeta, unitSymbol } from "@/components/status";
import { Card, CardHeader, Empty, Icon, MasteryRing, Pill, ProgressBar, Row, Screen, SectionTitle, Separator, Skeleton, Text, type SymbolName } from "@/components/ui";
import { WeekBars } from "@/components/week-bars";
import type { CompletedToday, CourseProgress, Dashboard, DayPlan, QueueKind, Recommendation } from "@/lib/api";
import { course, exerciseRef } from "@/lib/course";
import { greeting, minutes, shortMinutes } from "@/lib/format";
import { plain } from "@/lib/plain";
import { useCourseProgress, useDashboard, useNotificationCounts, useSession } from "@/lib/queries";
import { widths } from "@/lib/layout";
import { alpha, radius, toneColor, useTheme, type Tone } from "@/lib/theme";

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
  const { queues, stats, day } = data;
  const firstName = user?.displayName.split(" ")[0] ?? "there";
  const isNew = stats.exercisesStarted === 0;

  return (
    <>
      <View style={{ gap: 2 }}>
        <Text variant="small" muted>
          {greeting()},
        </Text>
        <Text variant="display" style={{ fontSize: 34, lineHeight: 38 }}>
          {firstName}
        </Text>
        <Text variant="small" muted style={{ marginTop: 6 }}>
          {isNew
            ? "Welcome to Foundations. We've lined up the perfect place to start."
            : day.complete
              ? "You've met today's goal. Anything more today is a bonus."
              : stats.reviewsDue > 0
                ? `You have ${stats.reviewsDue} review${stats.reviewsDue > 1 ? "s" : ""} due — a quick refresh keeps them locked in.`
                : "Here's your plan for today, tuned to how you've been doing."}
        </Text>
      </View>

      <TodayCard stats={stats} day={day} />

      <TodayPlan day={day} />

      <Queues queues={queues} />

      <LeagueCard />

      <WeekCard stats={stats} />

      <CourseProgressCard progress={progress} />
    </>
  );
}

/** The greeting, summary, plan and queues, pulsing, while the dashboard loads. */
function HomeSkeleton() {
  return (
    <>
      <View style={{ gap: 8 }}>
        <Skeleton height={16} width={110} />
        <Skeleton height={34} width={180} />
        <Skeleton height={16} width="90%" />
      </View>
      <Skeleton height={172} />
      <Skeleton height={24} width={150} />
      <Skeleton height={210} />
      <Skeleton height={260} />
    </>
  );
}

/**
 * Streak, today's goal and the headline numbers in one card, so the plan (the
 * thing to press) starts on the first screen instead of below four stat tiles.
 */
function TodayCard({ stats, day }: { stats: Dashboard["stats"]; day: DayPlan }) {
  const { c } = useTheme();
  const { current, longest, activeToday } = stats.streak;
  const goal = Math.min(1, day.done / Math.max(1, day.goal));
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16 }}>
        {current > 0 ? (
          <LinearGradient colors={[c.chart3, c.chart4]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", boxShadow: `0 4px 10px ${alpha(c.chart4, 0.3)}` }}>
            <Icon name="flame.fill" size={24} color="#fff" />
          </LinearGradient>
        ) : (
          <View style={{ width: 46, height: 46, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: c.muted }}>
            <Icon name="flame" size={24} color={c.mutedForeground} />
          </View>
        )}
        <View style={{ flex: 1, gap: 1 }}>
          <Text variant="title">
            {current} <Text variant="small" muted>day streak</Text>
          </Text>
          <Text variant="caption" muted numberOfLines={2}>
            {activeToday ? "Done for today ✓" : current > 0 ? "Practise today to keep it" : "Solve a problem to start one"} · best {longest}
          </Text>
        </View>
        <View style={{ alignItems: "center", gap: 3 }} accessible accessibilityLabel={`Daily goal: ${day.done} of ${day.goal} problems`}>
          <MasteryRing value={goal} size={50} stroke={5} color={day.complete ? c.success : c.info}>
            {day.complete ? (
              <Icon name="checkmark" size={18} color={c.success} weight="bold" />
            ) : (
              <Text variant="caption" weight="semibold">
                {day.done}/{day.goal}
              </Text>
            )}
          </MasteryRing>
          <Text variant="caption" muted style={{ fontSize: 11 }}>
            Today
          </Text>
        </View>
      </View>
      <Separator />
      <View style={{ flexDirection: "row", paddingVertical: 14 }}>
        <Stat icon="graduationcap.fill" tone="success" label="Mastered" value={stats.exercisesMastered} sub={`of ${stats.exercisesTotal}`} />
        <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: c.border }} />
        <Stat icon="sparkles" tone="primary" label="Started" value={stats.exercisesStarted} sub="lessons" />
        <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: c.border }} />
        <Stat icon="calendar.badge.checkmark" tone="warning" label="Reviews" value={stats.reviewsDue} sub="due" />
      </View>
    </Card>
  );
}

function Stat({ icon, tone, label, value, sub }: { icon: SymbolName; tone: Tone; label: string; value: number; sub: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: 2, paddingHorizontal: 6 }} accessible accessibilityLabel={`${label}: ${value} ${sub}`}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        <Icon name={icon} size={12} tone={tone} />
        <Text variant="caption" muted weight="medium">
          {label}
        </Text>
      </View>
      <Text style={{ fontSize: 24, lineHeight: 30 }} weight="semibold">
        {value}
      </Text>
      <Text variant="caption" muted>
        {sub}
      </Text>
    </View>
  );
}

const UPCOMING_SHOWN = 3;

/** Today's share of the plan, as the web's: the next session up front, the rest after it, then what's upcoming. */
function TodayPlan({ day }: { day: DayPlan }) {
  const [allUpcoming, setAllUpcoming] = useState(false);
  const left = Math.max(0, day.goal - day.done);
  // Once the goal is met, the first upcoming session becomes the next step.
  const upNext = day.complete ? day.upcoming[0] : day.today[0];
  const then = day.complete ? [] : day.today.slice(1);
  const upcoming = day.complete ? day.upcoming.slice(1) : day.upcoming;
  const shownUpcoming = allUpcoming ? upcoming : upcoming.slice(0, UPCOMING_SHOWN);
  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 2 }}>
        <SectionTitle title="Today's plan" />
        <Text variant="caption" muted>
          {day.complete ? "Goal reached. A fresh plan arrives tomorrow." : `About ${left} more problem${left === 1 ? "" : "s"} to reach your daily goal`}
        </Text>
      </View>
      {day.completed.length > 0 && <CompletedList items={day.completed} />}
      {upNext ? <UpNextCard rec={upNext} optional={day.complete} /> : <Empty icon="map" title="Nothing lined up" text="Open the course to pick a lesson." />}
      {then.length > 0 && <PlanList title="Then" items={then} />}
      {upcoming.length > 0 && (
        <PlanList
          title="Upcoming"
          caption={day.complete ? "Optional. A head start on what's next." : "Lined up after today's plan"}
          items={shownUpcoming}
          more={upcoming.length > UPCOMING_SHOWN ? { expanded: allUpcoming, hidden: upcoming.length - UPCOMING_SHOWN, toggle: () => setAllUpcoming((v) => !v) } : undefined}
        />
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

/** The rest of the plan as compact rows in one card, rather than a tall card each. */
function PlanList({ title, caption, items, more }: { title: string; caption?: string; items: Recommendation[]; more?: { expanded: boolean; hidden: number; toggle: () => void } }) {
  return (
    <View style={{ gap: 8, marginTop: 4 }}>
      <View style={{ gap: 1 }}>
        <Text variant="label" muted>
          {title}
        </Text>
        {caption && (
          <Text variant="caption" muted>
            {caption}
          </Text>
        )}
      </View>
      <Card>
        {items.map((r, i) => (
          <View key={r.exerciseId}>
            {i > 0 && <Separator inset={64} />}
            <PlanRow rec={r} />
          </View>
        ))}
        {more && (
          <>
            <Separator />
            <ShowMore expanded={more.expanded} label={`Show ${more.hidden} more`} onPress={more.toggle} />
          </>
        )}
      </Card>
    </View>
  );
}

/** One session: its progress (or unit, if new), title, kind, unit, length and why it's suggested. */
function PlanRow({ rec }: { rec: Recommendation }) {
  const { c } = useTheme();
  const { open, isLocked } = useOpenLesson();
  const ref = exerciseRef(rec.exerciseId);
  if (!ref) return null;
  const m = queueMeta[rec.kind];
  const locked = isLocked(rec.exerciseId);
  const tone = toneColor(c, m.tone);
  return (
    <Pressable
      onPress={() => open(rec.exerciseId, m.mode)}
      accessibilityRole="button"
      accessibilityLabel={`${m.label}: ${ref.exercise.title}, ${ref.unit.title}, about ${ref.exercise.estimatedMinutes} minutes${locked ? ", locked" : ""}`}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: pressed ? c.muted : "transparent", opacity: locked ? 0.6 : 1 })}
    >
      {rec.kind === "next" ? (
        <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: alpha(c.primary, 0.1), alignItems: "center", justifyContent: "center" }}>
          <Icon name={unitSymbol(ref.unit.icon)} size={16} tone="primary" />
        </View>
      ) : (
        <MasteryRing value={rec.effectiveMastery} size={36} stroke={3.5} />
      )}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text weight="semibold" numberOfLines={1}>
          {ref.exercise.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <Icon name={m.icon} size={11} color={tone} weight="semibold" />
          <Text variant="caption" numberOfLines={1} style={{ flexShrink: 1 }}>
            <Text variant="caption" weight="semibold" style={{ color: tone }}>
              {m.label}
            </Text>
            <Text variant="caption" muted>
              {" "}
              · {ref.unit.title} · ~{ref.exercise.estimatedMinutes} min
            </Text>
          </Text>
        </View>
        <Text variant="caption" muted numberOfLines={1}>
          {plain(rec.reason)}
        </Text>
      </View>
      <Icon name={locked ? "lock.fill" : "chevron.right"} size={13} color={c.mutedForeground} weight="semibold" />
    </Pressable>
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

const EMPTY: Record<QueueKind, string> = {
  review: "Nothing due — your memory is in great shape. Reviews appear here as they fall due.",
  challenge: "No weak spots right now. Topics you find tricky will show up here with targeted practice.",
  next: "You've started everything! Keep reviewing to reach mastery.",
  continue: "Nothing in progress. Start something new from Today's plan.",
};

const QUEUE_ORDER: QueueKind[] = ["review", "challenge", "next", "continue"];
const QUEUE_SHOWN = 5;

function Queues({ queues }: { queues: Record<QueueKind, Recommendation[]> }) {
  const [kind, setKind] = useState<QueueKind>(queues.review.length ? "review" : queues.challenge.length ? "challenge" : "next");
  const [all, setAll] = useState(false);
  const { open } = useOpenLesson();
  const { c } = useTheme();
  const items = all ? queues[kind] : queues[kind].slice(0, QUEUE_SHOWN);
  const hidden = queues[kind].length - QUEUE_SHOWN;
  const m = queueMeta[kind];
  return (
    <Card>
      <CardHeader title="Your learning queues" />
      {/* Full labels in pills that scroll sideways: four segments squeezed into one row cut the names off. */}
      <ChipTabs
        label="Learning queues"
        value={kind}
        onChange={(k) => {
          setKind(k);
          setAll(false);
        }}
        inset={16}
        style={{ marginTop: 12, marginBottom: 4 }}
        options={QUEUE_ORDER.map((k) => ({ value: k, label: queueMeta[k].label, icon: queueMeta[k].icon, count: queues[k].length }))}
      />
      {items.length === 0 ? (
        <View style={{ padding: 16, paddingTop: 8 }}>
          <Empty icon={m.icon} title={`No ${m.label.toLowerCase()} items`} text={EMPTY[kind]} />
        </View>
      ) : (
        <View style={{ paddingTop: 4, paddingBottom: 6 }}>
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
          {hidden > 0 && (
            <>
              <Separator />
              <ShowMore expanded={all} label={`Show ${hidden} more`} onPress={() => setAll((v) => !v)} />
            </>
          )}
        </View>
      )}
    </Card>
  );
}

type WeekMetric = "problems" | "minutes";

/** Problems and time over the last seven days in one card, switched with a toggle, instead of two charts. */
function WeekCard({ stats }: { stats: Dashboard["stats"] }) {
  const { c } = useTheme();
  const [metric, setMetric] = useState<WeekMetric>("problems");
  const problemsWeek = stats.week.reduce((n, d) => n + d.problems, 0);
  const summary =
    metric === "problems"
      ? [
          { value: `${stats.today.problems}`, label: "today" },
          { value: `${problemsWeek}`, label: "last 7 days" },
        ]
      : [
          { value: minutes(stats.time.todayMinutes), label: "today" },
          { value: minutes(stats.time.weekMinutes), label: "last 7 days" },
        ];
  return (
    <Card>
      <CardHeader title="This week" icon="chart.bar.fill" right={<Text variant="small" tone="primary" weight="medium" onPress={() => router.navigate("/progress")}>See trends</Text>} />
      <ChipTabs
        label="Weekly chart"
        value={metric}
        onChange={setMetric}
        inset={16}
        style={{ marginTop: 12 }}
        options={[
          { value: "problems", label: "Problems", icon: "checkmark.circle" },
          { value: "minutes", label: "Time", icon: "hourglass" },
        ]}
      />
      <View style={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: "row", gap: 28 }}>
          {summary.map((s) => (
            <View key={s.label}>
              <Text variant="title">{s.value}</Text>
              <Text variant="caption" muted>
                {s.label}
              </Text>
            </View>
          ))}
        </View>
        {metric === "problems" ? (
          <WeekBars days={stats.week.map((d) => ({ day: d.day, value: d.problems }))} />
        ) : (
          <WeekBars days={stats.time.week.map((d) => ({ day: d.day, value: d.minutes }))} format={shortMinutes} gradient={[c.chart2, c.chart1]} min={10} />
        )}
      </View>
    </Card>
  );
}

const UNITS_SHOWN = 4;

/** Units under way (and the next one to start), with the full list a tap away. */
function CourseProgressCard({ progress }: { progress?: CourseProgress }) {
  const { c } = useTheme();
  const [all, setAll] = useState(false);
  const rows = course.units.map((u) => ({ unit: u, p: progress?.units.find((x) => x.unitId === u.id) }));
  const started = rows.filter((r) => (r.p?.mastery ?? 0) > 0);
  const nextUp = rows.find((r) => (r.p?.mastery ?? 0) === 0);
  const focus = [...started, ...(nextUp ? [nextUp] : [])].slice(0, Math.max(UNITS_SHOWN, started.length + 1));
  const shown = all ? rows : focus.length ? focus : rows.slice(0, UNITS_SHOWN);
  const hidden = rows.length - shown.length;
  return (
    <Card>
      <CardHeader
        title="Course progress"
        subtitle={`${started.length} of ${rows.length} units started`}
        right={
          <Text variant="small" tone="primary" weight="medium" onPress={() => router.navigate("/course")}>
            Open map
          </Text>
        }
      />
      <View style={{ padding: 16, gap: 12 }}>
        {shown.map(({ unit: u, p }) => (
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
                  {p?.mastered ?? 0}/{u.exercises.length} mastered
                </Text>
              </View>
              <ProgressBar value={p?.mastery ?? 0} gradient={[c.primary, c.chart2]} />
            </View>
          </View>
        ))}
      </View>
      {(hidden > 0 || all) && (
        <>
          <Separator />
          <ShowMore expanded={all} label={`Show all ${rows.length} units`} onPress={() => setAll((v) => !v)} />
        </>
      )}
    </Card>
  );
}

/** The footer row that expands a card's list, or folds it back. */
function ShowMore({ expanded, label, onPress }: { expanded: boolean; label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ expanded }} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 13, backgroundColor: pressed ? c.muted : "transparent" })}>
      <Text variant="small" weight="semibold" tone="primary">
        {expanded ? "Show fewer" : label}
      </Text>
      <Icon name={expanded ? "chevron.up" : "chevron.down"} size={12} tone="primary" weight="semibold" />
    </Pressable>
  );
}
