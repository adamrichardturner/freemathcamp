import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Application from "expo-application";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState, type ReactNode } from "react";
import { Alert, Appearance, Linking, Platform, Share, Switch, View, useColorScheme } from "react-native";
import { MODE_META, useSetLearningMode } from "@/components/learning-mode";
import { Segmented } from "@/components/segmented";
import { Button, Card, Field, Icon, IconChip, Input, Row, Screen, Separator, Text, type SymbolName } from "@/components/ui";
import { UsernameField, useUsernameCheck } from "@/components/username-field";
import { saveAppearance, type AppearancePref } from "@/lib/appearance";
import { ApiError, WEB_URL, api, type User } from "@/lib/api";
import { COURSE_ID } from "@/lib/course";
import { pushPermission, registerPush, unregisterPush } from "@/lib/push";
import { keys, useAccountSettings, useApplyUser, useInvalidateLearner, useLeagueOptIn, usePreferences, useSession, useSignOut } from "@/lib/queries";
import { loadAppearance } from "@/lib/appearance";
import { alpha, useTheme } from "@/lib/theme";
import { toast } from "@/lib/toast";
import { useLayout } from "@/lib/layout";

/** The web's settings page, grouped the iOS way. */
/** What to call the device in settings copy. */
const DEVICE = Platform.OS === "ios" && Platform.isPad ? "iPad" : "iPhone";

export default function Settings() {
  const { user } = useSession();
  const settings = useAccountSettings();
  if (!user) return null;
  return (
    <Screen title="Settings">
      <Profile user={user} />
      <Course user={user} />
      <AppearanceGroup />
      <Notifications user={user} />
      <Leagues user={user} />
      <Security user={user} linked={settings.data?.security.linkedProviders ?? []} otherSessions={settings.data?.security.otherSessions ?? 0} />
      <Data user={user} />
      <About />
    </Screen>
  );
}

function Group({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      {title && (
        <Text variant="label" muted style={{ paddingHorizontal: 16 }}>
          {title}
        </Text>
      )}
      <Card>{children}</Card>
      {footer && (
        <Text variant="caption" muted style={{ paddingHorizontal: 16 }}>
          {footer}
        </Text>
      )}
    </View>
  );
}

function ToggleRow({ icon, title, subtitle, value, onChange, disabled }: { icon: SymbolName; title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const { c } = useTheme();
  return <Row leading={<IconChip name={icon} size={30} />} title={title} subtitle={subtitle} right={<Switch value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: c.primary }} />} />;
}

function Profile({ user }: { user: User }) {
  const { fit } = useLayout();
  const { c } = useTheme();
  const applyUser = useApplyUser();
  const [name, setName] = useState(user.displayName);
  const [username, setUsername] = useState(user.username ?? "");
  const check = useUsernameCheck(username, user.username);
  const saveName = useMutation({
    mutationFn: () => api.patch<{ user: User }>("/me/profile", { displayName: name.trim() }),
    onSuccess: async ({ user }) => {
      await applyUser(user);
      toast.success("Name updated");
    },
    onError: (e) => toast.error(e, "Couldn't update your name."),
  });
  const saveUsername = useMutation({
    mutationFn: () => api.patch<{ user: User }>("/me/username", { username: username.trim() }),
    onSuccess: async ({ user }) => {
      await applyUser(user);
      toast.success("Username updated");
    },
  });
  const initials = user.displayName
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <Group title="Profile">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: alpha(c.primary, 0.15), alignItems: "center", justifyContent: "center" }}>
          <Text weight="semibold" tone="primary" style={{ fontSize: 19 }}>
            {initials}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text weight="semibold">{user.displayName}</Text>
          <Text variant="small" muted>
            {user.email} {user.emailVerified ? "· verified" : "· not verified"}
          </Text>
        </View>
      </View>
      <Separator />
      <View style={{ padding: 16, gap: 14 }}>
        <Field label="Display name">
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Input value={name} onChangeText={setName} maxLength={60} style={{ flex: 1 }} returnKeyType="done" onSubmitEditing={() => name.trim() !== user.displayName && saveName.mutate()} />
            {name.trim() !== user.displayName && name.trim() && <Button title="Save" loading={saveName.isPending} onPress={() => saveName.mutate()} style={{ height: 48 }} />}
          </View>
        </Field>
        <UsernameField value={username} onChange={setUsername} check={check} serverError={saveUsername.error instanceof ApiError ? saveUsername.error.message : null} />
        {check.status === "available" && <Button title="Save username" loading={saveUsername.isPending} style={fit(220)} onPress={() => saveUsername.mutate()} />}
      </View>
    </Group>
  );
}

function Course({ user }: { user: User }) {
  const setMode = useSetLearningMode();
  const prefs = usePreferences();
  const goal = prefs.isPending && prefs.variables?.dailyGoal ? prefs.variables.dailyGoal : user.dailyGoal;
  return (
    <Group title="Course" footer="Your daily goal counts problems solved each day.">
      {(["path", "audit"] as const).map((m, i) => (
        <View key={m}>
          {i > 0 && <Separator inset={58} />}
          <Row
            leading={<IconChip name={MODE_META[m].icon} size={30} />}
            title={MODE_META[m].label}
            subtitle={MODE_META[m].short}
            right={user.learningMode === m ? <Icon name="checkmark" size={16} tone="primary" weight="bold" /> : undefined}
            chevron={false}
            onPress={() => user.learningMode !== m && setMode.confirm(m)}
          />
        </View>
      ))}
      <Separator inset={58} />
      <Row
        leading={<IconChip name="target" size={30} tone="info" />}
        title="Daily goal"
        subtitle={`${goal} problems a day`}
        chevron={false}
        right={
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Button variant="secondary" size="sm" icon="minus" disabled={goal <= 1} onPress={() => prefs.mutate({ dailyGoal: Math.max(1, goal - (goal > 10 ? 5 : 1)) })} />
            <Button variant="secondary" size="sm" icon="plus" disabled={goal >= 100} onPress={() => prefs.mutate({ dailyGoal: Math.min(100, goal + (goal >= 10 ? 5 : 1)) })} />
          </View>
        }
      />
      <Separator inset={58} />
      <Row leading={<IconChip name="sparkles" size={30} tone="chart2" />} title="Replay the welcome tour" onPress={() => router.push("/onboarding")} />
    </Group>
  );
}

function AppearanceGroup() {
  const system = useColorScheme();
  const [pref, setPref] = useState<AppearancePref>("system");
  useEffect(() => void loadAppearance().then((s) => setPref(s ?? "system")), []);
  return (
    <Group title="Appearance" footer={pref === "system" ? `Following your ${DEVICE} (${system === "dark" ? "dark" : "light"} now).` : undefined}>
      <View style={{ padding: 12 }}>
        <Segmented
          value={pref}
          onChange={(p) => {
            setPref(p);
            void saveAppearance(p);
            Appearance.setColorScheme(p === "system" ? "unspecified" : p);
          }}
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </View>
    </Group>
  );
}

function Notifications({ user }: { user: User }) {
  const prefs = usePreferences();
  const [push, setPush] = useState<boolean | null>(null);
  useEffect(() => void pushPermission().then((s) => setPush(s === "granted")), []);
  const value = (k: "reminders" | "progress" | "emailReminders") => {
    const key = { reminders: "notifyReminders", progress: "notifyProgress", emailReminders: "notifyEmailReminders" }[k] as "notifyReminders" | "notifyProgress" | "notifyEmailReminders";
    return prefs.isPending && prefs.variables?.[key] !== undefined ? !!prefs.variables[key] : user.notifications[k];
  };
  const togglePush = async (on: boolean) => {
    if (on) {
      const ok = await registerPush({ ask: true }).catch(() => false);
      if (!ok) {
        Alert.alert("Notifications are off", "Turn on notifications for FreeMathCamp in iOS Settings to get reminders and milestones.", [
          { text: "Not now", style: "cancel" },
          { text: "Open Settings", onPress: () => void Linking.openSettings() },
        ]);
      }
      setPush(ok);
    } else {
      await unregisterPush().catch(() => {});
      setPush(false);
    }
  };
  return (
    <Group title="Notifications" footer="Account and security notices are always sent. Reminders arrive at most once a day, between 9am and 8pm your time.">
      <ToggleRow icon="bell.badge.fill" title={`Push on this ${DEVICE}`} value={!!push} onChange={(on) => void togglePush(on)} disabled={push === null} />
      <Separator inset={58} />
      <ToggleRow icon="star.fill" title="Progress and milestones" subtitle="Lessons mastered, streaks, daily goal" value={value("progress")} onChange={(on) => prefs.mutate({ notifyProgress: on })} />
      <Separator inset={58} />
      <ToggleRow icon="clock.fill" title="Practice reminders" subtitle="Reviews due, streak at risk" value={value("reminders")} onChange={(on) => prefs.mutate({ notifyReminders: on })} />
      <Separator inset={58} />
      <ToggleRow icon="envelope.fill" title="Reminder emails" subtitle="Weekly summary and come-back nudges" value={value("emailReminders")} onChange={(on) => prefs.mutate({ notifyEmailReminders: on })} />
    </Group>
  );
}

function Leagues({ user }: { user: User }) {
  const optIn = useLeagueOptIn();
  return (
    <Group title="Leagues" footer={`Others see only @${user.username ?? "your username"} and your XP.`}>
      <ToggleRow icon="trophy.fill" title="Compete in weekly leagues" value={optIn.isPending ? !!optIn.variables : user.leagueOptIn} disabled={optIn.isPending} onChange={(on) => optIn.mutate(on)} />
    </Group>
  );
}

function Security({ user, linked, otherSessions }: { user: User; linked: string[]; otherSessions: number }) {
  const { fit } = useLayout();
  const qc = useQueryClient();
  const applyUser = useApplyUser();
  const [form, setForm] = useState({ current: "", next: "" });
  const [open, setOpen] = useState(false);
  const password = useMutation({
    mutationFn: () => api.post<{ user: User; signedOutSessions: number }>("/me/password", { ...(user.hasPassword ? { currentPassword: form.current } : {}), newPassword: form.next }),
    onSuccess: async (r) => {
      await applyUser(r.user);
      setForm({ current: "", next: "" });
      setOpen(false);
      toast.success(user.hasPassword ? "Password changed" : "Password added");
    },
  });
  const revoke = useMutation({
    mutationFn: () => api.post<{ signedOutSessions: number }>("/me/sessions/revoke-others"),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: keys.settings });
      toast.success(r.signedOutSessions ? `Signed out ${r.signedOutSessions} other device${r.signedOutSessions > 1 ? "s" : ""}` : "No other devices were signed in");
    },
    onError: (e) => toast.error(e, "Couldn't sign out other devices."),
  });
  const pwError = password.error instanceof ApiError ? (password.error.issues?.[0]?.message ?? password.error.message) : null;
  return (
    <Group title="Sign-in and security">
      <Row leading={<IconChip name="key.fill" size={30} />} title={user.hasPassword ? "Change password" : "Add a password"} subtitle={user.hasPassword ? "Other devices are signed out when you change it." : "Sign in with your email too."} onPress={() => setOpen(!open)} />
      {open && (
        <View style={{ padding: 16, paddingTop: 4, gap: 12 }}>
          {user.hasPassword && (
            <Field label="Current password">
              <Input secureTextEntry value={form.current} onChangeText={(v) => setForm((f) => ({ ...f, current: v }))} textContentType="password" autoComplete="current-password" />
            </Field>
          )}
          <Field label="New password" error={pwError} hint="At least 10 characters, with letters and a number or symbol.">
            <Input secureTextEntry value={form.next} onChangeText={(v) => setForm((f) => ({ ...f, next: v }))} textContentType="newPassword" autoComplete="new-password" />
          </Field>
          <Button title={user.hasPassword ? "Change password" : "Add password"} loading={password.isPending} disabled={!form.next || (user.hasPassword && !form.current)} style={fit(220)} onPress={() => password.mutate()} />
        </View>
      )}
      <Separator inset={58} />
      <Row
        leading={<IconChip name="iphone.and.arrow.forward" size={30} />}
        title="Sign out other devices"
        subtitle={otherSessions ? `${otherSessions} other device${otherSessions > 1 ? "s" : ""} signed in` : "Only this device is signed in"}
        chevron={false}
        right={<Button title="Sign out" size="sm" variant="secondary" loading={revoke.isPending} disabled={!otherSessions} onPress={() => revoke.mutate()} />}
      />
      <Separator inset={58} />
      <Row leading={<IconChip name="apple.logo" size={30} tone="muted" />} title="Apple" subtitle={linked.includes("apple") ? "Linked — you can sign in with Apple." : "Not linked. Sign in with Apple using this email to link it."} chevron={false} />
      <Separator inset={58} />
      <Row leading={<IconChip name="g.circle.fill" size={30} tone="muted" />} title="Google" subtitle={linked.includes("google") ? "Linked — you can sign in with Google." : "Not linked. Sign in with Google using this email to link it."} chevron={false} />
    </Group>
  );
}

function Data({ user }: { user: User }) {
  const { fit } = useLayout();
  const invalidate = useInvalidateLearner();
  const signOut = useSignOut();
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState({ email: "", password: "" });
  const exportData = useMutation({
    mutationFn: () => api.get<unknown>("/me/export"),
    onSuccess: (data) => void Share.share({ title: "FreeMathCamp data", message: JSON.stringify(data, null, 2) }),
    onError: (e) => toast.error(e, "Couldn't export your data."),
  });
  const reset = useMutation({
    mutationFn: () => api.post("/me/reset-progress", { courseId: COURSE_ID }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Progress reset. A fresh start!");
    },
    onError: (e) => toast.error(e, "Couldn't reset your progress."),
  });
  const remove = useMutation({
    mutationFn: () => api.delete<{ deleted: boolean }>("/me", { confirmEmail: confirm.email.trim(), ...(user.hasPassword ? { password: confirm.password } : {}) }),
    onSuccess: () => {
      toast.success("Your account has been deleted.");
      signOut.mutate();
    },
  });
  const removeError = remove.error instanceof ApiError ? remove.error.message : null;
  return (
    <Group title="Your data">
      <Row leading={<IconChip name="square.and.arrow.up" size={30} />} title="Export your data" subtitle="Everything we store about you, as JSON" onPress={() => exportData.mutate()} />
      <Separator inset={58} />
      <Row
        leading={<IconChip name="arrow.counterclockwise" size={30} tone="warning" />}
        title="Reset course progress"
        subtitle="Mastery, reviews and history start again"
        onPress={() =>
          Alert.alert("Reset your progress?", "Every lesson goes back to not started. Your account and leagues are kept. This can't be undone.", [
            { text: "Cancel", style: "cancel" },
            { text: "Reset progress", style: "destructive", onPress: () => reset.mutate() },
          ])
        }
      />
      <Separator inset={58} />
      <Row leading={<IconChip name="trash.fill" size={30} tone="danger" />} title="Delete account" subtitle="Permanently remove your account and data" onPress={() => setDeleting(!deleting)} />
      {deleting && (
        <View style={{ padding: 16, paddingTop: 4, gap: 12 }}>
          <Text variant="small" muted>
            This deletes your account, progress and notifications for good. Type your email{user.hasPassword ? " and password" : ""} to confirm.
          </Text>
          <Input placeholder={user.email} value={confirm.email} onChangeText={(v) => setConfirm((f) => ({ ...f, email: v }))} autoCapitalize="none" keyboardType="email-address" />
          {user.hasPassword && <Input placeholder="Password" secureTextEntry value={confirm.password} onChangeText={(v) => setConfirm((f) => ({ ...f, password: v }))} />}
          {removeError && (
            <Text variant="caption" tone="danger">
              {removeError}
            </Text>
          )}
          <Button title="Delete my account" variant="destructive" loading={remove.isPending} disabled={confirm.email.trim().toLowerCase() !== user.email.toLowerCase()} style={fit(220)} onPress={() => remove.mutate()} />
        </View>
      )}
    </Group>
  );
}

function About() {
  const signOut = useSignOut();
  const { fit } = useLayout();
  const open = (path: string) => void WebBrowser.openBrowserAsync(`${WEB_URL}${path}`, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET });
  return (
    <>
      <Group>
        <Row leading={<IconChip name="hand.raised.fill" size={30} tone="muted" />} title="Privacy policy" onPress={() => open("/privacy")} />
        <Separator inset={58} />
        <Row leading={<IconChip name="doc.text.fill" size={30} tone="muted" />} title="Terms of use" onPress={() => open("/terms")} />
        <Separator inset={58} />
        <Row leading={<IconChip name="envelope.fill" size={30} tone="muted" />} title="Help and support" onPress={() => open("/support")} />
      </Group>
      <Button title="Sign out" variant="destructive" size="lg" loading={signOut.isPending} onPress={() => signOut.mutate()} style={fit(320)} />
      <Text variant="caption" muted style={{ textAlign: "center" }}>
        FreeMathCamp {Application.nativeApplicationVersion} ({Application.nativeBuildVersion})
      </Text>
    </>
  );
}
