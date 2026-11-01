"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Download, Eye, EyeOff, Laptop, Loader2, Monitor, Moon, ShieldCheck, Sun, TriangleAlert } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/app/user-menu";
import { LearningModeSwitch } from "@/components/course/learning-mode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { keys, useAccountSettings } from "@/hooks/queries";
import { api, ApiError, type AccountSettings, type User } from "@/lib/api";
import { COURSE_ID } from "@/lib/course";
import { hardNavigate } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Field, SettingRow, SettingsCard } from "./settings-ui";

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "learning", label: "Learning" },
  { id: "security", label: "Security" },
  { id: "data", label: "Data & privacy" },
] as const;

const errorMessage = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);

export function SettingsView() {
  const { data, isLoading } = useAccountSettings();
  if (isLoading || !data)
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-60" />
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-56 rounded-xl" />
        ))}
      </div>
    );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-4xl sm:text-5xl">Settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your profile, learning preferences, security and data.</p>
      </header>
      <div className="grid gap-8 lg:grid-cols-[180px_minmax(0,1fr)]">
        <nav className="-mx-1 flex gap-1 overflow-x-auto [scrollbar-width:none] lg:sticky lg:top-20 lg:mx-0 lg:flex-col lg:self-start">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              {s.label}
            </a>
          ))}
        </nav>
        <div className="min-w-0 space-y-10">
          <Section id="profile" title="Profile">
            <ProfileCard settings={data} />
            <EmailCard user={data.user} />
          </Section>
          <Section id="learning" title="Learning">
            <CourseModeCard user={data.user} />
            <DailyGoalCard user={data.user} />
            <AppearanceCard />
          </Section>
          <Section id="security" title="Security">
            <PasswordCard user={data.user} />
            <SessionsCard settings={data} />
          </Section>
          <Section id="data" title="Data & privacy">
            <ExportCard />
            <ResetProgressCard />
            <DeleteAccountCard user={data.user} />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <h2 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">{title}</h2>
      {children}
    </section>
  );
}

/** Keep the user everywhere in sync after an account change. */
const useApplyUser = () => {
  const qc = useQueryClient();
  return (user: User) => {
    qc.setQueryData(keys.me, user);
    void qc.invalidateQueries({ queryKey: keys.settings });
  };
};

/* ---------------- Profile ---------------- */

function ProfileCard({ settings }: { settings: AccountSettings }) {
  const { user, nameChanges } = settings;
  const applyUser = useApplyUser();
  const [name, setName] = useState(user.displayName);
  const trimmed = name.trim();
  const dirty = trimmed !== user.displayName;
  const error = trimmed.length === 0 ? "Your name can't be empty." : trimmed.length > 60 ? "Keep it under 60 characters." : null;
  const locked = nameChanges.remaining === 0;

  const save = useMutation({
    mutationFn: () => api.patch<{ user: User }>("/me/profile", { displayName: trimmed }),
    onSuccess: ({ user: u }) => {
      applyUser(u);
      setName(u.displayName);
      toast.success("Name updated");
    },
    onError: (e) => toast.error(errorMessage(e, "Couldn't update your name.")),
  });

  return (
    <SettingsCard
      title="Your profile"
      description="This is how you appear around FreeMathCamp."
      dirty={dirty}
      valid={!error && !locked}
      saving={save.isPending}
      onSave={() => save.mutate()}
      onDiscard={() => setName(user.displayName)}
      footerNote={
        locked
          ? `Name change limit reached. Try again ${nameChanges.nextAllowedAt ? new Date(nameChanges.nextAllowedAt).toLocaleString() : "tomorrow"}.`
          : dirty
            ? `You can change your name ${nameChanges.remaining} more time${nameChanges.remaining === 1 ? "" : "s"} today.`
            : undefined
      }
    >
      <div className="flex items-center gap-4">
        <UserAvatar user={user} className="size-16 text-lg" />
        <div className="text-sm text-muted-foreground">
          {user.avatarUrl ? "Your photo comes from your Google account." : "Your initials are shown as your avatar."}
          <div className="text-xs">Student since {new Date(user.createdAt).toLocaleDateString("en", { day: "numeric", month: "long", year: "numeric" })}</div>
        </div>
      </div>
      <Field id="displayName" label="Display name" error={dirty ? error : null} help={`Up to ${nameChanges.limit} changes per day.`}>
        <Input
          id="displayName"
          value={name}
          maxLength={60}
          disabled={locked}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && dirty && !error && !locked && !save.isPending && save.mutate()}
          autoComplete="name"
          className="max-w-sm"
        />
      </Field>
    </SettingsCard>
  );
}

function EmailCard({ user }: { user: User }) {
  const resend = useMutation({
    mutationFn: () => api.post("/auth/resend-verification"),
    onSuccess: () => toast.success(`Verification link sent to ${user.email}`),
    onError: (e) => toast.error(errorMessage(e, "Couldn't send the email.")),
  });
  return (
    <SettingsCard title="Email address" description="Used to sign in and for important account messages. We never send marketing.">
      <SettingRow
        title={
          <span className="flex items-center gap-2">
            {user.email}
            {user.emailVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-semibold text-success">
                <BadgeCheck className="size-3" /> Verified
              </span>
            ) : (
              <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">Unverified</span>
            )}
          </span>
        }
        description={user.emailVerified ? "Your email is confirmed." : "Confirm your email to unlock practice and progress tracking."}
        action={
          !user.emailVerified && (
            <Button variant="outline" size="sm" onClick={() => resend.mutate()} disabled={resend.isPending}>
              {resend.isPending && <Loader2 className="animate-spin" />} Resend link
            </Button>
          )
        }
      />
    </SettingsCard>
  );
}

/* ---------------- Learning ---------------- */

function CourseModeCard({ user }: { user: User }) {
  return (
    <SettingsCard
      id="course-mode"
      title="Course mode"
      description="Choose whether lessons unlock one at a time or are all open. You'll be asked to confirm before it changes."
    >
      <LearningModeSwitch mode={user.learningMode} variant="cards" />
    </SettingsCard>
  );
}

const GOALS = [5, 10, 15, 20, 30, 50];

function DailyGoalCard({ user }: { user: User }) {
  const applyUser = useApplyUser();
  const qc = useQueryClient();
  const [goal, setGoal] = useState(user.dailyGoal);
  const dirty = goal !== user.dailyGoal;
  const save = useMutation({
    mutationFn: () => api.patch<{ user: User }>("/me/preferences", { dailyGoal: goal }),
    onSuccess: ({ user: u }) => {
      applyUser(u);
      void qc.invalidateQueries({ queryKey: keys.dashboard });
      toast.success(`Daily goal set to ${u.dailyGoal} problems`);
    },
    onError: (e) => toast.error(errorMessage(e, "Couldn't save your goal.")),
  });
  const pace = goal <= 5 ? "Gentle · about 5 minutes" : goal <= 15 ? "Steady · about 10–15 minutes" : goal <= 30 ? "Committed · about 20–30 minutes" : "Intense · 45+ minutes";
  return (
    <SettingsCard
      title="Daily goal"
      description="How many problems you aim to solve each day. Your dashboard tracks it."
      dirty={dirty}
      saving={save.isPending}
      onSave={() => save.mutate()}
      onDiscard={() => setGoal(user.dailyGoal)}
    >
      <ToggleGroup value={[String(goal)]} onValueChange={(v) => v[0] && setGoal(Number(v[0]))} variant="outline" className="flex-wrap" aria-label="Problems per day">
        {GOALS.map((g) => (
          <ToggleGroupItem key={g} value={String(g)} className="min-w-12 tabular-nums">
            {g}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p className="text-sm text-muted-foreground">{pace}</p>
    </SettingsCard>
  );
}

const noopSubscribe = () => () => {};

function AppearanceCard() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];
  return (
    <SettingsCard title="Appearance" description="Applies instantly and is remembered on this device.">
      <div className="grid max-w-md grid-cols-3 gap-2">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setTheme(o.value)}
            aria-pressed={mounted && theme === o.value}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition-colors hover:border-primary/50",
              mounted && theme === o.value && "border-primary bg-primary/[0.06]",
            )}
          >
            <o.icon className="size-5" /> {o.label}
          </button>
        ))}
      </div>
    </SettingsCard>
  );
}

/* ---------------- Security ---------------- */

const passwordProblem = (p: string) =>
  p.length === 0 ? null : p.length < 10 ? "At least 10 characters." : !/[a-zA-Z]/.test(p) || !/[^a-zA-Z]/.test(p) ? "Mix letters with numbers or symbols." : null;

function PasswordInput({ id, value, onChange, autoComplete }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative max-w-sm">
      <Input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} maxLength={128} className="pr-10" />
      <button type="button" onClick={() => setShow(!show)} className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function PasswordCard({ user }: { user: User }) {
  const applyUser = useApplyUser();
  const empty = { current: "", next: "", confirm: "" };
  const [form, setForm] = useState(empty);
  const dirty = Object.values(form).some(Boolean);
  const nextError = passwordProblem(form.next);
  const confirmError = form.confirm && form.confirm !== form.next ? "Passwords don't match." : null;
  const sameError = user.hasPassword && form.next && form.next === form.current ? "Choose a different password." : null;
  const valid = (!user.hasPassword || !!form.current) && !!form.next && !nextError && !confirmError && !sameError && form.confirm === form.next;

  const save = useMutation({
    mutationFn: () =>
      api.post<{ user: User; signedOutSessions: number }>("/me/password", { ...(user.hasPassword ? { currentPassword: form.current } : {}), newPassword: form.next }),
    onSuccess: ({ user: u, signedOutSessions }) => {
      applyUser(u);
      setForm(empty);
      toast.success(
        `${user.hasPassword ? "Password changed" : "Password set"}${signedOutSessions ? ` · signed out ${signedOutSessions} other device${signedOutSessions === 1 ? "" : "s"}` : ""}`,
      );
    },
    onError: (e) => toast.error(errorMessage(e, "Couldn't update your password.")),
  });

  return (
    <SettingsCard
      title={user.hasPassword ? "Change password" : "Set a password"}
      description={user.hasPassword ? "For your security, other devices are signed out when you change it." : "You sign in with Google. Add a password to sign in with your email too."}
      dirty={dirty}
      valid={valid}
      saving={save.isPending}
      onSave={() => save.mutate()}
      onDiscard={() => setForm(empty)}
      saveLabel={user.hasPassword ? "Update password" : "Set password"}
    >
      {user.hasPassword && (
        <Field id="currentPassword" label="Current password">
          <PasswordInput id="currentPassword" value={form.current} onChange={(current) => setForm({ ...form, current })} autoComplete="current-password" />
        </Field>
      )}
      <Field id="newPassword" label="New password" error={nextError ?? sameError} help="At least 10 characters, with letters and a number or symbol.">
        <PasswordInput id="newPassword" value={form.next} onChange={(next) => setForm({ ...form, next })} autoComplete="new-password" />
      </Field>
      <Field id="confirmPassword" label="Confirm new password" error={confirmError}>
        <PasswordInput id="confirmPassword" value={form.confirm} onChange={(confirm) => setForm({ ...form, confirm })} autoComplete="new-password" />
      </Field>
    </SettingsCard>
  );
}

function SessionsCard({ settings }: { settings: AccountSettings }) {
  const qc = useQueryClient();
  const { otherSessions, activeSessions, linkedProviders } = settings.security;
  const revoke = useMutation({
    mutationFn: () => api.post<{ signedOutSessions: number }>("/me/sessions/revoke-others"),
    onSuccess: ({ signedOutSessions }) => {
      void qc.invalidateQueries({ queryKey: keys.settings });
      toast.success(`Signed out ${signedOutSessions} other device${signedOutSessions === 1 ? "" : "s"}`);
    },
    onError: (e) => toast.error(errorMessage(e, "Couldn't sign out other devices.")),
  });
  return (
    <SettingsCard title="Sign-in & devices" description="Where your account is signed in, and how you sign in.">
      <SettingRow
        title={
          <span className="flex items-center gap-2">
            <Laptop className="size-4 text-muted-foreground" /> {activeSessions} active session{activeSessions === 1 ? "" : "s"}
          </span>
        }
        description={otherSessions ? `This device plus ${otherSessions} other${otherSessions === 1 ? "" : "s"}.` : "Only this device is signed in."}
        action={
          <Button variant="outline" size="sm" disabled={!otherSessions || revoke.isPending} onClick={() => revoke.mutate()}>
            {revoke.isPending && <Loader2 className="animate-spin" />} Sign out other devices
          </Button>
        }
      />
      <div className="border-t" />
      <SettingRow
        title={
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-muted-foreground" /> Google
          </span>
        }
        description={linkedProviders.includes("google") ? "Linked — you can sign in with Google." : "Not linked. Signing in with Google using this email links it automatically."}
        action={
          linkedProviders.includes("google") ? (
            <span className="rounded-full bg-success/12 px-2 py-0.5 text-xs font-semibold text-success">Connected</span>
          ) : (
            <span className="text-xs text-muted-foreground">Not connected</span>
          )
        }
      />
    </SettingsCard>
  );
}

/* ---------------- Data & privacy ---------------- */

function ExportCard() {
  return (
    <SettingsCard title="Download your data" description="A JSON file with your account, progress, practice history and every answer you've submitted.">
      <Button variant="outline" nativeButton={false} render={<a href="/api/me/export" download />}>
        <Download /> Export my data
      </Button>
    </SettingsCard>
  );
}

function ConfirmDialog({
  trigger,
  title,
  description,
  phrase,
  phraseLabel,
  extra,
  canConfirm = true,
  confirmLabel,
  pending,
  onConfirm,
  onOpenChange,
}: {
  trigger: React.ReactNode;
  title: string;
  description: React.ReactNode;
  phrase: string;
  phraseLabel: React.ReactNode;
  extra?: React.ReactNode;
  canConfirm?: boolean;
  confirmLabel: string;
  pending: boolean;
  /** Resolves when the action succeeded, which closes the dialog. */
  onConfirm: () => Promise<unknown>;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toLowerCase() === phrase.toLowerCase();
  const change = (next: boolean) => {
    // A request in flight can't be abandoned by closing the dialog.
    if (pending && !next) return;
    setOpen(next);
    if (!next) setTyped("");
    onOpenChange?.(next);
  };
  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogTrigger render={<Button variant="destructive" />}>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="size-5 text-danger" /> {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (matches && canConfirm && !pending) onConfirm().then(() => change(false), () => {});
          }}
        >
          <fieldset disabled={pending} className="min-w-0 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="confirmPhrase" className="block text-sm">
                {phraseLabel}
              </label>
              <Input id="confirmPhrase" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} />
            </div>
            {extra}
          </fieldset>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" disabled={pending} />}>Cancel</DialogClose>
            <Button type="submit" variant="destructive" disabled={!matches || !canConfirm || pending} aria-busy={pending}>
              {pending && <Loader2 className="animate-spin" />} {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetProgressCard() {
  const qc = useQueryClient();
  const reset = useMutation({
    mutationFn: () => api.post("/me/reset-progress", { courseId: COURSE_ID }),
    onSuccess: () => {
      void qc.invalidateQueries();
      toast.success("Course progress reset. A fresh start!");
    },
    onError: (e) => toast.error(errorMessage(e, "Couldn't reset your progress.")),
  });
  return (
    <SettingsCard title="Reset course progress" description="Clears mastery, reviews and practice history for Foundations. Your account stays.">
      <ConfirmDialog
        trigger="Reset progress"
        title="Reset Foundations progress?"
        description="Your mastery, review schedule, streak history and practice sessions for this course will be permanently removed."
        phrase="reset"
        phraseLabel={
          <>
            Type <span className="font-mono font-semibold">reset</span> to confirm
          </>
        }
        confirmLabel="Reset progress"
        pending={reset.isPending}
        onConfirm={() => reset.mutateAsync()}
      />
    </SettingsCard>
  );
}

function DeleteAccountCard({ user }: { user: User }) {
  const [password, setPassword] = useState("");
  const del = useMutation({
    mutationFn: () => api.delete<{ deleted: boolean }>("/me", { confirmEmail: user.email, ...(user.hasPassword ? { password } : {}) }),
    // A full reload leaves nothing of the deleted account in memory; the toast shows on the next page.
    onSuccess: () => hardNavigate("/", "Your account and all of its data have been deleted."),
    onError: (e) => toast.error(errorMessage(e, "Couldn't delete your account.")),
  });
  return (
    <SettingsCard tone="danger" title="Delete account" description="Permanently delete your account and everything we store about you: progress, practice history, answers and sessions. This can't be undone.">
      <ConfirmDialog
        trigger="Delete my account"
        title="Delete your account?"
        description="This immediately and permanently deletes your FreeMathCamp account and all associated data. You may want to download your data first."
        phrase={user.email}
        phraseLabel={
          <>
            Type your email <span className="font-mono font-semibold">{user.email}</span> to confirm
          </>
        }
        extra={
          user.hasPassword && (
            <Field id="deletePassword" label="Password">
              <PasswordInput id="deletePassword" value={password} onChange={setPassword} autoComplete="current-password" />
            </Field>
          )
        }
        canConfirm={!user.hasPassword || password.length > 0}
        confirmLabel="Delete forever"
        // Success reloads the page, so the dialog stays open and busy until the browser leaves.
        pending={del.isPending || del.isSuccess}
        onConfirm={() => del.mutateAsync().then(() => new Promise<never>(() => {}))}
        onOpenChange={(open) => !open && setPassword("")}
      />
    </SettingsCard>
  );
}
