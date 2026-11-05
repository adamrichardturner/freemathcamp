import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { dismiss, subscribe, type ToastItem } from "@/lib/toast";
import { alpha, radius, useTheme } from "@/lib/theme";
import { Icon, Text } from "./ui";

/** Shows toasts from lib/toast at the top of the screen, above everything else. */
export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  useEffect(() => subscribe(setItems), []);
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", top: insets.top + 6, left: 16, right: 16, gap: 8, alignItems: "center" }}>
      {items.map((t) => {
        const tone = t.kind === "error" ? c.danger : t.kind === "success" ? c.success : c.primary;
        const icon = t.icon === "up" ? "chart.line.uptrend.xyaxis" : t.icon === "down" ? "chart.line.downtrend.xyaxis" : t.kind === "error" ? "exclamationmark.circle.fill" : t.kind === "success" ? "checkmark.circle.fill" : "info.circle.fill";
        return (
          <Animated.View key={t.id} entering={FadeInUp.springify().damping(18)} exiting={FadeOutUp} layout={LinearTransition}>
            <Pressable
              onPress={() => dismiss(t.id)}
              accessibilityRole="alert"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                maxWidth: 440,
                paddingVertical: 11,
                paddingHorizontal: 14,
                borderRadius: radius["2xl"],
                borderCurve: "continuous",
                backgroundColor: c.card,
                borderWidth: 1,
                borderColor: c.border,
                boxShadow: `0 8px 24px ${alpha("#000000", 0.14)}`,
              }}
            >
              <Icon name={icon} size={18} color={tone} />
              <Text variant="small" weight="medium" style={{ flexShrink: 1 }}>
                {t.message}
              </Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}
