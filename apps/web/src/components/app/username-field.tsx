"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Loader2, X } from "lucide-react";
import { useDeferredValue } from "react";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

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

/**
 * Live availability while typing. `current` is the learner's own username, which
 * is always "available" to them. Uniqueness ignores letter case.
 */
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

export function UsernameInput({
  id,
  value,
  onChange,
  check,
  serverError,
  autoFocus,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  check: ReturnType<typeof useUsernameCheck>;
  serverError?: string | undefined;
  autoFocus?: boolean;
}) {
  const bad = check.status === "invalid" || check.status === "taken" || !!serverError;
  return (
    <div className="space-y-1.5">
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">@</span>
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\s/g, ""))}
          maxLength={20}
          autoComplete="username"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={autoFocus}
          aria-invalid={bad || undefined}
          aria-describedby={`${id}-status`}
          className="pr-9 pl-7"
        />
        <span className="absolute top-1/2 right-3 -translate-y-1/2" aria-hidden>
          {check.status === "checking" ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : check.status === "available" ? (
            <Check className="size-4 text-success" />
          ) : bad ? (
            <X className="size-4 text-danger" />
          ) : null}
        </span>
      </div>
      <p id={`${id}-status`} aria-live="polite" className={cn("text-xs", bad ? "text-danger" : check.status === "available" ? "text-success" : "text-muted-foreground")}>
        {serverError ?? check.message ?? "3–20 letters, numbers or underscores. Shown in leagues instead of your name."}
      </p>
    </div>
  );
}
