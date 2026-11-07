import * as Haptics from "expo-haptics";
import { useCallback, useState, type ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import VisualView, { type VisualTarget } from "@/dom/visual-view";
import { Icon, Text } from "@/components/ui";
import { useTheme } from "@/lib/theme";

/**
 * A lesson or problem visual opened to fill the screen, where graphs can be
 * pinched to zoom and dragged to pan, and diagrams pinched larger. Its web view
 * scrolls itself (unlike the lesson's, which grows with its content).
 */
function VisualViewer({ target, onClose }: { target: VisualTarget | null; onClose: () => void }) {
  const { c, scheme } = useTheme();
  const [resetKey, setResetKey] = useState(0);
  const button = { width: 36, height: 36, borderRadius: 18, backgroundColor: c.muted, alignItems: "center", justifyContent: "center" } as const;
  return (
    <Modal visible={!!target} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose} supportedOrientations={["portrait", "landscape"]}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top", "bottom", "left", "right"]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 8 }}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close" style={button}>
            <Icon name="xmark" size={15} weight="bold" color={c.mutedForeground} />
          </Pressable>
          <Text variant="small" muted style={{ flex: 1, textAlign: "center" }}>
            Pinch to zoom · drag to move
          </Text>
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              setResetKey((k) => k + 1);
            }}
            hitSlop={12}
            accessibilityLabel="Reset zoom"
            style={button}
          >
            <Icon name="arrow.counterclockwise" size={15} weight="bold" color={c.mutedForeground} />
          </Pressable>
        </View>
        {target && (
          <VisualView
            key={JSON.stringify(target)}
            target={target}
            scheme={scheme}
            resetKey={resetKey}
            dom={{ scrollEnabled: true, bounces: false, style: { flex: 1, backgroundColor: "transparent" }, containerStyle: { flex: 1, backgroundColor: "transparent" } }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

/**
 * Opens visuals full screen. `open` goes to a DOM component's expand handler;
 * `viewer` is rendered alongside it.
 */
export function useVisualViewer(): { open: (target: VisualTarget) => void; viewer: ReactNode } {
  const [target, setTarget] = useState<VisualTarget | null>(null);
  const open = useCallback((t: VisualTarget) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTarget(t);
  }, []);
  return { open, viewer: <VisualViewer target={target} onClose={() => setTarget(null)} /> };
}
