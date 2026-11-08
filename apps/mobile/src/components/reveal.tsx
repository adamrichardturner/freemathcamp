import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Reanimated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Button, Empty } from "@/components/ui";
import { useTheme } from "@/lib/theme";

/** How long the content must hold its size before we call it painted. */
const QUIET_MS = 180;
/** Never hold the skeleton longer than this, whatever is still settling. */
const MAX_MS = 5000;

type Gate = { hold: () => () => void };
const RevealGate = createContext<Gate | null>(null);

/**
 * Holds the nearest <Reveal> until the returned callback runs (or this unmounts). For
 * pieces that size themselves after mounting: web views, a card with its own query.
 */
export function useRevealHold() {
  const gate = useContext(RevealGate);
  const release = useRef<(() => void) | null>(null);
  const fired = useRef(false);
  useEffect(() => {
    if (!gate || fired.current) return;
    const r = gate.hold();
    release.current = r;
    return () => {
      r();
      release.current = null;
    };
  }, [gate]);
  return useCallback(() => {
    fired.current = true;
    release.current?.();
    release.current = null;
  }, []);
}

/** Holds the nearest <Reveal> for as long as this component is mounted (a nested skeleton). */
export function useRevealPending() {
  useRevealHold();
}

/**
 * Shows `skeleton` until `children` are ready *and* laid out, then fades the content in
 * without moving it. Once `ready`, the content mounts invisibly under the skeleton, and
 * the reveal waits for every web view inside to report it has rendered, every nested
 * skeleton to resolve, and the content's size to stop changing.
 */
export function Reveal({
  error,
  onRetry,
  ...props
}: { ready: boolean; skeleton: ReactNode; children: ReactNode; gap?: number; style?: StyleProp<ViewStyle>; error?: boolean; onRetry?: () => void }) {
  // A load that failed for good says so, rather than leaving a skeleton pulsing forever.
  if (error && !props.ready)
    return (
      <Reanimated.View entering={FadeIn.duration(250)}>
        <Empty icon="icloud.slash" title="We couldn't load this" text="Something went wrong on our side or the connection dropped. Your progress is safe.">
          {onRetry && <Button title="Try again" icon="arrow.clockwise" variant="outline" size="sm" onPress={onRetry} style={{ marginTop: 4 }} />}
        </Empty>
      </Reanimated.View>
    );
  return <RevealContent {...props} />;
}

function RevealContent({ ready, skeleton, children, gap, style }: { ready: boolean; skeleton: ReactNode; children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const [holds, setHolds] = useState(0);
  const [painted, setPainted] = useState(false);
  const [layouts, setLayouts] = useState(0);
  const mounted = children !== null && children !== undefined && children !== false;
  // A Reveal inside another holds its parent until it has painted too.
  const releaseParent = useRevealHold();

  const gate = useMemo<Gate>(
    () => ({
      hold: () => {
        let done = false;
        setHolds((h) => h + 1);
        return () => {
          if (done) return;
          done = true;
          setHolds((h) => h - 1);
        };
      },
    }),
    [],
  );

  useEffect(() => {
    if (!ready || painted) return;
    const cap = setTimeout(() => setPainted(true), MAX_MS);
    return () => clearTimeout(cap);
  }, [ready, painted]);

  // Every layout pass restarts the quiet window; holds pause it entirely.
  useEffect(() => {
    if (!ready || painted || holds > 0) return;
    const quiet = setTimeout(() => setPainted(true), QUIET_MS);
    return () => clearTimeout(quiet);
  }, [ready, painted, holds, layouts]);

  const opacity = useSharedValue(0);
  useEffect(() => {
    if (!painted) return;
    opacity.value = withTiming(1, { duration: 260 });
    releaseParent();
  }, [painted, opacity, releaseParent]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={style}>
      {!painted && (
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ gap }, mounted && { position: "absolute", top: 0, left: 0, right: 0, zIndex: 1, backgroundColor: c.background }]}>
          {skeleton}
        </View>
      )}
      <RevealGate.Provider value={gate}>
        <Reanimated.View
          pointerEvents={painted ? "auto" : "none"}
          accessibilityElementsHidden={!painted}
          importantForAccessibility={painted ? "auto" : "no-hide-descendants"}
          onLayout={painted ? undefined : () => setLayouts((n) => n + 1)}
          style={[{ gap }, fade]}
        >
          {children}
        </Reanimated.View>
      </RevealGate.Provider>
    </View>
  );
}
