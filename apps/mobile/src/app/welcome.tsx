import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { SocialSignIn } from "@/components/social-sign-in";
import { Button, Icon, Text } from "@/components/ui";
import { course, graph } from "@/lib/course";
import { alpha, fonts, useTheme } from "@/lib/theme";
import { useLayout, widths } from "@/lib/layout";

/** The landing page, phone-sized: what FreeMathCamp is, and the ways in. */
export default function Welcome() {
  const { c } = useTheme();
  const { medium, short } = useLayout();
  // Held sideways on the open iPhone Duo (or an iPad in a short window) there's no
  // height for a stack, so the pitch and the ways in sit side by side.
  const sideBySide = medium && short;
  const points = [`${course.units.length} units`, `${graph.refs.length} lessons`, "Unlimited practice", "Free, no ads"];
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <LinearGradient colors={[alpha(c.primary, 0.22), alpha(c.chart2, 0.08), alpha(c.background, 0)]} locations={[0, 0.45, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 520 }} />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            flexDirection: sideBySide ? "row" : "column",
            alignItems: sideBySide ? "center" : "stretch",
            justifyContent: medium ? "center" : "space-between",
            gap: sideBySide ? 56 : medium ? 48 : 24,
            width: "100%",
            maxWidth: sideBySide ? widths.form * 2 + 56 : widths.form + 80,
            alignSelf: "center",
          }}
        >
          <Animated.View entering={FadeInDown.duration(500)} style={{ gap: 18, paddingTop: sideBySide ? 16 : 40, flex: sideBySide ? 1 : undefined }}>
            <Image source={require("../../assets/images/logo-mark.png")} style={{ width: 64, height: 64 }} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: alpha(c.card, 0.7), paddingHorizontal: 10, paddingVertical: 5 }}>
              <Icon name="sparkles" size={12} tone="primary" />
              <Text variant="caption" weight="medium">
                FreeMathCamp · adaptive · beautifully visual
              </Text>
            </View>
            <Text style={{ fontFamily: fonts.display, fontSize: 50, lineHeight: 52, letterSpacing: -0.5 }}>
              All the maths you need <Text style={{ fontFamily: fonts.displayItalic, fontSize: 50, lineHeight: 52, color: c.primary }}>before</Text> calculus.
            </Text>
            <Text muted style={{ fontSize: 17, lineHeight: 25 }}>
              {graph.refs.length} connected lessons, from place value to your first limits, with interactive visuals and practice that adapts to you.
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {points.map((p) => (
                <View key={p} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Icon name="checkmark" size={13} tone="success" weight="bold" />
                  <Text variant="small" muted>
                    {p}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(150).duration(500)} style={{ gap: 10, paddingBottom: 12, flex: sideBySide ? 1 : undefined, maxWidth: sideBySide ? widths.form : undefined }}>
            <SocialSignIn />
            <Button title="Create an account" size="lg" onPress={() => router.push("/sign-up")} />
            <Button title="I already have an account" variant="ghost" size="lg" onPress={() => router.push("/sign-in")} />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
