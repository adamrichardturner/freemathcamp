import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Children, forwardRef, useEffect, type ComponentRef, type ReactNode } from "react";
import Reanimated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  type PressableProps,
  type ScrollViewProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useLayout, widths } from "@/lib/layout";
import { alpha, fonts, radius, toneColor, useTheme, type Tone } from "@/lib/theme";
import { useRevealPending } from "./reveal";

/**
 * The app's building blocks, styled after the web app's shadcn/ui components
 * (Card, Button, Badge, Progress) with the same tokens, in native views.
 */

export type SymbolName = SymbolViewProps["name"];

type TextVariant = "display" | "title" | "heading" | "body" | "small" | "caption" | "label";
const textStyles: Record<TextVariant, TextStyle> = {
  display: { fontFamily: fonts.display, fontSize: 40, lineHeight: 44, letterSpacing: -0.4 },
  title: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28 },
  heading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  label: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 1.1, textTransform: "uppercase" },
};

export function Text({ variant = "body", muted, tone, weight, style, ...props }: TextProps & { variant?: TextVariant; muted?: boolean; tone?: Tone; weight?: "medium" | "semibold" | "bold" }) {
  const { c } = useTheme();
  const color = tone ? toneColor(c, tone) : muted ? c.mutedForeground : c.foreground;
  return <RNText {...props} style={[textStyles[variant], { color, fontVariant: ["tabular-nums"] }, weight && { fontFamily: fonts[weight] }, style]} />;
}

export function Icon({ name, size = 18, color, tone, weight = "medium", style }: { name: SymbolName; size?: number; color?: string; tone?: Tone; weight?: SymbolViewProps["weight"]; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return <SymbolView name={name} size={size} weight={weight} tintColor={color ?? (tone ? toneColor(c, tone) : c.foreground)} style={[{ width: size, height: size }, style]} />;
}

/**
 * A scrolling screen. On an iPad the content is a centred column `width` wide
 * (see lib/layout); `flush` drops the side padding for content that brings its
 * own, such as lessons rendered in a web view.
 */
export function Screen({
  children,
  contentStyle,
  width = widths.readable,
  flush,
  title,
  ...props
}: ScrollViewProps & { contentStyle?: StyleProp<ViewStyle>; width?: number; flush?: boolean; title?: string }) {
  const { c } = useTheme();
  const { sides, wide } = useLayout();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={[{ paddingTop: 16, ...(flush ? flushSides(sides(width, 16)) : sides(width)), paddingBottom: 48, gap: 20 }, contentStyle]}
      {...props}
    >
      {/* On an iPad the tab's title sits in the column (see TabStack); phones show it in the large-title bar. */}
      {wide && title ? <Text variant="display" style={{ fontSize: 40, lineHeight: 44, paddingHorizontal: flush ? 16 : 0 }}>{title}</Text> : null}
      {children}
    </ScrollView>
  );
}

/** Content that brings its own 16pt side padding (a lesson's web view) takes 16 less. */
const flushSides = ({ paddingLeft, paddingRight }: { paddingLeft: number; paddingRight: number }) => ({ paddingLeft: paddingLeft - 16, paddingRight: paddingRight - 16 });

/**
 * Children in rows of `columns`, each the same width. Pass a different count
 * for phones and iPads with useLayout().columns(phone, tablet).
 */
export function Grid({ columns, gap = 12, children }: { columns: number; gap?: number; children: ReactNode }) {
  const items = Children.toArray(children).filter(Boolean);
  const rows: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += columns) rows.push(items.slice(i, i + columns));
  return (
    <View style={{ gap }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: "row", gap, alignItems: "stretch" }}>
          {row.map((item, i) => (
            <View key={i} style={{ flex: 1, minWidth: 0 }}>
              {item}
            </View>
          ))}
          {Array.from({ length: columns - row.length }, (_, i) => (
            <View key={`pad${i}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

export function Card({ children, style, featured, ...props }: ViewProps & { featured?: boolean }) {
  const { c } = useTheme();
  const base: ViewStyle = { backgroundColor: c.card, borderColor: featured ? alpha(c.primary, 0.3) : c.border, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radius["2xl"], borderCurve: "continuous", overflow: "hidden" };
  if (!featured)
    return (
      <View {...props} style={[base, style]}>
        {children}
      </View>
    );
  return (
    <View {...props} style={[base, style]}>
      <LinearGradient colors={[alpha(c.primary, 0.1), alpha(c.card, 0)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

export function CardHeader({ title, icon, iconTone = "primary", right, subtitle }: { title: string; icon?: SymbolName; iconTone?: Tone; right?: ReactNode; subtitle?: string }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}>
          {icon && <Icon name={icon} size={16} tone={iconTone} />}
          <Text variant="heading">{title}</Text>
        </View>
        {right}
      </View>
      {subtitle && (
        <Text variant="caption" muted>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "sm" | "md" | "lg";

export const Button = forwardRef<ComponentRef<typeof View>, Omit<PressableProps, "children"> & { title?: string; icon?: SymbolName; iconRight?: SymbolName; variant?: ButtonVariant; size?: ButtonSize; loading?: boolean; children?: ReactNode; style?: StyleProp<ViewStyle> }>(
  function Button({ title, icon, iconRight, variant = "default", size = "md", loading, disabled, onPress, children, style, ...props }, ref) {
    const { c } = useTheme();
    const colors: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
      default: { bg: c.primary, fg: c.primaryForeground },
      secondary: { bg: c.secondary, fg: c.secondaryForeground },
      outline: { bg: c.card, fg: c.foreground, border: c.border },
      ghost: { bg: "transparent", fg: c.foreground },
      destructive: { bg: alpha(c.destructive, 0.12), fg: c.destructive },
    };
    const v = colors[variant];
    const h = size === "sm" ? 36 : size === "lg" ? 52 : 44;
    const inactive = disabled || loading;
    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!inactive, busy: !!loading }}
        disabled={inactive}
        onPress={(e) => {
          if (variant === "default") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.(e);
        }}
        style={({ pressed }) => [
          {
            height: h,
            paddingHorizontal: size === "sm" ? 12 : 18,
            borderRadius: size === "lg" ? radius.xl : radius.lg,
            borderCurve: "continuous",
            backgroundColor: v.bg,
            borderWidth: v.border ? 1 : 0,
            borderColor: v.border,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            opacity: disabled && !loading ? 0.5 : pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
          variant === "default" && { boxShadow: `0 4px 14px ${alpha(c.primary, 0.25)}` },
          style,
        ]}
        {...props}
      >
        {loading ? <ActivityIndicator size="small" color={v.fg} /> : icon ? <Icon name={icon} size={size === "sm" ? 15 : 17} color={v.fg} /> : null}
        {title ? (
          <Text variant={size === "sm" ? "small" : "body"} weight="semibold" style={{ color: v.fg }} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {children}
        {iconRight && <Icon name={iconRight} size={size === "sm" ? 14 : 16} color={v.fg} />}
      </Pressable>
    );
  },
);

export function Pill({ label, tone = "primary", icon, solid }: { label: string; tone?: Tone; icon?: SymbolName; solid?: boolean }) {
  const { c } = useTheme();
  const color = toneColor(c, tone);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: solid ? color : alpha(color, 0.13), borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
      {icon && <Icon name={icon} size={11} color={solid ? "#fff" : color} weight="semibold" />}
      <Text variant="caption" weight="semibold" style={{ color: solid ? "#fff" : color, fontSize: 11 }}>
        {label}
      </Text>
    </View>
  );
}

export function ProgressBar({ value, tone = "primary", gradient, height = 6 }: { value: number; tone?: Tone; gradient?: [string, string]; height?: number }) {
  const { c } = useTheme();
  const width = `${Math.max(0, Math.min(1, value)) * 100}%` as const;
  return (
    <View style={{ height, borderRadius: 999, backgroundColor: c.muted, overflow: "hidden" }}>
      {gradient ? (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ height: "100%", width, borderRadius: 999 }} />
      ) : (
        <View style={{ height: "100%", width, borderRadius: 999, backgroundColor: toneColor(c, tone) }} />
      )}
    </View>
  );
}

/** The web's circular mastery gauge. */
export function MasteryRing({ value, size = 44, stroke = 4, color, children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const { c } = useTheme();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c.muted} strokeWidth={stroke} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color ?? c.primary}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - Math.max(0, Math.min(1, value)))}
        />
      </Svg>
      {children ?? (
        <Text variant="caption" weight="semibold" style={{ fontSize: size < 40 ? 10 : 11 }}>
          {Math.round(value * 100)}
        </Text>
      )}
    </View>
  );
}

export const Input = forwardRef<ComponentRef<typeof TextInput>, TextInputProps & { invalid?: boolean }>(function Input({ style, invalid, ...props }, ref) {
  const { c } = useTheme();
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={c.mutedForeground}
      selectionColor={c.primary}
      style={[
        {
          height: 48,
          borderRadius: radius.xl,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: invalid ? c.danger : c.input,
          backgroundColor: c.card,
          color: c.foreground,
          paddingHorizontal: 14,
          fontFamily: fonts.regular,
          fontSize: 17,
        },
        style,
      ]}
      {...props}
    />
  );
});

export function Field({ label, error, hint, children }: { label: string; error?: string | null; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text variant="small" weight="medium">
        {label}
      </Text>
      {children}
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" muted>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function Separator({ inset = 0 }: { inset?: number }) {
  const { c } = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginLeft: inset }} />;
}

export function SectionTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
      <Text variant="title" style={{ fontSize: 19 }}>
        {title}
      </Text>
      {right}
    </View>
  );
}

/** A tappable row: icon or leading view, title, subtitle and a chevron. */
export function Row({ leading, title, subtitle, right, onPress, disabled, chevron = !!onPress }: { leading?: ReactNode; title: string; subtitle?: ReactNode; right?: ReactNode; onPress?: () => void; disabled?: boolean; chevron?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable disabled={disabled || !onPress} onPress={onPress} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 16, backgroundColor: pressed ? c.muted : "transparent" })}>
      {leading}
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Text weight="medium" numberOfLines={1} style={disabled && { color: c.mutedForeground }}>
          {title}
        </Text>
        {typeof subtitle === "string" ? (
          <Text variant="caption" muted numberOfLines={2}>
            {subtitle}
          </Text>
        ) : (
          subtitle
        )}
      </View>
      {right}
      {chevron && <Icon name="chevron.right" size={13} color={c.mutedForeground} weight="semibold" />}
    </Pressable>
  );
}

/** A rounded square holding an icon, like the web's tinted icon chips. */
export function IconChip({ name, tone = "primary", size = 36, gradient }: { name: SymbolName; tone?: Tone; size?: number; gradient?: boolean }) {
  const { c } = useTheme();
  const color = toneColor(c, tone);
  const style: ViewStyle = { width: size, height: size, borderRadius: size * 0.3, borderCurve: "continuous", alignItems: "center", justifyContent: "center", overflow: "hidden" };
  if (gradient)
    return (
      <LinearGradient colors={[c.primary, c.chart5]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[style, { boxShadow: `0 4px 10px ${alpha(c.primary, 0.25)}` }]}>
        <Icon name={name} size={size * 0.5} color={c.primaryForeground} />
      </LinearGradient>
    );
  return (
    <View style={[style, { backgroundColor: alpha(color, 0.12) }]}>
      <Icon name={name} size={size * 0.48} color={color} />
    </View>
  );
}

export function Empty({ icon, title, text, children }: { icon: SymbolName; title: string; text?: string; children?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ alignItems: "center", gap: 10, padding: 24, borderRadius: radius["2xl"], borderWidth: 1, borderStyle: "dashed", borderColor: c.border }}>
      <IconChip name={icon} tone="muted" size={44} />
      <Text variant="heading" style={{ textAlign: "center" }}>
        {title}
      </Text>
      {text && (
        <Text variant="small" muted style={{ textAlign: "center" }}>
          {text}
        </Text>
      )}
      {children}
    </View>
  );
}

/** A placeholder block that gently pulses while content loads. */
export function Skeleton({ height, width = "100%", style }: { height: number; width?: ViewStyle["width"]; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  // A skeleton still showing inside revealing content is a piece that hasn't arrived yet.
  useRevealPending();
  const pulse = useSharedValue(0.55);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 850, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [pulse]);
  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return <Reanimated.View style={[{ height, width, borderRadius: radius.xl, backgroundColor: c.muted }, animated, style]} />;
}

export function Loading() {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.background, padding: 40 }}>
      <ActivityIndicator color={c.mutedForeground} />
    </View>
  );
}
