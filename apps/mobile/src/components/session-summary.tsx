import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import type { SessionSummary } from "@/lib/api";
import { exerciseTitle } from "@/lib/course";
import { duration, pct } from "@/lib/format";
import { alpha, radius, useTheme, type Tone } from "@/lib/theme";
import { queueMeta } from "./status";
import { Button, Card, Icon, MasteryRing, Pill, Text, type SymbolName } from "./ui";
import { useLayout } from "@/lib/layout";

const headline = (s: SessionSummary) =>
  s.accuracy === 1 ? "Flawless session!" : s.accuracy >= 0.8 ? "Great work!" : s.accuracy >= 0.5 ? "Solid progress" : "Tough one — that's how learning feels";

type Item = SessionSummary["items"][number];
const LEVEL_LABEL = { 1: "Warm-up", 2: "Core", 3: "Stretch" } as const;
// The same four outcomes the engine scores: clean, slipped, helped, shown.
const OUTCOME: Record<"clean" | "slipped" | "helped" | "shown", { label: string; icon: SymbolName; tone: Tone }> = {
  clean: { label: "First try", icon: "checkmark", tone: "success" },
  slipped: { label: "Extra tries", icon: "xmark", tone: "warning" },
  helped: { label: "Used hints", icon: "lightbulb.fill", tone: "chart2" },
  shown: { label: "Solution shown", icon: "eye.fill", tone: "danger" },
};
const outcomeOf = (it: Item) => (it.revealed ? "shown" : it.wrongAttempts > 0 ? "slipped" : it.hintsUsed > 0 ? "helped" : "clean");

/** The end of a session, as the web's summary: mastery before and after, stats, each problem and what next. */
export function SessionSummaryView({ summary, onAgain, restarting, onExit }: { summary: SessionSummary; onAgain: () => void; restarting: boolean; onExit: () => void }) {
  const { c } = useTheme();
  const { medium } = useLayout();
  // Rounded first, so a change too small to show reads as +0% rather than a red "0%".
  const gained = Math.round((summary.mastery.after - summary.mastery.before) * 100);
  const openLesson = (id: string, mode?: string) => {
    router.back();
    router.push({ pathname: "/lesson/[id]", params: mode ? { id, mode } : { id } });
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Animated.View entering={FadeIn.duration(300)}>
        <Card>
          <LinearGradient colors={[alpha(c.primary, 0.15), c.card, alpha(c.chart2, 0.1)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ alignItems: "center", paddingVertical: 28, paddingHorizontal: 20, gap: 6 }}>
            <Animated.View entering={ZoomIn.springify().delay(100)} style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: c.primary, alignItems: "center", justifyContent: "center", boxShadow: `0 8px 20px ${alpha(c.primary, 0.3)}` }}>
              <Icon name="trophy.fill" size={28} color={c.primaryForeground} />
            </Animated.View>
            <Text variant="display" style={{ fontSize: 32, lineHeight: 36, textAlign: "center", marginTop: 6 }}>
              {headline(summary)}
            </Text>
            <Text variant="small" muted>
              {exerciseTitle(summary.exerciseId)}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 20, marginTop: 16 }}>
              <View style={{ alignItems: "center", gap: 4 }}>
                <MasteryRing value={summary.mastery.before} size={64} stroke={6} color={c.mutedForeground} />
                <Text variant="caption" muted>
                  before
                </Text>
              </View>
              <Icon name="arrow.right" size={18} tone="muted" />
              <View style={{ alignItems: "center", gap: 4 }}>
                <MasteryRing value={summary.mastery.after} size={84} stroke={7}>
                  <Text weight="semibold">{pct(summary.mastery.after)}</Text>
                </MasteryRing>
                <Text variant="caption" weight="semibold" tone={gained >= 0 ? "success" : "danger"}>
                  {gained >= 0 ? "+" : ""}
                  {gained}% mastery
                </Text>
              </View>
            </View>
          </LinearGradient>
          <View style={{ flexDirection: "row", borderTopWidth: 1, borderColor: c.border }}>
            <Stat icon="target" label="First-try accuracy" value={pct(summary.accuracy)} />
            <Stat icon="clock" label="Time" value={duration(summary.totalTimeMs)} border />
            <Stat icon="calendar.badge.clock" label="Next review" value={summary.intervalDays <= 1 ? "Tomorrow" : `In ${Math.round(summary.intervalDays)} days`} border />
          </View>
        </Card>
      </Animated.View>

      <Card style={{ padding: 16, gap: 10 }}>
        <Text variant="label" muted>
          Problem by problem
        </Text>
        {summary.items.map((it, i) => {
          const o = OUTCOME[outcomeOf(it)];
          return (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text variant="small" muted style={{ width: 28 }}>
                Q{i + 1}
              </Text>
              <Pill label={o.label} tone={o.tone} icon={o.icon} />
              <Text variant="caption" muted style={{ flex: 1 }}>
                {LEVEL_LABEL[it.level]} · {duration(it.timeMs)}
              </Text>
              <View style={{ width: 56, height: 6, borderRadius: 3, backgroundColor: c.muted, overflow: "hidden" }}>
                <View style={{ width: `${(1 - it.struggle) * 100}%`, height: "100%", backgroundColor: 1 - it.struggle >= 0.75 ? c.success : 1 - it.struggle >= 0.45 ? c.warning : c.danger }} />
              </View>
            </View>
          );
        })}
        <Text variant="caption" muted>
          The bar is smoothness: a quick, unaided first-try solve fills it.
        </Text>
      </Card>

      {summary.brushUp.length > 0 && (
        <View style={{ borderRadius: radius.xl, borderWidth: 1, borderColor: alpha(c.warning, 0.3), backgroundColor: alpha(c.warning, 0.07), padding: 14, gap: 10 }}>
          <Text variant="small" weight="semibold">
            This looked tricky. These earlier ideas might help:
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {summary.brushUp.map((x) => (
              <Pressable key={x} onPress={() => openLesson(x)} style={{ borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.background, paddingHorizontal: 12, paddingVertical: 6 }}>
                <Text variant="small" weight="medium">
                  {exerciseTitle(x)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {summary.upNext.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text variant="label" muted>
            Recommended next
          </Text>
          {summary.upNext.map((r) => {
            const m = queueMeta[r.kind];
            return (
              <Pressable key={r.exerciseId} onPress={() => openLesson(r.exerciseId, m.mode)}>
                <Card style={{ padding: 14, gap: 6 }}>
                  <Pill label={m.label} tone={m.tone} icon={m.icon} />
                  <Text weight="semibold">{exerciseTitle(r.exerciseId)}</Text>
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Stacked on a phone; side by side on an iPad, where full-width buttons would be very long. */}
      <View style={{ gap: 10, flexDirection: medium ? "row" : "column", alignItems: medium ? "center" : "stretch" }}>
        <Button title="Back to lesson" size="lg" onPress={onExit} style={medium ? { flex: 1 } : undefined} />
        <Button title={restarting ? "Starting…" : "Practice again"} variant="outline" icon="arrow.counterclockwise" loading={restarting} onPress={onAgain} style={medium ? { flex: 1 } : undefined} />
        <Button
          title="Dashboard"
          variant="ghost"
          iconRight="arrow.right"
          style={medium ? { flex: 1 } : undefined}
          onPress={() => {
            router.dismissAll();
            router.navigate("/");
          }}
        />
      </View>
    </ScrollView>
  );
}

function Stat({ icon, label, value, border }: { icon: SymbolName; label: string; value: string; border?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", paddingVertical: 14, paddingHorizontal: 4, gap: 2, borderLeftWidth: border ? 1 : 0, borderColor: c.border }}>
      <Icon name={icon} size={15} tone="muted" />
      <Text weight="semibold" style={{ fontSize: 17 }}>
        {value}
      </Text>
      <Text variant="caption" muted style={{ fontSize: 10.5, textAlign: "center" }}>
        {label}
      </Text>
    </View>
  );
}
