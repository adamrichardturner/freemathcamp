import { Chart, Host } from "@expo/ui/swift-ui";
import { useState } from "react";
import { RefreshControl, View } from "react-native";
import { useOpenLesson } from "@/components/lesson-link";
import { Reveal } from "@/components/reveal";
import { Segmented } from "@/components/segmented";
import { statusMeta } from "@/components/status";
import { Card, CardHeader, Empty, Grid, Icon, MasteryRing, ProgressBar, Row, Screen, Separator, Skeleton, Text, type SymbolName } from "@/components/ui";
import type { Analytics } from "@/lib/api";
import { duration, minutes, pct, relative } from "@/lib/format";
import { keys, useAnalytics, useRefreshOnFocus } from "@/lib/queries";
import { useLayout, widths } from "@/lib/layout";
import { alpha, useTheme, type Tone } from "@/lib/theme";

/** The web's progress page: totals, activity, time, mastery by unit, difficulty, strengths and weak spots. */
export default function Progress() {
  const { data, refetch, isRefetching, isError } = useAnalytics();
  useRefreshOnFocus(keys.analytics);
  if (data && data.totals.problems === 0)
    return (
      <Screen title="Progress">
        <Empty icon="chart.bar.xaxis" title="Your progress fills in here" text="Solve a few problems and this page shows your activity, accuracy, time spent, and mastery across the course." />
      </Screen>
    );
  return (
    <Screen title="Progress" width={widths.wide} refreshControl={data ? <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} /> : undefined}>
      <Reveal ready={!!data} error={isError} onRetry={() => void refetch()} gap={20} skeleton={<ProgressSkeleton />}>
        {data && <ProgressBody data={data} />}
      </Reveal>
    </Screen>
  );
}

/** The stat grid and the first charts, pulsing, while the analytics load. */
function ProgressSkeleton() {
  const { columns } = useLayout();
  return (
    <>
      <Grid columns={columns(2, 3)}>
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} height={92} />
        ))}
      </Grid>
      <Skeleton height={180} />
      <Skeleton height={220} />
    </>
  );
}

function ProgressBody({ data }: { data: Analytics }) {
  const { columns } = useLayout();
  const t = data.totals;
  return (
    <>
      <Grid columns={columns(2, 3)}>
        <Stat icon="checkmark.seal.fill" tone="success" label="Problems solved" value={t.problems.toLocaleString()} />
        <Stat icon="target" tone="primary" label="First-try accuracy" value={pct(t.accuracy)} />
        <Stat icon="clock.fill" tone="chart2" label="Time practising" value={duration(t.timeMs)} />
        <Stat icon="flame.fill" tone="chart4" label="Streak" value={`${t.streak.current} days`} sub={`best ${t.streak.longest}`} />
        <Stat icon="graduationcap.fill" tone="success" label="Mastered" value={`${t.exercisesMastered}/${t.exercisesTotal}`} />
        <Stat icon="lightbulb.fill" tone="warning" label="Hints · reveals" value={`${t.hintsUsed} · ${t.reveals}`} />
      </Grid>
      <Heatmap daily={data.daily} />
      <Activity daily={data.daily} />
      <Grid columns={columns(1, 2)}>
        <TimeCard time={data.time} />
        <Levels levels={data.levels} />
      </Grid>
      <Units units={data.units} />
      <Grid columns={columns(1, 2)}>
        <Lessons title="Strengths" icon="star.fill" tone="success" items={data.strongest} empty="Keep practising: your strongest lessons appear here." />
        <Lessons title="Weak spots" icon="exclamationmark.triangle.fill" tone="warning" items={data.weakest} empty="Nothing tricky yet. Lessons you struggle with appear here." />
      </Grid>
      <Recent sessions={data.recentSessions} />
    </>
  );
}

function Stat({ icon, tone, label, value, sub }: { icon: SymbolName; tone: Tone; label: string; value: string; sub?: string }) {
  return (
    <Card style={{ flex: 1, padding: 14, gap: 2 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Icon name={icon} size={13} tone={tone} />
        <Text variant="caption" muted weight="medium" numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={{ fontSize: 24, lineHeight: 30 }} weight="semibold">
        {value}
      </Text>
      {sub && (
        <Text variant="caption" muted>
          {sub}
        </Text>
      )}
    </Card>
  );
}

/** The last 15 weeks of practice, a day per square, like the web's activity heatmap. */
function Heatmap({ daily }: { daily: Analytics["daily"] }) {
  const { c } = useTheme();
  const byDay = new Map(daily.map((d) => [d.day, d.problems]));
  const max = Math.max(1, ...daily.map((d) => d.problems));
  const today = new Date();
  const weeks = 15;
  const start = new Date(today.getTime() - ((weeks - 1) * 7 + ((today.getUTCDay() + 6) % 7)) * 86_400_000);
  const cols = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const day = new Date(start.getTime() + (w * 7 + d) * 86_400_000);
      return day > today ? null : (byDay.get(day.toISOString().slice(0, 10)) ?? 0);
    }),
  );
  return (
    <Card>
      <CardHeader title="Activity" subtitle="Problems per day, last 15 weeks" />
      <View style={{ flexDirection: "row", gap: 4, padding: 16, justifyContent: "center" }}>
        {cols.map((col, i) => (
          <View key={i} style={{ gap: 4 }}>
            {col.map((v, j) => (
              <View key={j} style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: v === null ? "transparent" : v === 0 ? c.muted : alpha(c.primary, 0.25 + 0.75 * (v / max)) }} />
            ))}
          </View>
        ))}
      </View>
    </Card>
  );
}

function Activity({ daily }: { daily: Analytics["daily"] }) {
  const { c } = useTheme();
  const [metric, setMetric] = useState<"problems" | "accuracy" | "minutes">("problems");
  const days = daily.slice(-14);
  return (
    <Card style={{ flex: 1 }}>
      <CardHeader title="Last two weeks" />
      <View style={{ padding: 16, gap: 14 }}>
        <Segmented
          value={metric}
          onChange={setMetric}
          options={[
            { value: "problems", label: "Problems" },
            { value: "accuracy", label: "Accuracy" },
            { value: "minutes", label: "Minutes" },
          ]}
        />
        <Host style={{ height: 180 }}>
          <Chart
            type={metric === "accuracy" ? "line" : "bar"}
            animate
            showGrid
            barStyle={{ cornerRadius: 4 }}
            lineStyle={{ width: 2.5, pointStyle: "circle", pointSize: 6, color: c.chart2 }}
            data={days.map((d) => ({ x: new Date(d.day).toLocaleDateString("en", { day: "numeric", month: "short", timeZone: "UTC" }), y: metric === "accuracy" ? Math.round(d.accuracy * 100) : Math.round(d[metric]), color: c.primary }))}
          />
        </Host>
      </View>
    </Card>
  );
}

function TimeCard({ time }: { time: Analytics["time"] }) {
  const { c } = useTheme();
  const weeks = time.weekly.slice(-8);
  return (
    <Card style={{ flex: 1 }}>
      <CardHeader title="Time learning" icon="hourglass" iconTone="chart2" />
      <View style={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: "row", gap: 24 }}>
          {[
            ["today", time.totals.todayMinutes],
            ["last 7 days", time.totals.last7Minutes],
            ["last 30 days", time.totals.last30Minutes],
          ].map(([label, m]) => (
            <View key={label as string}>
              <Text variant="heading">{minutes(m as number)}</Text>
              <Text variant="caption" muted>
                {label}
              </Text>
            </View>
          ))}
        </View>
        {weeks.length > 1 && (
          <Host style={{ height: 150 }}>
            <Chart type="area" animate areaStyle={{ color: alpha(c.chart2, 0.35) }} data={weeks.map((w) => ({ x: new Date(w.period).toLocaleDateString("en", { day: "numeric", month: "short", timeZone: "UTC" }), y: Math.round(w.minutes) }))} />
          </Host>
        )}
      </View>
    </Card>
  );
}

function Units({ units }: { units: Analytics["units"] }) {
  const { c } = useTheme();
  return (
    <Card style={{ flex: 1 }}>
      <CardHeader title="Mastery by unit" />
      <View style={{ padding: 16, gap: 12 }}>
        {units.map((u) => (
          <View key={u.unitId} style={{ gap: 5 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
              <Text variant="caption" weight="medium" numberOfLines={1} style={{ flexShrink: 1 }}>
                {u.title}
              </Text>
              <Text variant="caption" muted>
                {pct(u.mastery)} · {u.started}/{u.total} started
              </Text>
            </View>
            <ProgressBar value={u.mastery} gradient={[c.primary, c.chart2]} />
          </View>
        ))}
      </View>
    </Card>
  );
}

function Levels({ levels }: { levels: Analytics["levels"] }) {
  const label = { 1: "Warm-up", 2: "Core", 3: "Stretch" } as Record<number, string>;
  return (
    <Card style={{ flex: 1 }}>
      <CardHeader title="By difficulty" />
      <View style={{ flexDirection: "row", padding: 16, gap: 12 }}>
        {levels.map((l) => (
          <View key={l.level} style={{ flex: 1, alignItems: "center", gap: 6 }}>
            <MasteryRing value={l.accuracy} size={60} stroke={6}>
              <Text variant="caption" weight="semibold">
                {pct(l.accuracy)}
              </Text>
            </MasteryRing>
            <Text variant="small" weight="medium">
              {"★".repeat(l.level)} {label[l.level]}
            </Text>
            <Text variant="caption" muted>
              {l.problems} problems
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function Lessons({ title, icon, tone, items, empty }: { title: string; icon: SymbolName; tone: Tone; items: Analytics["strongest"]; empty: string }) {
  const { open } = useOpenLesson();
  const { c } = useTheme();
  return (
    <Card style={{ flex: 1 }}>
      <CardHeader title={title} icon={icon} iconTone={tone} />
      {items.length === 0 ? (
        <Text variant="small" muted style={{ padding: 16 }}>
          {empty}
        </Text>
      ) : (
        <View style={{ paddingVertical: 6 }}>
          {items.map((p, i) => (
            <View key={p.exerciseId}>
              {i > 0 && <Separator inset={64} />}
              <Row
                leading={<MasteryRing value={p.effectiveMastery} size={36} stroke={3.5} color={statusMeta[p.status].ring(c)} />}
                title={p.title}
                subtitle={`${statusMeta[p.status].label} · struggle ${pct(p.struggle)}`}
                onPress={() => open(p.exerciseId)}
              />
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

function Recent({ sessions }: { sessions: Analytics["recentSessions"] }) {
  const { open } = useOpenLesson();
  if (sessions.length === 0) return null;
  return (
    <Card>
      <CardHeader title="Recent sessions" />
      <View style={{ paddingVertical: 6 }}>
        {sessions.slice(0, 10).map((s, i) => {
          const delta = s.masteryAfter === null ? null : Math.round((s.masteryAfter - s.masteryBefore) * 100);
          return (
            <View key={s.id}>
              {i > 0 && <Separator inset={16} />}
              <Row
                title={s.title}
                subtitle={`${s.mode[0]!.toUpperCase()}${s.mode.slice(1)}${s.completedAt ? ` · ${relative(s.completedAt)}` : " · unfinished"}`}
                right={
                  delta !== null ? (
                    <Text variant="small" weight="semibold" tone={delta >= 0 ? "success" : "danger"}>
                      {delta >= 0 ? "+" : ""}
                      {delta}%
                    </Text>
                  ) : undefined
                }
                onPress={() => open(s.exerciseId)}
              />
            </View>
          );
        })}
      </View>
    </Card>
  );
}
