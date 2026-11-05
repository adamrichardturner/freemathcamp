import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Alert } from "react-native";
import type { LearningMode } from "@fmc/curriculum";
import { api, type User } from "@/lib/api";
import { useApplyUser, useInvalidateLearner } from "@/lib/queries";
import { toast } from "@/lib/toast";
import { Segmented } from "./segmented";
import type { SymbolName } from "./ui";

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
