import { NativeTabs } from "expo-router/native-tabs";
import { useLeague, useSession } from "@/lib/queries";
import { useTheme } from "@/lib/theme";

/** The app's sections, as the web's header nav: Learn, Course, Leagues, Progress and Settings. */
export default function TabsLayout() {
  const { c } = useTheme();
  const { user } = useSession();
  const league = useLeague(!!user?.leagueOptIn);
  const rank = league.data?.cohort?.rank;
  return (
    <NativeTabs tintColor={c.primary} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Label>Learn</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="course">
        <NativeTabs.Trigger.Label>Course</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "map", selected: "map.fill" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="leagues">
        <NativeTabs.Trigger.Label>Leagues</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "trophy", selected: "trophy.fill" }} />
        {rank ? <NativeTabs.Trigger.Badge>{`#${rank}`}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress">
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "chart.bar", selected: "chart.bar.fill" }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
