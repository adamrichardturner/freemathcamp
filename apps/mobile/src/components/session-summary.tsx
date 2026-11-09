import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import type { SessionSummary } from "@/lib/api";
import { exerciseRef, exerciseTitle } from "@/lib/course";
import { duration, pct } from "@/lib/format";
import { useLayout } from "@/lib/layout";
import { alpha, radius, useTheme, type Tone } from "@/lib/theme";
import { queueMeta, unitSymbol } from "./status";
import { Button, Card, Icon, MasteryRing, Pill, Text, type SymbolName } from "./ui";

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
export function SessionSummaryView({ summary, onAgain, restarting, onDone }: { summary: SessionSummary; onAgain: () => void; restarting: boolean; onDone: () => void }) {
  const { c } = useTheme();
  // Rounded first, so a change too small to show reads as +0% rather than a red "0%".
  const gained = Math.round((summary.mastery.after - summary.mastery.before) * 100);
  // Leaves the finished lesson behind rather than stacking the next one on top of it.
  const openLesson = (id: string, mode?: string) => {
    router.dismissAll();
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

      <NextSteps summary={summary} onAgain={onAgain} restarting={restarting} onDone={onDone} onOpen={openLesson} />

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

    </ScrollView>
  );
}

/**
 * Three clear choices: carry on with the next session (a different subject
 * when there is one), practise this lesson again, or finish.
 */
function NextSteps({ summary, onAgain, restarting, onDone, onOpen }: { summary: SessionSummary; onAgain: () => void; restarting: boolean; onDone: () => void; onOpen: (id: string, mode?: string) => void }) {
  const { c } = useTheme();
  const { medium } = useLayout();
  const next = summary.upNext[0];
  const ref = next ? exerciseRef(next.exerciseId) : undefined;
  const m = next ? queueMeta[next.kind] : undefined;
  return (
    <Animated.View entering={FadeIn.delay(150).duration(300)} style={{ gap: 10 }}>
      {next && ref && m && (
        <Pressable
          onPress={() => onOpen(next.exerciseId, m.mode)}
          accessibilityRole="button"
          accessibilityLabel={`Continue to ${ref.exercise.title}`}
          style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }], opacity: pressed ? 0.92 : 1 })}
        >
          <LinearGradient
            colors={[c.primary, mix(c.primary, c.chart5)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14, borderRadius: radius.xl, borderCurve: "continuous", boxShadow: `0 8px 20px ${alpha(c.primary, 0.3)}` }}
          >
            <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: alpha(c.primaryForeground, 0.16), alignItems: "center", justifyContent: "center" }}>
              <Icon name={unitSymbol(ref.unit.icon)} size={19} color={c.primaryForeground} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Text variant="caption" weight="medium" numberOfLines={1} style={{ color: alpha(c.primaryForeground, 0.85) }}>
                Up next · {m.label} · {ref.unit.title}
              </Text>
              <Text weight="semibold" numberOfLines={1} style={{ color: c.primaryForeground, fontSize: 17 }}>
                {ref.exercise.title}
              </Text>
            </View>
            <Icon name="arrow.right" size={18} color={c.primaryForeground} weight="semibold" />
          </LinearGradient>
        </Pressable>
      )}
      <View style={{ flexDirection: "row", gap: 10, width: "100%", maxWidth: medium ? 520 : undefined, alignSelf: "center" }}>
        <Pressable
          onPress={onAgain}
          disabled={restarting}
          accessibilityRole="button"
          style={({ pressed }) => ({ flex: 1, height: 48, borderRadius: radius.lg, borderCurve: "continuous", backgroundColor: alpha(c.primary, pressed ? 0.18 : 0.11), flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 })}
        >
          <Icon name="arrow.counterclockwise" size={15} tone="primary" weight="semibold" />
          <Text weight="semibold" tone="primary">
            {restarting ? "Starting…" : "Practise again"}
          </Text>
        </Pressable>
        <Button title="Done" variant={next ? "outline" : "default"} icon="checkmark" onPress={onDone} style={{ flex: 1, height: 48 }} />
      </View>
    </Animated.View>
  );
}

/** Blends two hex colours halfway, for a gentle gradient between theme tones. */
const mix = (a: string, b: string) => {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2].map((i) => Math.round(ch(a, i) * 0.65 + ch(b, i) * 0.35).toString(16).padStart(2, "0")).join("")}`;
};

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
