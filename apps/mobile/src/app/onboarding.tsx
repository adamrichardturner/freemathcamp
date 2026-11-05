import { useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { Switch, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, Text } from "@/components/ui";
import { api, type User } from "@/lib/api";
import { registerPush } from "@/lib/push";
import { useApplyUser, useLeagueOptIn, useSession } from "@/lib/queries";
import { radius, useTheme } from "@/lib/theme";

/** The web's three-step welcome tour, plus asking for notifications at the end. */
const STEPS = [
  {
    image: require("../../assets/images/step-1.png"),
    title: "Choose your path",
    text: "Foundations is a sequence of short lessons. Path mode (recommended) unlocks each one when you finish a practice session on the one before it; Audit mode opens everything so you can explore in any order. You can change this any time in Settings or on the course page.",
  },
  {
    image: require("../../assets/images/step-2.png"),
    title: "Learn, then practise",
    text: "Each lesson explains the idea with visuals and worked examples. Then practise: problems adapt to you, getting harder as you improve and gentler when you struggle. Use hints whenever you're stuck.",
  },
  {
    image: require("../../assets/images/step-3.png"),
    title: "Let the plan guide you",
    text: "Your plan for each day mixes reviews that are due, challenges on tricky topics and your next new lesson. For a little friendly competition, you're in the weekly leagues: every problem you solve earns XP. Others only ever see your username.",
    joinsLeague: true,
  },
];

export default function Onboarding() {
  const { c } = useTheme();
  const { user } = useSession();
  const applyUser = useApplyUser();
  const [step, setStep] = useState(0);
  const current = STEPS[step]!;
  const last = step === STEPS.length - 1;
  const finish = useMutation({
    mutationFn: async () => {
      await registerPush({ ask: true }).catch(() => false);
      return api.post<{ user: User }>("/me/onboarding/complete");
    },
    onSuccess: async ({ user }) => {
      await applyUser(user);
      router.back();
    },
    onError: () => router.back(),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background, padding: 24, gap: 20 }}>
      <View style={{ flexDirection: "row", gap: 6, justifyContent: "center" }}>
        {STEPS.map((s, i) => (
          <View key={s.title} style={{ height: 6, width: i === step ? 28 : 6, borderRadius: 3, backgroundColor: i === step ? c.primary : c.muted }} />
        ))}
      </View>
      <Animated.View key={step} entering={FadeIn.duration(300)} exiting={FadeOut.duration(150)} style={{ flex: 1, gap: 18 }}>
        <Image source={current.image} contentFit="cover" style={{ width: "100%", aspectRatio: 16 / 10, borderRadius: radius["2xl"], borderWidth: 1, borderColor: c.border }} />
        <Text variant="display" style={{ fontSize: 34, lineHeight: 38 }}>
          {current.title}
        </Text>
        <Text muted>{current.text}</Text>
        {current.joinsLeague && user && <LeagueJoin user={user} />}
      </Animated.View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {step > 0 && <Button title="Back" variant="outline" size="lg" style={{ flex: 1 }} onPress={() => setStep(step - 1)} />}
        <Button title={last ? "Start learning" : "Next"} iconRight={last ? undefined : "arrow.right"} size="lg" style={{ flex: 2 }} loading={finish.isPending} onPress={() => (last ? finish.mutate() : setStep(step + 1))} />
      </View>
    </SafeAreaView>
  );
}

function LeagueJoin({ user }: { user: User }) {
  const { c } = useTheme();
  const optIn = useLeagueOptIn();
  return (
    <Card style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="small" weight="medium">
          Compete in the weekly leagues
        </Text>
        <Text variant="caption" muted>
          As @{user.username}. You can change this any time.
        </Text>
      </View>
      <Switch value={optIn.isPending ? optIn.variables : user.leagueOptIn} disabled={optIn.isPending} onValueChange={(on) => optIn.mutate(on)} trackColor={{ true: c.primary }} />
    </Card>
  );
}
