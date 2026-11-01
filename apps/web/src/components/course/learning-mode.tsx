"use client";

import type { LearningMode } from "@fmc/curriculum";
import { useMutation } from "@tanstack/react-query";
import { Check, Compass, Loader2, Route } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApplyUser, useInvalidateLearner } from "@/hooks/queries";
import { api, ApiError, type User } from "@/lib/api";
import { cn } from "@/lib/utils";

export const MODE_META: Record<LearningMode, { label: string; icon: typeof Route; short: string; points: string[] }> = {
  path: {
    label: "Path mode",
    icon: Route,
    short: "Lessons unlock one at a time, in order.",
    points: [
      "Lessons open in order — finish a practice session to unlock the next one.",
      "Your daily plan only suggests new lessons you've unlocked.",
      "Lessons you've already started stay open.",
    ],
  },
  audit: {
    label: "Audit mode",
    icon: Compass,
    short: "Every lesson is open — explore in any order.",
    points: [
      "Every lesson in the course is open, in any order.",
      "Your daily plan can suggest any lesson you're ready for.",
      "Your progress and mastery are kept exactly as they are.",
    ],
  },
};

const useSetLearningMode = () => {
  const applyUser = useApplyUser();
  const invalidateLearner = useInvalidateLearner();
  return useMutation({
    mutationFn: (learningMode: LearningMode) => api.patch<{ user: User }>("/me/preferences", { learningMode }),
    // Pending until lesson locks are refetched, so the course never shows the old mode's locks.
    onSuccess: async ({ user }) => {
      await Promise.all([applyUser(user), invalidateLearner()]);
      toast.success(`${MODE_META[user.learningMode].label} is on`);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't change the course mode."),
  });
};

/**
 * Two-option switch between path and audit mode. By default picking the other
 * option asks for confirmation in a dialog before anything changes; with
 * `confirm={false}` (onboarding, which is already the place to decide) it applies at once.
 * `variant="cards"` shows descriptive option cards (settings); `"pill"` is a compact segmented control.
 */
export function LearningModeSwitch({
  mode,
  variant = "pill",
  confirm = true,
  onPendingChange,
  className,
}: {
  mode: LearningMode;
  variant?: "pill" | "cards";
  confirm?: boolean;
  /** Lets a parent hold its own controls while a change is being saved. */
  onPendingChange?: (pending: boolean) => void;
  className?: string;
}) {
  const [target, setTarget] = useState<LearningMode | null>(null);
  const setMode = useSetLearningMode();
  const saving = !confirm && setMode.isPending ? setMode.variables : null;
  const pick = (m: LearningMode) => {
    if (m === mode || setMode.isPending) return;
    if (confirm) return setTarget(m);
    onPendingChange?.(true);
    setMode.mutate(m, { onSettled: () => onPendingChange?.(false) });
  };

  return (
    <>
      <div
        role="radiogroup"
        aria-label="Course mode"
        className={cn(variant === "pill" ? "inline-flex rounded-full border bg-muted/60 p-1" : "grid gap-3 sm:grid-cols-2", className)}
      >
        {(Object.keys(MODE_META) as LearningMode[]).map((m) => {
          const meta = MODE_META[m];
          const active = m === mode;
          return variant === "pill" ? (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={!!saving}
              onClick={() => pick(m)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-all hover:text-foreground",
                active && "bg-background text-foreground shadow-sm ring-1 ring-foreground/10",
              )}
            >
              {saving === m ? <Loader2 className="size-4 animate-spin" /> : <meta.icon className={cn("size-4", active && "text-primary")} />} {meta.label}
            </button>
          ) : (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={active}
              aria-busy={saving === m}
              disabled={!!saving}
              onClick={() => pick(m)}
              className={cn(
                "relative flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors hover:border-primary/50 disabled:cursor-wait",
                active && "border-primary bg-primary/[0.06]",
                saving === m && "border-primary/50",
              )}
            >
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {saving === m ? <Loader2 className="size-5 animate-spin" /> : <meta.icon className="size-5" />}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{meta.label}</span>
                <span className="block text-sm text-muted-foreground">{meta.short}</span>
              </span>
              {active && <Check className="absolute top-3 right-3 size-4 text-primary" />}
            </button>
          );
        })}
      </div>

      <Dialog open={target !== null} onOpenChange={(open) => !open && !setMode.isPending && setTarget(null)}>
        {target && <ConfirmModeContent target={target} pending={setMode.isPending} onConfirm={() => setMode.mutate(target, { onSuccess: () => setTarget(null) })} />}
      </Dialog>
    </>
  );
}

function ConfirmModeContent({ target, pending, onConfirm }: { target: LearningMode; pending: boolean; onConfirm: () => void }) {
  const meta = MODE_META[target];
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <span className="mb-1 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
          <meta.icon className="size-6" />
        </span>
        <DialogTitle className="text-lg">Switch to {meta.label}?</DialogTitle>
        <DialogDescription>{meta.short}</DialogDescription>
      </DialogHeader>
      <ul className="space-y-2 rounded-xl border bg-muted/40 p-4">
        {meta.points.map((p) => (
          <li key={p} className="flex gap-2.5 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {p}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">You can switch back at any time from Settings or the course page.</p>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" disabled={pending} />}>Cancel</DialogClose>
        <Button onClick={onConfirm} disabled={pending}>
          {pending && <Loader2 className="animate-spin" />} Switch to {meta.label}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
