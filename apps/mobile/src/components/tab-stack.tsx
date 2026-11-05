import { Stack } from "expo-router";
import { fonts, useTheme } from "@/lib/theme";

/** Each tab's own stack, with an iOS large title set in the web's display serif. iOS draws the bar's glass itself. */
export function TabStack({ title }: { title: string }) {
  const { c } = useTheme();
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
      <Stack.Screen name="index" options={{ title }} />
    </Stack>
  );
}
