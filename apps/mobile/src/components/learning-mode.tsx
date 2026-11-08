import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import type { LearningMode } from "@fmc/curriculum";
import { api, type User } from "@/lib/api";
import { useLayout } from "@/lib/layout";
import { useApplyUser, useInvalidateLearner } from "@/lib/queries";
import { alpha, radius, useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { Segmented } from "./segmented";
import { Icon, Pill, Text, type SymbolName } from "./ui";

export const MODE_META: Record<LearningMode, { label: string; icon: SymbolName; short: string; points: string[] }> = {
  path: {
    label: "Path mode",
    icon: "point.topleft.down.to.point.bottomright.curvepath",
    short: "Lessons unlock one at a time, in order.",
    points: [
      "Lessons open in order — finish a practice session to unlock the next one.",
      "Your daily plan only suggests new lessons you've unlocked.",
      "Lessons you've already started stay open.",
    ],
  },
  audit: {
    label: "Audit mode",
    icon: "safari",
    short: "Every lesson is open — explore in any order.",
    points: ["Every lesson in the course is open, in any order.", "Your daily plan can suggest any lesson you're ready for.", "Your progress and mastery are kept exactly as they are."],
  },
};

export const useSetLearningMode = () => {
  const applyUser = useApplyUser();
  const invalidateLearner = useInvalidateLearner();
  const mutation = useMutation({
    mutationFn: (learningMode: LearningMode) => api.patch<{ user: User }>("/me/preferences", { learningMode }),
    // Pending until lesson locks are refetched, so the course never shows the old mode's locks.
    onSuccess: async ({ user }) => {
      await Promise.all([applyUser(user), invalidateLearner()]);
      toast.success(`${MODE_META[user.learningMode].label} is on`);
    },
    onError: (e) => toast.error(e, "Couldn't change the course mode."),
  });
  /** Asks first, as the web's confirmation dialog does. */
  const confirm = (to: LearningMode, onCancel?: () => void) =>
    Alert.alert(`Switch to ${MODE_META[to].label}?`, MODE_META[to].points.join("\n\n"), [
      { text: "Cancel", style: "cancel", onPress: onCancel },
      { text: `Use ${MODE_META[to].label}`, onPress: () => mutation.mutate(to) },
    ]);
  return { ...mutation, confirm };
};

export function LearningModeSwitch({ mode }: { mode: LearningMode }) {
  const set = useSetLearningMode();
  // Remounting puts the native control back on the current mode when a switch is cancelled.
  const [key, setKey] = useState(0);
  const shown = set.isPending && set.variables ? set.variables : mode;
  return (
    <Segmented
      key={key}
      value={shown}
      onChange={(to) => to !== mode && !set.isPending && set.confirm(to, () => setKey((k) => k + 1))}
      options={[
        { value: "path", label: "Path" },
        { value: "audit", label: "Audit" },
      ]}
    />
  );
}

/**
 * The two modes as option cards that apply at once, with no confirmation: the
 * welcome tour, which is already the place to decide. Side by side when there's room.
 */
export function LearningModeCards({ mode, row: rowProp }: { mode: LearningMode; /** Side by side; by default when the window is at least the open iPhone Duo's width. */ row?: boolean }) {
  const { c } = useTheme();
  const { medium: wideEnough } = useLayout();
  const medium = rowProp ?? wideEnough;
  const set = useSetLearningMode();
  const shown = set.isPending && set.variables ? set.variables : mode;
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Course mode" style={{ flexDirection: medium ? "row" : "column", gap: 10 }}>
      {(["path", "audit"] as const).map((m) => {
        const meta = MODE_META[m];
        const active = shown === m;
        const saving = set.isPending && set.variables === m;
        return (
          <Pressable
            key={m}
            accessibilityRole="radio"
            accessibilityState={{ checked: active, busy: saving }}
            accessibilityLabel={`${meta.label}${m === "path" ? ", recommended" : ""}. ${meta.short}`}
            disabled={set.isPending}
            onPress={() => {
              if (m === mode) return;
              void Haptics.selectionAsync();
              set.mutate(m);
            }}
            style={({ pressed }) => ({
              flex: medium ? 1 : undefined,
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 12,
              padding: 14,
              borderRadius: radius.xl,
              borderCurve: "continuous",
              borderWidth: 2,
              borderColor: active ? c.primary : c.border,
              backgroundColor: active ? alpha(c.primary, 0.07) : c.card,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.985 : 1 }],
            })}
          >
            <View style={{ width: 38, height: 38, borderRadius: 11, borderCurve: "continuous", alignItems: "center", justifyContent: "center", backgroundColor: active ? c.primary : c.muted }}>
              {saving ? <ActivityIndicator size="small" color={c.primaryForeground} /> : <Icon name={meta.icon} size={18} color={active ? c.primaryForeground : c.mutedForeground} />}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <Text weight="semibold">{meta.label}</Text>
                {m === "path" && <Pill label="Recommended" tone="success" />}
              </View>
              <Text variant="small" muted>
                {meta.short}
              </Text>
            </View>
            <Icon name={active ? "checkmark.circle.fill" : "circle"} size={20} color={active ? c.primary : c.border} />
          </Pressable>
        );
      })}
    </View>
  );
}
