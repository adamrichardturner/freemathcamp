import * as AppleAuthentication from "expo-apple-authentication";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { SignedIn } from "@/lib/api";
import { useCompleteSignIn, useProviders } from "@/lib/queries";
import { appleAvailable, googleConfigured, signInWithApple, signInWithGoogle } from "@/lib/social";
import { radius, useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { Text } from "./ui";

/**
 * Sign in with Apple and Google. Apple's own button is required by its
 * guidelines; Google's follows Google's branding. Both create the account on
 * first use, so the same buttons serve sign-in and sign-up.
 */
export function SocialSignIn() {
  const { scheme, c } = useTheme();
  const complete = useCompleteSignIn();
  const providers = useProviders();
  const [apple, setApple] = useState(false);
  const [busy, setBusy] = useState<"apple" | "google" | null>(null);
  useEffect(() => void appleAvailable().then(setApple), []);

  const run = async (which: "apple" | "google", f: () => Promise<SignedIn | null>) => {
    if (busy) return;
    setBusy(which);
    try {
      const r = await f();
      if (r) await complete(r);
    } catch (e) {
      toast.error(e, `${which === "apple" ? "Apple" : "Google"} sign-in didn't work. Please try again.`);
    } finally {
      setBusy(null);
    }
  };

  const showGoogle = googleConfigured && providers.data?.google !== false;
  if (!apple && !showGoogle) return null;
  return (
    <View style={{ gap: 10, opacity: busy ? 0.7 : 1 }} pointerEvents={busy ? "none" : "auto"}>
      {apple && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
          buttonStyle={scheme === "dark" ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={radius.xl}
          style={{ height: 52 }}
          onPress={() => run("apple", signInWithApple)}
        />
      )}
      {showGoogle && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          onPress={() => run("google", signInWithGoogle)}
          style={({ pressed }) => ({
            height: 52,
            borderRadius: radius.xl,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: scheme === "dark" ? "#8e918f" : "#747775",
            backgroundColor: scheme === "dark" ? "#131314" : "#ffffff",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <GoogleG />
          <Text weight="semibold" style={{ color: scheme === "dark" ? "#e3e3e3" : "#1f1f1f", fontSize: 18 }}>
            Continue with Google
          </Text>
        </Pressable>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 6 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
        <Text variant="caption" muted>
          or with email
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
      </View>
    </View>
  );
}

function GoogleG() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}
