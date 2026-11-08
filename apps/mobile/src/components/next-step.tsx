import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, { Easing, FadeInDown, FadeOutDown, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Button, Icon, Pill, Text, type SymbolName } from "@/components/ui";
import type { PracticeMode } from "@/lib/api";
import type { NextStep } from "@/lib/next-step";
import { alpha, radius, useTheme, type Colors, type Tone } from "@/lib/theme";

type PracticeStep = Extract<NextStep, { kind: "practice" }>;

const TONE: Record<PracticeMode, { icon: SymbolName; tone: Tone; color: (c: Colors) => string }> = {
  review: { icon: "arrow.trianglehead.2.clockwise", tone: "warning", color: (c) => c.warning },
  challenge: { icon: "dumbbell.fill", tone: "danger", color: (c) => c.danger },
  learn: { icon: "sparkles", tone: "primary", color: (c) => c.primary },
};

/** A ring that swells out from the icon and fades, over and over. */
function Pulse({ color, size, round }: { color: string; size: number; round?: boolean }) {
  const reduce = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (!reduce) t.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false);
  }, [reduce, t]);
  const style = useAnimatedStyle(() => ({ opacity: 0.6 * (1 - t.value), transform: [{ scale: 1 + 0.45 * t.value }] }));
  if (reduce) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", width: size, height: size, borderRadius: round ? size / 2 : size * 0.3, borderWidth: 2, borderColor: color, borderCurve: "continuous" },
        style,
      ]}
    />
  );
}

/**
 * The call to practise when practice is what's due: a card whose edge glows in and out,
 * with a pulsing icon, so it's plainly the next move. The lesson stays right below it.
 */
export function PracticeDueBanner({ step, onStart }: { step: PracticeStep; onStart: () => void }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const t = TONE[step.mode];
  const color = t.color(c);
  const glow = useSharedValue(0);
  useEffect(() => {
    if (!reduce) glow.value = withRepeat(withSequence(withTiming(1, { duration: 1400 }), withTiming(0, { duration: 1400 })), -1, false);
  }, [reduce, glow]);
  const edge = useAnimatedStyle(() => ({ opacity: 0.45 + 0.55 * glow.value }));

  return (
    <Animated.View entering={FadeInDown.delay(120).springify().damping(18)} style={{ marginHorizontal: 16 }}>
      <View style={{ borderRadius: radius["2xl"], borderCurve: "continuous", padding: 1.5, overflow: "hidden", boxShadow: `0 8px 24px ${alpha(color, 0.18)}` }}>
        <Animated.View style={[{ position: "absolute", inset: 0 }, edge]}>
          <LinearGradient colors={[color, c.chart2, color]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
        </Animated.View>
        <View style={{ backgroundColor: c.card, borderRadius: radius["2xl"] - 1.5, borderCurve: "continuous", padding: 16, gap: 14 }}>
          <View style={{ flexDirection: "row", gap: 14, alignItems: "flex-start" }}>
            <View style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}>
              <Pulse color={color} size={48} />
              <LinearGradient
                colors={[color, c.chart5]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 48, height: 48, borderRadius: 14, borderCurve: "continuous", alignItems: "center", justifyContent: "center" }}
              >
                <Icon name={t.icon} size={22} color="#fff" />
              </LinearGradient>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Pill label={step.label} tone={t.tone} icon={t.icon} />
              <Text variant="heading">{step.title}</Text>
              <Text variant="small" muted>
                {step.text}
              </Text>
            </View>
          </View>
          <Button title={step.cta} iconRight="arrow.right" size="lg" onPress={onStart} />
          <Text variant="caption" muted style={{ textAlign: "center" }}>
            Need a refresher first? The lesson is just below.
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

/** One line on a fresh lesson saying what the page is for, in order. */
export function LessonFirstHint({ minutes }: { minutes: number }) {
  const { c } = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(150).duration(350)} style={{ marginHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Step n={1} active color={c.primary} label="Read the lesson" sub={`~${minutes} min`} />
      <View style={{ flex: 1, maxWidth: 40, height: 1.5, borderRadius: 1, backgroundColor: c.border }} />
      <Step n={2} color={c.mutedForeground} label="Practise" sub="adaptive" />
    </Animated.View>
  );
}

function Step({ n, active, color, label, sub }: { n: number; active?: boolean; color: string; label: string; sub: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: active ? color : alpha(color, 0.15) }}>
        <Text variant="caption" weight="bold" style={{ color: active ? c.primaryForeground : color, fontSize: 11 }}>
          {n}
        </Text>
      </View>
      <View>
        <Text variant="small" weight="semibold" style={{ color: active ? c.foreground : c.mutedForeground }}>
          {label}
        </Text>
        <Text variant="caption" muted style={{ fontSize: 11 }}>
          {sub}
        </Text>
      </View>
    </View>
  );
}

/** A floating call to practise, for once the banner has scrolled away. */
export function FloatingPracticeButton({ step, onStart }: { step: PracticeStep; onStart: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18)}
      exiting={FadeOutDown.duration(180)}
      pointerEvents="box-none"
      style={{ position: "absolute", left: 0, right: 0, bottom: Math.max(insets.bottom, 12) + 4, alignItems: "center" }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={step.cta}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onStart();
        }}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingLeft: 8,
          paddingRight: 18,
          height: 52,
          borderRadius: 999,
          backgroundColor: c.primary,
          boxShadow: `0 10px 28px ${alpha(c.primary, 0.35)}`,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}
      >
        <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: alpha("#ffffff", 0.18) }}>
          <Pulse color="#fff" size={36} round />
          <Icon name={TONE[step.mode].icon} size={16} color={c.primaryForeground} />
        </View>
        <View>
          <Text variant="caption" weight="semibold" style={{ color: alpha(c.primaryForeground, 0.75), fontSize: 11 }}>
            {step.label}
          </Text>
          <Text weight="semibold" style={{ color: c.primaryForeground }}>
            {step.cta}
          </Text>
        </View>
        <Icon name="arrow.right" size={16} color={c.primaryForeground} />
      </Pressable>
    </Animated.View>
  );
}

/** A small flag with a pulsing dot on a lesson row: where to start, or practice that's due. */
export function LessonFlag({ label, tone }: { label: string; tone: "primary" | "warning" | "danger" }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const color = c[tone];
  const solid = tone === "primary";
  const t = useSharedValue(0);
  useEffect(() => {
    if (!reduce) t.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false);
  }, [reduce, t]);
  const ping = useAnimatedStyle(() => ({ opacity: 0.7 * (1 - t.value), transform: [{ scale: 1 + 1.4 * t.value }] }));
  const dot = solid ? c.primaryForeground : color;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: solid ? color : alpha(color, 0.14) }}>
      <View style={{ width: 6, height: 6, alignItems: "center", justifyContent: "center" }}>
        {!reduce && <Animated.View style={[{ position: "absolute", width: 6, height: 6, borderRadius: 3, backgroundColor: dot }, ping]} />}
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot }} />
      </View>
      <Text variant="caption" weight="semibold" style={{ fontSize: 11, color: solid ? c.primaryForeground : color }}>
        {label}
      </Text>
    </View>
  );
}
