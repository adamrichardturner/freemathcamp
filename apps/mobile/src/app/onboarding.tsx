import { useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Switch, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { LearningModeCards } from "@/components/learning-mode";
import { Button, Card, Text } from "@/components/ui";
import { api, type User } from "@/lib/api";
import { registerPush } from "@/lib/push";
import { useApplyUser, useLeagueOptIn, useSession } from "@/lib/queries";
import { radius, useTheme } from "@/lib/theme";
import { useLayout, widths } from "@/lib/layout";

/** The web's three-step welcome tour, plus asking for notifications at the end. */
const STEPS = [
  {
    image: require("../../assets/images/step-1.png"),
    title: "Choose your path",
    text: "Foundations is a sequence of short lessons. Pick how you'd like to move through them. You can change it any time in Settings or on the course page.",
    choosesMode: true,
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
] as const;

export default function Onboarding() {
  const { c } = useTheme();
  const { user } = useSession();
  const { wide, medium, height } = useLayout();
  const applyUser = useApplyUser();
  const [step, setStep] = useState(0);
  const current = STEPS[step]!;
  const last = step === STEPS.length - 1;
  const hasExtra = "choosesMode" in current || "joinsLeague" in current;
  const finish = useMutation({
    mutationFn: async () => {
      // Record the tour as done first, so nothing about notifications can hold it
      // open (or bring it back next launch). Then ask for notifications; the
      // device-token step can stall (no network, simulator), so it doesn't hold
      // the tour for more than a moment once the learner has answered.
      const done = api.post<{ user: User }>("/me/onboarding/complete");
      done.catch(() => {});
      await Promise.race([registerPush({ ask: true }).catch(() => false), new Promise((r) => setTimeout(r, 4000))]);
      return done;
    },
    onSuccess: async ({ user }) => {
      await applyUser(user);
      if (router.canGoBack()) router.back();
    },
    onError: () => router.canGoBack() && router.back(),
  });

  // Portrait crops of the app's own screens (4:5). On a phone the image shrinks
  // on steps with a control under the text, so everything fits without scrolling
  // on most phones; on an iPad it sits beside the text instead.
  const imageHeight = wide ? Math.min(height * 0.62, 620) : Math.round(height * (hasExtra ? 0.27 : 0.4));

  const image = (
    <Image
      source={current.image}
      contentFit="cover"
      contentPosition="top"
      style={{ height: imageHeight, aspectRatio: 4 / 5, maxWidth: "100%", alignSelf: "center", borderRadius: radius["2xl"], borderCurve: "continuous", borderWidth: 1, borderColor: c.border, backgroundColor: c.muted }}
    />
  );
  const copy = (
    <View style={{ gap: 14, flex: wide ? 1 : undefined }}>
      <Text variant="caption" weight="semibold" tone="primary" style={{ textTransform: "uppercase", letterSpacing: 1 }}>
        Step {step + 1} of {STEPS.length}
      </Text>
      <Text variant="display" style={{ fontSize: wide ? 44 : 34, lineHeight: wide ? 48 : 38 }}>
        {current.title}
      </Text>
      <Text muted style={wide ? { fontSize: 17, lineHeight: 25 } : undefined}>
        {current.text}
      </Text>
      {"choosesMode" in current && user && <LearningModeCards mode={user.learningMode} row={medium && !wide} />}
      {"joinsLeague" in current && user && <LeagueJoin user={user} />}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8, gap: 16, width: "100%", maxWidth: wide ? widths.wide - 80 : widths.form + 48, alignSelf: "center" }}>
        <View style={{ flexDirection: "row", gap: 6, justifyContent: "center" }}>
          {STEPS.map((s, i) => (
            <View key={s.title} style={{ height: 6, width: i === step ? 28 : 6, borderRadius: 3, backgroundColor: i <= step ? c.primary : c.muted, opacity: i < step ? 0.45 : 1 }} />
          ))}
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: wide ? "center" : "flex-start" }} showsVerticalScrollIndicator={false} bounces={false}>
          <Animated.View key={step} entering={FadeIn.duration(300)} exiting={FadeOut.duration(150)} style={{ flexDirection: wide ? "row" : "column", alignItems: wide ? "center" : "stretch", gap: wide ? 48 : 18 }}>
            {/* On short screens (the folded iPhone Duo, smaller iPhones) a step with a control keeps the room for it. */}
            {(wide || !hasExtra || height >= 760) && image}
            {copy}
          </Animated.View>
        </ScrollView>
        <View style={{ flexDirection: "row", gap: 10, justifyContent: medium ? "flex-end" : "flex-start" }}>
          {step > 0 && <Button title="Back" variant="outline" size="lg" style={medium ? { minWidth: 140 } : { flex: 1 }} onPress={() => setStep(step - 1)} />}
          <Button
            title={last ? "Start learning" : "Next"}
            iconRight={last ? undefined : "arrow.right"}
            size="lg"
            style={medium ? { minWidth: 220 } : { flex: 2 }}
            loading={finish.isPending}
            onPress={() => (last ? finish.mutate() : setStep(step + 1))}
          />
        </View>
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
