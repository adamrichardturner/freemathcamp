import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { AccessibilityInfo, KeyboardAvoidingView, ScrollView, View } from "react-native";
import { Button, Field, IconChip, Input, Text } from "@/components/ui";
import { ApiError, api } from "@/lib/api";
import { widths } from "@/lib/layout";
import { useTheme } from "@/lib/theme";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sends a password reset link. The link opens the website, where the new
 * password is set; afterwards the learner signs in here with it.
 */
export default function ForgotPassword() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(typeof params.email === "string" ? params.email : "");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const send = useMutation({
    mutationFn: (address: string) => api.post<{ ok: true }>("/auth/forgot-password", { email: address }),
    onSuccess: () => AccessibilityInfo.announceForAccessibility("Check your email. If there's an account for that address, we've sent a reset link."),
    onError: (e) => {
      if (e instanceof ApiError && e.issues) setFieldError(e.issues[0]?.message ?? e.message);
    },
  });
  const go = () => {
    const address = email.trim();
    if (!EMAIL.test(address)) return setFieldError("Enter a valid email address.");
    if (!send.isPending) send.mutate(address);
  };
  const back = () => (router.canGoBack() ? router.back() : router.replace("/sign-in"));
  const error = send.error && !(send.error instanceof ApiError && send.error.issues) ? (send.error instanceof ApiError ? send.error.message : "Something went wrong. Please try again.") : null;

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 36, gap: 20, width: "100%", maxWidth: widths.form + 48, alignSelf: "center" }} keyboardShouldPersistTaps="handled">
        {send.isSuccess ? (
          <>
            <View style={{ alignItems: "center", gap: 12 }}>
              <IconChip name="envelope.badge" size={64} gradient />
              <Text variant="display" accessibilityRole="header" style={{ textAlign: "center" }}>
                Check your email
              </Text>
              <Text muted style={{ textAlign: "center" }}>
                If there&apos;s a FreeMathCamp account for <Text weight="semibold">{send.variables}</Text>, we&apos;ve sent it a link to choose a new password.
              </Text>
              <Text variant="small" muted style={{ textAlign: "center" }}>
                The link works once, for an hour, and opens freemathcamp.app on any device. Once you&apos;ve saved your new password, come back here and sign in with it. Nothing after a few minutes? Check your spam folder.
              </Text>
            </View>
            <Button title="Back to sign in" size="lg" onPress={back} />
            <Button title="Use a different email" variant="ghost" onPress={() => send.reset()} />
          </>
        ) : (
          <>
            <View style={{ alignItems: "center", gap: 6 }}>
              <Text variant="display" accessibilityRole="header" style={{ textAlign: "center" }}>
                Forgot your password?
              </Text>
              <Text variant="small" muted style={{ textAlign: "center" }}>
                Enter the email you sign in with and we&apos;ll send you a link to choose a new one.
              </Text>
            </View>
            {error && (
              <View style={{ borderRadius: 12, borderWidth: 1, borderColor: c.danger, padding: 12 }} accessibilityRole="alert" accessibilityLiveRegion="polite">
                <Text variant="small" tone="danger">
                  {error}
                </Text>
              </View>
            )}
            <View style={{ gap: 14 }} pointerEvents={send.isPending ? "none" : "auto"}>
              <Field label="Email" error={fieldError}>
                <Input
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setFieldError(null);
                  }}
                  accessibilityLabel="Email"
                  accessibilityHint={fieldError ?? undefined}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="username"
                  autoFocus={!email}
                  returnKeyType="send"
                  onSubmitEditing={go}
                  invalid={!!fieldError}
                />
              </Field>
              <Button title={send.isPending ? "Sending link…" : "Send reset link"} size="lg" loading={send.isPending} onPress={go} style={{ marginTop: 4 }} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 4 }}>
              <Text variant="small" muted>
                Remembered it?
              </Text>
              <Text variant="small" weight="semibold" tone="primary" onPress={back} accessibilityRole="button" suppressHighlighting>
                Sign in
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
