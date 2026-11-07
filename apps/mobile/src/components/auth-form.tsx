import { useMutation } from "@tanstack/react-query";
import { useRef, useState, type ComponentRef } from "react";
import { KeyboardAvoidingView, ScrollView, TextInput, View } from "react-native";
import { ApiError, api, type SignedIn } from "@/lib/api";
import { useCompleteSignIn } from "@/lib/queries";
import { useTheme } from "@/lib/theme";
import { SocialSignIn } from "./social-sign-in";
import { Button, Field, Input, Text } from "./ui";
import { UsernameField, useUsernameCheck } from "./username-field";
import { widths } from "@/lib/layout";

/** Email sign-in and sign-up, as on the web, with Apple and Google above. */
export function AuthForm({ mode, onSwitch }: { mode: "login" | "register"; onSwitch: () => void }) {
  const { c } = useTheme();
  const complete = useCompleteSignIn();
  const [form, setForm] = useState({ displayName: "", username: "", email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const usernameCheck = useUsernameCheck(form.username);
  const email = useRef<ComponentRef<typeof TextInput>>(null);
  const password = useRef<ComponentRef<typeof TextInput>>(null);

  const submit = useMutation({
    mutationFn: () =>
      api.post<SignedIn>(mode === "login" ? "/auth/login" : "/auth/register", mode === "login" ? { email: form.email.trim(), password: form.password } : { ...form, email: form.email.trim(), username: form.username.trim() }),
    onSuccess: complete,
    onError: (e) => {
      if (e instanceof ApiError && e.issues) setErrors(Object.fromEntries(e.issues.map((i) => [i.path, i.message])));
    },
  });
  const error = submit.error && !(submit.error instanceof ApiError && submit.error.issues) ? (submit.error instanceof ApiError ? submit.error.message : "Something went wrong.") : null;
  const busy = submit.isPending || submit.isSuccess;
  const set = (k: keyof typeof form) => (v: string) => {
    setForm({ ...form, [k]: v });
    setErrors(({ [k]: _, ...rest }) => rest);
  };
  const go = () => !busy && submit.mutate();

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 36, gap: 20, width: "100%", maxWidth: widths.form + 48, alignSelf: "center" }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", gap: 6 }}>
          <Text variant="display">{mode === "login" ? "Welcome back" : "Start learning"}</Text>
          <Text variant="small" muted>
            {mode === "login" ? "Pick up right where you left off." : "Free forever. Your progress is saved as you go."}
          </Text>
        </View>
        {error && (
          <View style={{ borderRadius: 12, borderWidth: 1, borderColor: c.danger, padding: 12 }}>
            <Text variant="small" tone="danger">
              {error}
            </Text>
          </View>
        )}
        <SocialSignIn />
        <View style={{ gap: 14 }} pointerEvents={busy ? "none" : "auto"}>
          {mode === "register" && (
            <>
              <Field label="Your name" error={errors.displayName}>
                <Input value={form.displayName} onChangeText={set("displayName")} autoComplete="name" textContentType="name" maxLength={60} returnKeyType="next" invalid={!!errors.displayName} />
              </Field>
              <UsernameField
                value={form.username}
                onChange={set("username")}
                check={usernameCheck}
                serverError={errors.username ?? (submit.error instanceof ApiError && submit.error.status === 409 && /username/i.test(submit.error.message) ? submit.error.message : null)}
              />
            </>
          )}
          <Field label="Email" error={errors.email}>
            <Input
              ref={email}
              value={form.email}
              onChangeText={set("email")}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType={mode === "login" ? "username" : "emailAddress"}
              returnKeyType="next"
              onSubmitEditing={() => password.current?.focus()}
              invalid={!!errors.email}
            />
          </Field>
          <Field label="Password" error={errors.password} hint={mode === "register" ? "At least 10 characters, with letters and a number or symbol." : undefined}>
            <Input
              ref={password}
              value={form.password}
              onChangeText={set("password")}
              secureTextEntry
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              textContentType={mode === "login" ? "password" : "newPassword"}
              returnKeyType="go"
              onSubmitEditing={go}
              invalid={!!errors.password}
            />
          </Field>
          <Button title={busy ? (mode === "login" ? "Signing in…" : "Creating your account…") : mode === "login" ? "Sign in" : "Create account"} size="lg" loading={busy} onPress={go} style={{ marginTop: 4 }} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 4 }}>
          <Text variant="small" muted>
            {mode === "login" ? "New here?" : "Already have an account?"}
          </Text>
          <Text variant="small" weight="semibold" tone="primary" onPress={onSwitch} suppressHighlighting>
            {mode === "login" ? "Create an account" : "Sign in"}
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
