import * as Haptics from "expo-haptics";
import { useEffect, useRef, type ReactNode } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import type { AnswerKey } from "@/lib/answer-keyboard";
import { radius, useTheme } from "@/lib/theme";
import { Icon, Text } from "./ui";

type KeyTone = "digit" | "symbol" | "switch";

const GAP = 6;

function Key({ label, children, tone = "digit", height, span = 1, disabled, onPress, onHold }: { label: string; children: ReactNode; tone?: KeyTone; height: number; span?: number; disabled?: boolean; onPress: () => void; onHold?: () => void }) {
  const { c } = useTheme();
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);
  const stop = () => {
    if (repeat.current) clearInterval(repeat.current);
    repeat.current = null;
  };
  useEffect(() => stop, []);
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={() => void Haptics.selectionAsync()}
      onPress={onPress}
      // Holding a key (backspace) repeats it, as the system keyboard does.
      onLongPress={onHold && (() => (repeat.current = setInterval(onHold, 70)))}
      onPressOut={stop}
      style={({ pressed }) => ({
        // A key spanning columns also covers the gaps between them, so rows stay aligned.
        flexGrow: span,
        flexShrink: 1,
        flexBasis: (span - 1) * GAP,
        height,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.md,
        borderCurve: "continuous",
        backgroundColor: pressed ? c.border : tone === "digit" ? c.card : tone === "symbol" ? c.muted : "transparent",
        borderWidth: tone === "symbol" ? 0 : 1,
        borderColor: c.border,
        opacity: disabled ? 0.5 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}

const glyph = (text: string, size = 22) => (
  <Text weight="medium" style={{ fontSize: size, lineHeight: size + 6 }}>
    {text}
  </Text>
);
const word = (text: string) => (
  <Text weight="semibold" muted style={{ fontSize: 14 }}>
    {text}
  </Text>
);

/**
 * The app's own number pad, shown in place of the system keyboard for answers made of
 * digits: big keys with the sign, point and fraction bar always to hand, the extra
 * symbols this problem can need, and a switch to the system keyboard for letters.
 *
 * It is always four rows, so it never takes more of the question's room: one extra
 * symbol sits beside the 0, and several (a coordinate pair's comma and brackets) get a
 * fifth column.
 */
export function NumberPad({ extras, disabled, onKey, onBackspace, onSwitch }: { extras: AnswerKey[]; disabled?: boolean; onKey: (insert: string) => void; onBackspace: () => void; onSwitch: () => void }) {
  // Shorter keys on short screens (a small phone, an unfolded one), so the pad leaves the
  // question room; on an iPad or an unfolded phone the pad keeps a hand-sized width
  // instead of stretching across the screen.
  const { width, height } = useWindowDimensions();
  const wide = width >= 600;
  const short = height < 700;
  const H = wide ? (short ? 44 : 52) : short ? 40 : 46;
  const digit = (d: string, span = 1) => (
    <Key key={d} label={d} height={H} span={span} disabled={disabled} onPress={() => onKey(d)}>
      {glyph(d)}
    </Key>
  );
  const symbol = (label: string, insert: string, name: string, span = 1) => (
    <Key key={name} label={name} tone="symbol" height={H} span={span} disabled={disabled} onPress={() => onKey(insert)}>
      {glyph(label)}
    </Key>
  );
  const extra = (k: AnswerKey | undefined) => k && symbol(k.label, k.insert, k.accessibilityLabel);
  const column = extras.length > 1;
  // The fifth column's key for a row, or a gap that keeps the row's keys in line.
  const fifth = (i: number) => column && (extra(extras[i]) ?? <View style={{ flexGrow: 1, flexBasis: 0 }} />);
  const row = (children: ReactNode) => <View style={{ flexDirection: "row", gap: GAP }}>{children}</View>;
  return (
    <View style={{ gap: GAP, paddingHorizontal: 8, paddingTop: 2, paddingBottom: wide ? 12 : 6, width: "100%", maxWidth: 460, alignSelf: "center" }}>
      {row(
        <>
          {["1", "2", "3"].map((d) => digit(d))}
          <Key label="Delete" tone="symbol" height={H} disabled={disabled} onPress={onBackspace} onHold={onBackspace}>
            <Icon name="delete.left" size={22} />
          </Key>
          {fifth(0)}
        </>,
      )}
      {row(
        <>
          {["4", "5", "6"].map((d) => digit(d))}
          {symbol("−", "-", "Minus")}
          {fifth(1)}
        </>,
      )}
      {row(
        <>
          {["7", "8", "9"].map((d) => digit(d))}
          {symbol("/", "/", "Fraction bar")}
          {fifth(2)}
        </>,
      )}
      {row(
        <>
          <Key label="Switch to the letter keyboard" tone="switch" height={H} disabled={disabled} onPress={onSwitch}>
            {word("ABC")}
          </Key>
          {column ? (
            <>
              {digit("0", 2)}
              {symbol(".", ".", "Decimal point", extras[3] ? 1 : 2)}
              {extra(extras[3])}
            </>
          ) : extras[0] ? (
            <>
              {digit("0")}
              {extra(extras[0])}
              {symbol(".", ".", "Decimal point")}
            </>
          ) : (
            <>
              {digit("0", 2)}
              {symbol(".", ".", "Decimal point")}
            </>
          )}
        </>,
      )}
    </View>
  );
}

/** The row above the system keyboard: the maths symbols buried in it, and the way back to the number pad. */
export function AnswerKeys({ keys, disabled, onKey, onSwitch }: { keys: AnswerKey[]; disabled?: boolean; onKey: (insert: string) => void; onSwitch: () => void }) {
  return (
    <View style={{ flexDirection: "row", gap: GAP, paddingHorizontal: 16, paddingTop: 8 }}>
      {keys.map((k) => (
        <Key key={k.accessibilityLabel} label={k.accessibilityLabel} tone="symbol" height={40} disabled={disabled} onPress={() => onKey(k.insert)}>
          {glyph(k.label, 19)}
        </Key>
      ))}
      <Key label="Switch to the number pad" tone="switch" height={40} disabled={disabled} onPress={onSwitch}>
        {word("123")}
      </Key>
    </View>
  );
}
