import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { View } from "react-native";
import { useTheme } from "@/lib/theme";
import { Text } from "./ui";

/** The last 7 days as small bars, today last. `min` keeps a quiet week from looking full. */
export function WeekBars({ days: values, format = String, gradient, min = 5 }: { days: { day: string; value: number }[]; format?: (v: number) => string; gradient?: [string, string]; min?: number }) {
  const { c } = useTheme();
  const [now] = useState(() => Date.now());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    return { key, label: d.toLocaleDateString("en", { weekday: "narrow" }), value: values.find((w) => w.day === key)?.value ?? 0 };
  });
  const max = Math.max(min, ...days.map((d) => d.value));
  const colors = gradient ?? [c.primary, c.chart5];
  return (
    <View style={{ flexDirection: "row", height: 128, alignItems: "flex-end", gap: 8 }}>
      {days.map((d, i) => (
        <View key={d.key} style={{ flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
          <Text variant="caption" muted style={{ fontSize: 10 }}>
            {d.value ? format(d.value) : ""}
          </Text>
          <View style={{ width: "100%", height: `${Math.max(4, (d.value / max) * 72)}%`, borderRadius: 6, overflow: "hidden", backgroundColor: c.muted }}>
            {d.value > 0 && <LinearGradient colors={[colors[1], colors[0]]} style={{ flex: 1 }} />}
          </View>
          <Text variant="caption" muted weight={i === 6 ? "semibold" : undefined} style={i === 6 ? { color: c.foreground } : undefined}>
            {d.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
