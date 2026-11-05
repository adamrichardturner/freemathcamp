import { useQuery } from "@tanstack/react-query";
import { useDeferredValue } from "react";
import { ActivityIndicator, View } from "react-native";
import { api } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { Field, Icon, Input } from "./ui";

/** The same rules the API enforces: 3–20 letters, numbers or underscores, starting with a letter. */
export const usernameProblem = (u: string) =>
  u.length === 0
    ? null
    : !/^[A-Za-z]/.test(u)
      ? "Start with a letter."
      : !/^[A-Za-z0-9_]+$/.test(u)
        ? "Use letters, numbers and underscores only."
        : u.length < 3
          ? "At least 3 characters."
          : u.length > 20
            ? "At most 20 characters."
            : null;

/** A starting point from the email's local part plus a short random suffix, as on the web. */
export const suggestUsername = (email: string) => {
  const base = (email.split("@")[0] ?? "").split("+")[0]!.replace(/[^A-Za-z0-9_]/g, "").replace(/^[^A-Za-z]+/, "").toLowerCase().slice(0, 15);
  const suffix = Array.from({ length: 4 }, () => "abcdefghijkmnpqrstuvwxyz23456789"[Math.floor(Math.random() * 32)]).join("");
  return `${base.length >= 2 ? base : "learner"}_${suffix}`;
};

/** Live availability while typing; `current` (the learner's own) always counts as available. */
export const useUsernameCheck = (value: string, current?: string | null) => {
  const username = useDeferredValue(value.trim());
  const problem = usernameProblem(username);
  const unchanged = !!current && username === current;
  const { data, isFetching } = useQuery({
    queryKey: ["username-available", username],
    queryFn: () => api.get<{ available: boolean; reason: string | null }>(`/auth/username-available?username=${encodeURIComponent(username)}`),
    enabled: username.length > 0 && !problem && !unchanged,
    staleTime: 10_000,
  });
  const stale = username !== value.trim();
  if (!value.trim()) return { status: "empty" as const, message: null };
  if (problem) return { status: "invalid" as const, message: problem };
  if (unchanged) return { status: "unchanged" as const, message: null };
  if (stale || isFetching || !data) return { status: "checking" as const, message: null };
  return data.available ? { status: "available" as const, message: `@${username} is available` } : { status: "taken" as const, message: data.reason ?? "That username is taken." };
};

export type UsernameCheck = ReturnType<typeof useUsernameCheck>;

export function UsernameField({ value, onChange, check, serverError, editable = true }: { value: string; onChange: (v: string) => void; check: UsernameCheck; serverError?: string | null; editable?: boolean }) {
  const { c } = useTheme();
  const bad = check.status === "invalid" || check.status === "taken" || !!serverError;
  return (
    <Field label="Username" error={serverError ?? (bad ? check.message : null)} hint={check.status === "available" ? check.message! : "The only thing other learners see, in leagues."}>
      <View>
        <Input value={value} onChangeText={onChange} autoCapitalize="none" autoCorrect={false} autoComplete="username-new" textContentType="username" maxLength={20} invalid={bad} editable={editable} style={{ paddingRight: 40 }} />
        <View style={{ position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center" }}>
          {check.status === "checking" ? (
            <ActivityIndicator size="small" color={c.mutedForeground} />
          ) : check.status === "available" ? (
            <Icon name="checkmark.circle.fill" size={18} tone="success" />
          ) : bad ? (
            <Icon name="xmark.circle.fill" size={18} tone="danger" />
          ) : null}
        </View>
      </View>
    </Field>
  );
}
