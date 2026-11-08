import * as Haptics from "expo-haptics";
import { Pressable, ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import { Icon, Text, type SymbolName } from "@/components/ui";
import { alpha, fonts, useTheme } from "@/lib/theme";

export type ChipTab<T extends string> = { value: T; label: string; icon?: SymbolName; count?: number };

const HEIGHT = 38;

/**
 * A row of pill tabs that scrolls sideways when it runs out of room, so every
 * label stays full size and readable. Built from plain views (unlike the native
 * segmented control) so its height is known up front and nothing below it can
 * slide underneath. `inset` pads the scrolling content so the first pill lines
 * up with the content around it while the row still scrolls edge to edge.
 */
export function ChipTabs<T extends string>({ value, onChange, options, inset = 0, style, label }: { value: T; onChange: (v: T) => void; options: ChipTab<T>[]; inset?: number; style?: StyleProp<ViewStyle>; label?: string }) {
  const { c } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={[{ flexGrow: 0, minHeight: HEIGHT }, style]}
      contentContainerStyle={{ gap: 8, paddingHorizontal: inset, alignItems: "center" }}
    >
      {options.map((o) => {
        const selected = o.value === value;
        const fg = selected ? c.primaryForeground : c.foreground;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={o.count !== undefined ? `${o.label}, ${o.count}` : o.label}
            hitSlop={{ top: 4, bottom: 4 }}
            onPress={() => {
              if (selected) return;
              void Haptics.selectionAsync();
              onChange(o.value);
            }}
            style={({ pressed }) => ({
              height: HEIGHT,
              paddingLeft: o.icon ? 12 : 16,
              paddingRight: o.count !== undefined ? 8 : 16,
              borderRadius: 999,
              borderCurve: "continuous",
              flexDirection: "row",
              alignItems: "center",
              gap: 7,
              backgroundColor: selected ? c.primary : c.card,
              borderWidth: 1,
              borderColor: selected ? c.primary : c.border,
              opacity: pressed ? 0.8 : 1,
              boxShadow: selected ? `0 3px 10px ${alpha(c.primary, 0.25)}` : undefined,
            })}
          >
            {o.icon && <Icon name={o.icon} size={14} color={selected ? c.primaryForeground : c.mutedForeground} weight="semibold" />}
            <Text variant="small" style={{ color: fg, fontFamily: fonts.semibold }} numberOfLines={1}>
              {o.label}
            </Text>
            {o.count !== undefined && (
              <View style={{ minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: selected ? alpha(c.primaryForeground, 0.22) : c.muted }}>
                <Text variant="caption" style={{ color: selected ? c.primaryForeground : c.mutedForeground, fontFamily: fonts.semibold }}>
                  {o.count}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
