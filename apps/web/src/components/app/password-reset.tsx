"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, CircleX, Clock, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ButtonLink } from "@/components/app/button-link";
import { Logo } from "@/components/app/logo";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { keys } from "@/hooks/queries";
import { api, ApiError, type User } from "@/lib/api";

/** The sign-up rules, checked as you type; the API checks them again. */
const passwordProblem = (p: string) =>
  p.length === 0 ? null : p.length < 10 ? "At least 10 characters." : !/[a-zA-Z]/.test(p) || !/[^a-zA-Z]/.test(p) ? "Mix letters with numbers or symbols." : null;

const errorText = (e: unknown) => (e instanceof ApiError ? e.message : e ? "Something went wrong. Please try again." : null);

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8 flex flex-col items-center text-center">
      <Logo />
      <h1 className="mt-6 font-display text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

/** A big icon, heading and message: the end states of both flows. */
function Outcome({ icon, title, children, actions }: { icon: React.ReactNode; title: string; children: React.ReactNode; actions: React.ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null);
  // Move focus to the new state so screen readers announce it.
  useEffect(() => heading.current?.focus(), []);
  return (
    <div className="flex w-full max-w-sm flex-col items-center text-center">
      <Logo />
      <div className="mt-10 grid size-16 place-items-center rounded-2xl bg-card shadow-sm" aria-hidden>
        {icon}
      </div>
      <h1 ref={heading} tabIndex={-1} className="mt-6 font-display text-4xl outline-none">
        {title}
      </h1>
      <div className="mt-2 text-muted-foreground">{children}</div>
      <div className="mt-8 flex flex-col items-center gap-3">{actions}</div>
    </div>
  );
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string | null; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-message`} className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-message`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function PasswordInput({ id, value, onChange, invalid, described }: { id: string; value: string; onChange: (v: string) => void; invalid: boolean; described: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="new-password"
        maxLength={128}
        required
        aria-invalid={invalid || undefined}
        aria-describedby={described ? `${id}-message` : undefined}
        className="h-11 pr-10"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

/** Asks for the account's email and sends a reset link. */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const id = useId();
  const send = useMutation({
    mutationFn: (address: string) => api.post<{ ok: true }>("/auth/forgot-password", { email: address }),
    onError: (e) => {
      if (e instanceof ApiError && e.issues) setFieldError(e.issues[0]?.message ?? e.message);
    },
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return setFieldError("Enter a valid email address.");
    if (!send.isPending) send.mutate(address);
  };

  if (send.isSuccess)
    return (
      <Outcome
        icon={<MailCheck className="size-9 text-primary" />}
        title="Check your email"
        actions={
          <>
            <ButtonLink href="/login" size="lg" className="h-11 px-6">
              Back to sign in
            </ButtonLink>
            <Button variant="ghost" onClick={() => send.reset()}>
              Use a different email
            </Button>
          </>
        }
      >
        <p>
          If there&apos;s a FreeMathCamp account for <span className="font-medium text-foreground">{send.variables}</span>, we&apos;ve sent it a link to choose a new password.
        </p>
        <p className="mt-3 text-sm">The link works once, for an hour. Nothing there after a few minutes? Check your spam folder.</p>
      </Outcome>
    );

  const error = send.error instanceof ApiError && send.error.issues ? null : errorText(send.error);
  return (
    <div className="w-full max-w-sm">
      <Header title="Forgot your password?" subtitle="Enter the email you sign in with and we'll send you a link to choose a new one." />
      {error && (
        <Alert variant="destructive" className="mb-4" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <form className="space-y-4" onSubmit={submit} noValidate>
        <fieldset disabled={send.isPending} className="min-w-0 space-y-4">
          <Field id={`${id}-email`} label="Email" error={fieldError}>
            <Input
              id={`${id}-email`}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldError(null);
              }}
              required
              autoFocus
              aria-invalid={!!fieldError || undefined}
              aria-describedby={fieldError ? `${id}-email-message` : undefined}
              className="h-11"
            />
          </Field>
          <Button type="submit" className="h-11 w-full" aria-busy={send.isPending}>
            {send.isPending && <Loader2 className="animate-spin" />}
            {send.isPending ? "Sending link…" : "Send reset link"}
          </Button>
        </fieldset>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

const LINK_PROBLEMS = ["LinkExpired", "LinkInvalid"];
const isLinkProblem = (e: unknown): e is ApiError => e instanceof ApiError && LINK_PROBLEMS.includes(e.code);

function LinkProblem({ error }: { error: ApiError | null }) {
  const expired = error?.code === "LinkExpired";
  return (
    <Outcome
      icon={expired ? <Clock className="size-9 text-warning" /> : <CircleX className="size-9 text-danger" />}
      title={expired ? "Link expired" : "Link not valid"}
      actions={
        <>
          <ButtonLink href="/forgot-password" size="lg" className="h-11 px-6">
            Send a new link
          </ButtonLink>
          <ButtonLink href="/login" variant="ghost">
            Back to sign in
          </ButtonLink>
        </>
      }
    >
      <p>{error?.message ?? "This link is missing its token. Use the button in the email we sent, or request a new link."}</p>
    </Outcome>
  );
}

/** Landing page for the link in the reset email: checks it, then asks for a new password. */
export function ResetPasswordView() {
  const params = useSearchParams();
  // Read once, then drop it from the address bar so it isn't left in history or shared by accident.
  const [token] = useState(() => params.get("token"));
  useEffect(() => {
    if (token) window.history.replaceState(null, "", "/reset-password");
  }, [token]);

  const qc = useQueryClient();
  const check = useQuery({
    queryKey: ["reset-token", token],
    queryFn: () => api.post<{ valid: true }>("/auth/reset-password/check", { token }),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [touched, setTouched] = useState(false);
  const id = useId();
  const reset = useMutation({
    mutationFn: () => api.post<{ user: User; signedOutSessions: number }>("/auth/reset-password", { token, password: form.password }),
    onSuccess: ({ user }) => qc.setQueryData(keys.me, user),
  });

  if (!token) return <LinkProblem error={null} />;
  if (isLinkProblem(check.error)) return <LinkProblem error={check.error} />;
  if (isLinkProblem(reset.error)) return <LinkProblem error={reset.error} />;

  if (reset.isSuccess) {
    const others = reset.data.signedOutSessions;
    return (
      <Outcome
        icon={<CircleCheck className="size-9 text-success" />}
        title="Password updated"
        actions={
          <ButtonLink href="/learn" size="lg" className="h-11 px-6">
            Continue learning
          </ButtonLink>
        }
      >
        <p>
          You&apos;re signed in with your new password, {reset.data.user.displayName.split(" ")[0]}.
          {others > 0 ? " For your security, we've signed you out everywhere else." : ""}
        </p>
      </Outcome>
    );
  }

  if (check.isPending)
    return (
      <div className="flex w-full max-w-sm flex-col items-center text-center" role="status">
        <Logo />
        <div className="mt-10 grid size-16 place-items-center rounded-2xl bg-card shadow-sm" aria-hidden>
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
        <h1 className="mt-6 font-display text-4xl">Checking your link…</h1>
        <p className="mt-2 text-muted-foreground">One moment.</p>
      </div>
    );

  const strengthError = passwordProblem(form.password);
  const confirmError = touched && form.confirm && form.confirm !== form.password ? "Passwords don't match." : null;
  const serverIssue = reset.error instanceof ApiError && reset.error.issues ? reset.error.issues.find((i) => i.path === "password")?.message : undefined;
  const error = errorText(check.error) ?? (reset.error instanceof ApiError && reset.error.issues ? null : errorText(reset.error));
  const canSubmit = form.password.length > 0 && !strengthError && form.confirm === form.password;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (canSubmit && !reset.isPending) reset.mutate();
  };

  return (
    <div className="w-full max-w-sm">
      <Header title="Choose a new password" subtitle="Once it's saved you'll be signed in here, and signed out on your other devices." />
      {error && (
        <Alert variant="destructive" className="mb-4" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <form className="space-y-4" onSubmit={submit} noValidate>
        <fieldset disabled={reset.isPending} className="min-w-0 space-y-4">
          <Field id={`${id}-password`} label="New password" error={serverIssue ?? strengthError} hint="At least 10 characters, with letters and a number or symbol.">
            <PasswordInput
              id={`${id}-password`}
              value={form.password}
              onChange={(password) => {
                setForm({ ...form, password });
                reset.reset();
              }}
              invalid={!!(serverIssue ?? strengthError)}
              described
            />
          </Field>
          <Field id={`${id}-confirm`} label="Confirm new password" error={confirmError ?? (touched && !form.confirm && form.password ? "Type the password again to confirm it." : null)}>
            <PasswordInput
              id={`${id}-confirm`}
              value={form.confirm}
              onChange={(confirm) => setForm({ ...form, confirm })}
              invalid={!!confirmError}
              described={!!confirmError || (touched && !form.confirm && !!form.password)}
            />
          </Field>
          <Button type="submit" className="h-11 w-full" aria-busy={reset.isPending}>
            {reset.isPending && <Loader2 className="animate-spin" />}
            {reset.isPending ? "Saving…" : "Save new password"}
          </Button>
        </fieldset>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
