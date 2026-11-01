"use client";

import { BellRing, Clock, Loader2, Mail, ShieldCheck, Smartphone, Sparkles, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePush, type PushState } from "@/hooks/notifications";
import { useApplyUser } from "@/hooks/queries";
import { api, ApiError, type User } from "@/lib/api";
import { SettingRow, SettingsCard } from "./settings-ui";
import { useAction } from "@/hooks/use-action";

type Pref = "notifyProgress" | "notifyReminders" | "notifyEmailReminders";

const PUSH_COPY: Record<PushState, string> = {
  on: "This device shows notifications even when FreeMathCamp isn't open.",
  off: "Get milestones and reminders as notifications on this device.",
  denied: "Notifications are blocked for this site. Allow them in your browser's site settings, then come back.",
  unsupported: "This browser doesn't support push notifications. You'll still see everything in the notification centre.",
  "needs-install": "On iPhone and iPad, add FreeMathCamp to your Home Screen (Share → Add to Home Screen), then open it from there to turn on notifications.",
};

export function NotificationSettings({ user }: { user: User }) {
  return (
    <>
      <PushCard />
      <PreferencesCard user={user} />
    </>
  );
}

function PushCard() {
  const push = usePush();
  const busy = push.enable.isPending || push.disable.isPending;
  const state = push.state;
  const fail = (e: unknown, fallback: string) => toast.error(e instanceof ApiError || e instanceof Error ? e.message : fallback);

  return (
    <SettingsCard title="Push notifications" description="Notifications on this device. Turn them on separately on each browser or device you use.">
      <SettingRow
        title={
          <span className="flex items-center gap-2">
            <Smartphone className="size-4 text-muted-foreground" /> This device
            {state === "on" && <span className="rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-semibold text-success">On</span>}
          </span>
        }
        description={state ? (!push.available && state === "off" ? "Push isn't available on this server yet. Everything still appears in the notification centre." : PUSH_COPY[state]) : "Checking this device…"}
        action={
          state === "on" ? (
            <Button variant="outline" size="sm" disabled={busy} aria-busy={push.disable.isPending} onClick={() => push.disable.mutate(undefined, { onSuccess: () => toast.success("Push notifications turned off on this device"), onError: (e) => fail(e, "Couldn't turn them off.") })}>
              {push.disable.isPending && <Loader2 className="animate-spin" />} Turn off
            </Button>
          ) : state === "off" ? (
            <Button size="sm" disabled={busy || !push.available} aria-busy={push.enable.isPending} onClick={() => push.enable.mutate(undefined, { onSuccess: () => toast.success("Push notifications are on"), onError: (e) => fail(e, "Couldn't turn them on.") })}>
              {push.enable.isPending ? <Loader2 className="animate-spin" /> : <BellRing />} Turn on
            </Button>
          ) : null
        }
      />
    </SettingsCard>
  );
}

function PreferencesCard({ user }: { user: User }) {
  const applyUser = useApplyUser();
  const save = useAction({
    mutationFn: (patch: Partial<Record<Pref, boolean>>) => api.patch<{ user: User }>("/me/preferences", patch),
    onSuccess: ({ user: u }) => applyUser(u),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't save your notification settings."),
  });
  const pending = save.isPending ? Object.keys(save.variables ?? {})[0] : null;
  const n = user.notifications;

  const toggle = (pref: Pref, checked: boolean, label: string) =>
    save.mutate({ [pref]: checked }, { onSuccess: () => toast.success(`${label} ${checked ? "on" : "off"}`) });

  return (
    <SettingsCard title="What to notify me about" description="Applies to the notification centre, push and email. Changes save straight away.">
      <PrefRow
        icon={<Trophy className="size-4 text-success" />}
        title="Progress & achievements"
        description="Unlocked and mastered lessons, unit and course milestones, streaks and your daily goal."
        checked={n.progress}
        pending={pending === "notifyProgress"}
        disabled={save.isPending}
        onChange={(c) => toggle("notifyProgress", c, "Progress notifications")}
      />
      <div className="border-t" />
      <PrefRow
        icon={<Sparkles className="size-4 text-warning" />}
        title="Practice reminders"
        description="At most one a day, at a sensible local time: reviews due, streaks at risk, your daily goal and a nudge after time away."
        checked={n.reminders}
        pending={pending === "notifyReminders"}
        disabled={save.isPending}
        onChange={(c) => toggle("notifyReminders", c, "Practice reminders")}
      />
      <div className="border-t" />
      <PrefRow
        icon={<Mail className="size-4 text-info" />}
        title="Reminder emails"
        description={n.reminders ? "Emails when you've been away for a while, plus a short weekly summary." : "Turn on practice reminders to get these by email."}
        checked={n.reminders && n.emailReminders}
        pending={pending === "notifyEmailReminders"}
        disabled={save.isPending || !n.reminders}
        onChange={(c) => toggle("notifyEmailReminders", c, "Reminder emails")}
      />
      <div className="border-t" />
      <PrefRow
        icon={<ShieldCheck className="size-4 text-muted-foreground" />}
        title="Security notices"
        description="New sign-ins, password changes and other account activity, in the app and by email. Always on to keep your account safe."
        checked
        disabled
      />
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3.5" /> Reminders are timed for {user.timezone.replace(/_/g, " ")}, set automatically from this device.
      </p>
    </SettingsCard>
  );
}

function PrefRow({
  icon,
  title,
  description,
  checked,
  pending = false,
  disabled,
  onChange,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  checked: boolean;
  pending?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  const id = `pref-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <SettingRow
      title={
        <label htmlFor={id} className="flex items-center gap-2">
          {icon} {title}
        </label>
      }
      description={description}
      action={
        <span className="flex items-center gap-2">
          {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={(c) => onChange?.(c)} aria-busy={pending} />
        </span>
      }
    />
  );
}
