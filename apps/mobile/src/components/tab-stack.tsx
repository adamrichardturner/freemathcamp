import { Stack } from "expo-router";
import { useLayout } from "@/lib/layout";
import { fonts, useTheme } from "@/lib/theme";

/**
 * Each tab's own stack, with an iOS large title set in the web's display serif.
 * iOS draws the bar's glass itself. On an iPad the content is a centred column,
 * so the left-aligned large title would sit outside it; there the bar keeps only
 * its buttons and the screen draws the title in its column (Screen's `title`).
 */
export function TabStack({ title }: { title: string }) {
  const { c } = useTheme();
  const { wide } = useLayout();
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerTintColor: c.primary,
        headerLargeTitleStyle: { fontFamily: fonts.display, fontSize: 40, color: c.foreground },
        headerTitleStyle: { fontFamily: fonts.semibold, color: c.foreground },
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: c.background },
      }}
    >
      <Stack.Screen name="index" options={wide ? { title: "", headerLargeTitle: false } : { title }} />
    </Stack>
  );
}
