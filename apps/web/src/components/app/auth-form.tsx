"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Logo } from "@/components/app/logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { keys, useProviders } from "@/hooks/queries";
import { UsernameInput, useUsernameCheck } from "./username-field";
import { api, ApiError, type User } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAction } from "@/hooks/use-action";

const OAUTH_ERRORS: Record<string, string> = {
  google_unavailable: "Google sign-in isn't set up on this server yet.",
  google_cancelled: "Google sign-in was cancelled.",
  google_failed: "Google sign-in failed. Please try again.",
  account_exists: "An account with that email already exists. Sign in with your password.",
};

/** Only allow same-site relative redirects after sign-in. */
const safeNext = (v: string | null) => (v && /^\/(?!\/)/.test(v) ? v : "/learn");

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.3 6.6 2.3 12s4.3 9.8 9.7 9.8c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const { data: providers } = useProviders();
  const next = safeNext(params.get("next"));
  const [form, setForm] = useState({ displayName: "", username: "", email: "", password: "" });
  const usernameCheck = useUsernameCheck(form.username);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const oauthError = OAUTH_ERRORS[params.get("error") ?? ""];
  const [navigating, startNavigation] = useTransition();
  const [toGoogle, setToGoogle] = useState(false);

  // Coming back to this page with the browser's back button restores it from
  // the back/forward cache, mid-redirect; make it usable again.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => e.persisted && setToGoogle(false);
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  const submit = useAction({
    mutationFn: () => api.post<{ user: User }>(mode === "login" ? "/auth/login" : "/auth/register", mode === "login" ? { email: form.email, password: form.password } : { ...form, username: form.username.trim() }),
    onSuccess: ({ user }) => {
      qc.setQueryData(keys.me, user);
      // The transition stays pending until the next page has rendered.
      startNavigation(() => {
        router.push(next);
        router.refresh();
      });
    },
    onError: (e) => {
      if (e instanceof ApiError && e.issues) setFieldErrors(Object.fromEntries(e.issues.map((i) => [i.path, i.message])));
    },
  });

  // Success always redirects, so stay busy from the click until this page is gone.
  const signingIn = submit.isPending || submit.isSuccess || navigating;
  const busy = signingIn || toGoogle;
  // Next keeps visited pages alive but hidden. Hiding this one runs the cleanup,
  // so returning with Back shows a fresh form instead of a stuck "Signing in…".
  const { reset } = submit;
  useEffect(
    () => () => {
      reset();
      setToGoogle(false);
    },
    [reset],
  );

  const error = submit.error instanceof ApiError && !submit.error.issues ? submit.error.message : submit.error && !(submit.error instanceof ApiError) ? "Something went wrong." : null;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [k]: e.target.value });
    setFieldErrors((prev) => {
      const rest = { ...prev };
      delete rest[k];
      return rest;
    });
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center">
        <Logo />
        <h1 className="mt-6 font-display text-4xl">{mode === "login" ? "Welcome back" : "Start learning"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{mode === "login" ? "Pick up right where you left off." : "Free forever. Your progress is saved as you go."}</p>
      </div>

      {(oauthError || error) && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{oauthError ?? error}</AlertDescription>
        </Alert>
      )}

      {providers?.google && (
        <>
          <Button
            variant="outline"
            className={cn("h-11 w-full", busy && "pointer-events-none opacity-50")}
            render={<a href={`/api/auth/google?returnTo=${encodeURIComponent(next)}`} />}
            nativeButton={false}
            aria-disabled={busy}
            tabIndex={busy ? -1 : undefined}
            onClick={(e) => (busy ? e.preventDefault() : setToGoogle(true))}
          >
            {toGoogle ? <Loader2 className="animate-spin" /> : <GoogleIcon />} {toGoogle ? "Redirecting to Google…" : "Continue with Google"}
          </Button>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or with email <div className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) submit.mutate();
        }}
        noValidate
      >
        <fieldset disabled={busy} className="min-w-0 space-y-4">
          {mode === "register" && (
            <>
              <Field id="displayName" label="Your name" error={fieldErrors.displayName}>
                <Input id="displayName" autoComplete="name" value={form.displayName} onChange={set("displayName")} maxLength={60} required />
              </Field>
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <UsernameInput
                  id="username"
                  value={form.username}
                  onChange={(username) => set("username")({ target: { value: username } } as React.ChangeEvent<HTMLInputElement>)}
                  check={usernameCheck}
                  serverError={fieldErrors.username ?? (submit.error instanceof ApiError && submit.error.status === 409 && /username/i.test(submit.error.message) ? submit.error.message : undefined)}
                />
              </div>
            </>
          )}
          <Field id="email" label="Email" error={fieldErrors.email}>
            <Input id="email" type="email" autoComplete="email" value={form.email} onChange={set("email")} required />
          </Field>
          <Field id="password" label="Password" error={fieldErrors.password} hint={mode === "register" ? "At least 10 characters, with letters and a number or symbol." : undefined}>
            <Input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={set("password")} maxLength={128} required />
          </Field>
          <Button type="submit" className="h-11 w-full" disabled={busy} aria-busy={signingIn}>
            {signingIn && <Loader2 className="animate-spin" />}
            {mode === "login" ? (signingIn ? "Signing in…" : "Sign in") : signingIn ? "Creating account…" : "Create account"}
          </Button>
        </fieldset>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "login" ? "New here? " : "Already have an account? "}
        <Link href={`${mode === "login" ? "/register" : "/login"}${next !== "/learn" ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-primary hover:underline">
          {mode === "login" ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </div>
  );
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
