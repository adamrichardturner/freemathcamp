import LessonContent from "@/dom/lesson-content";
import RichText from "@/dom/rich-text";
import { useTheme } from "@/lib/theme";

/**
 * Native wrappers for the DOM components: they take the screen's width, grow to
 * their content's height (matchContents would copy the width too, so a wide
 * formula would widen the view), never scroll themselves (the screen does), and
 * stay transparent over the theme.
 */
const dom = { matchContents: true, scrollEnabled: false, style: { backgroundColor: "transparent" }, containerStyle: { backgroundColor: "transparent", width: "100%" } } as const;

export function Lesson({ source, onReady }: { source: { kind: "lesson"; courseId: string; exerciseId: string } | { kind: "article"; slug: string }; onReady?: () => void }) {
  const { scheme } = useTheme();
  return <LessonContent source={source} scheme={scheme} dom={dom} onReady={onReady ? async () => onReady() : undefined} />;
}

export function Rich({ md, size, muted, onReady }: { md: string; size?: "sm" | "base" | "lg"; muted?: boolean; onReady?: () => void }) {
  const { scheme } = useTheme();
  return <RichText md={md} scheme={scheme} size={size} muted={muted} dom={dom} onReady={onReady ? async () => onReady() : undefined} />;
}

export { dom as domProps };
