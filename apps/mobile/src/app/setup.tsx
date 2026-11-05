import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppState, KeyboardAvoidingView, ScrollView, View } from "react-native";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, IconChip, Text } from "@/components/ui";
import { UsernameField, suggestUsername, useUsernameCheck } from "@/components/username-field";
import { ApiError, api, type User } from "@/lib/api";
import { keys, useApplyUser, useSession, useSignOut } from "@/lib/queries";
import { useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";

/**
 * Between sign-in and the app: confirm the email (practice needs it), then pick
 * the username leagues show. Google and Apple accounts arrive verified.
 */
export default function Setup() {
  const { user } = useSession();
  const { c } = useTheme();
  if (!user) return null;
  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: c.background }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24, gap: 20 }} keyboardShouldPersistTaps="handled">
          {!user.emailVerified ? <VerifyEmail user={user} /> : <ChooseUsername user={user} />}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function VerifyEmail({ user }: { user: User }) {
  const qc = useQueryClient();
  const signOut = useSignOut();
  const [checking, setChecking] = useState(false);
  const resend = useMutation({
    mutationFn: () => api.post<{ sent: boolean; alreadyVerified: boolean }>("/auth/resend-verification"),
    onSuccess: (r) => (r.alreadyVerified ? void qc.invalidateQueries({ queryKey: keys.me }) : toast.success("Sent. Check your inbox.")),
    onError: (e) => toast.error(e, "Couldn't send the email."),
  });
  const check = async () => {
    setChecking(true);
    const fresh = await qc.fetchQuery({ queryKey: keys.me, queryFn: () => api.get<{ user: User | null }>("/auth/me").then((r) => r.user), staleTime: 0 }).catch(() => null);
    setChecking(false);
    if (fresh && !fresh.emailVerified) toast.info("Not confirmed yet. Open the link in the email, then try again.");
  };
  // Coming back from Mail is the usual moment the link has been opened.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => s === "active" && void qc.invalidateQueries({ queryKey: keys.me }));
    return () => sub.remove();
  }, [qc]);

  return (
    <View style={{ gap: 20 }}>
      <IconChip name="envelope.badge.fill" size={56} />
      <View style={{ gap: 8 }}>
        <Text variant="display">Confirm your email</Text>
        <Text muted>
          We sent a link to <Text weight="semibold">{user.email}</Text>. Open it on this phone or any device, and practice, progress and your daily plan unlock.
        </Text>
      </View>
      <Button title="I've confirmed it" size="lg" loading={checking} onPress={check} />
      <Button title="Resend email" variant="outline" loading={resend.isPending} onPress={() => resend.mutate()} />
      <Button title="Use a different account" variant="ghost" loading={signOut.isPending} onPress={() => signOut.mutate()} />
    </View>
  );
}

function ChooseUsername({ user }: { user: User }) {
  const applyUser = useApplyUser();
  const [value, setValue] = useState(() => suggestUsername(user.email));
  const check = useUsernameCheck(value);
  const save = useMutation({
    mutationFn: () => api.patch<{ user: User }>("/me/username", { username: value.trim() }),
    onSuccess: ({ user }) => applyUser(user),
  });
  const serverError = save.error instanceof ApiError ? save.error.message : save.error ? "Couldn't save your username." : null;
  return (
    <View style={{ gap: 20 }}>
      <IconChip name="at" size={56} />
      <View style={{ gap: 8 }}>
        <Text variant="display">Pick a username</Text>
        <Text muted>It's how you appear in the weekly leagues, and the only thing other learners ever see. You can change it later in Settings.</Text>
      </View>
      <Card style={{ padding: 16 }}>
        <UsernameField value={value} onChange={setValue} check={check} serverError={serverError} />
      </Card>
      <Button title="Continue" size="lg" loading={save.isPending || save.isSuccess} disabled={check.status === "invalid" || check.status === "taken" || check.status === "empty"} onPress={() => save.mutate()} />
    </View>
  );
}
