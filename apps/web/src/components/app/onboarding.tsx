"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, BookOpen, CalendarCheck, Route, Trophy } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LearningModeSwitch } from "@/components/course/learning-mode";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { keys, useLeagueOptIn, useSession } from "@/hooks/queries";
import { api, type User } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Images are 1920×1080 (16:9) and scale down to the dialog's width.
 * Replace the files in apps/web/public/onboarding/ to change them.
 */
const STEPS = [
  {
    icon: Route,
    image: "/onboarding/step-1.png",
    title: "Choose your path",
    text: "Foundations is a sequence of short lessons. Path mode (recommended) unlocks each one when you finish a practice session on the one before it; Audit mode opens everything so you can explore in any order. You can change this any time in Settings or on the course page.",
    choosesMode: true,
  },
  {
    icon: BookOpen,
    image: "/onboarding/step-2.png",
    title: "Learn, then practise",
    text: "Each lesson explains the idea with visuals and worked examples. Then practise: problems adapt to you, getting harder as you improve and gentler when you struggle. Use hints whenever you're stuck.",
  },
  {
    icon: CalendarCheck,
    image: "/onboarding/step-3.png",
    title: "Let the plan guide you",
    text: "Your dashboard builds a plan for each day, mixing reviews that are due, challenges on tricky topics and your next new lesson. For a little friendly competition, join the weekly leagues: every problem you solve earns XP, and the top of each league moves up from Bronze towards Obsidian. Others only ever see your username.",
    joinsLeague: true,
  },
] as const;

const OPEN_EVENT = "fmc:open-onboarding";

/** Re-opens the welcome tour from anywhere (e.g. the account menu). */
export const openOnboarding = () => window.dispatchEvent(new Event(OPEN_EVENT));

/** Three-step welcome tour, shown once to newly verified learners and replayable on demand. */
export function Onboarding() {
  const { user, verified } = useSession();
  const qc = useQueryClient();
  const [replay, setReplay] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [step, setStep] = useState(0);
  // While a mode change is saving, the tour holds still so it can't be left half-applied.
  const [savingMode, setSavingMode] = useState(false);
  // Waits for a username: the prompt for one comes first.
  const firstVisit = verified && !!user && !!user.username && !user.onboarded && !dismissed;
  const open = firstVisit || replay;

  useEffect(() => {
    const onOpen = () => {
      setStep(0);
      setReplay(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const complete = useMutation({
    mutationFn: () => api.post<{ user: User }>("/me/onboarding/complete"),
    onSuccess: ({ user: u }) => qc.setQueryData(keys.me, u),
  });

  const close = () => {
    if (savingMode) return;
    if (firstVisit) complete.mutate();
    setDismissed(true);
    setReplay(false);
  };

  const current = STEPS[step]!;
  const last = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div key={step} className="absolute inset-0" initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              <Image src={current.image} alt="" fill sizes="(min-width: 640px) 672px, 100vw" className="object-cover" priority={step === 0} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-widest text-primary uppercase">
              Step {step + 1} of {STEPS.length}
            </span>
            <div className="flex gap-1.5" role="tablist" aria-label="Onboarding steps">
              {STEPS.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  role="tab"
                  aria-selected={i === step}
                  aria-label={`Step ${i + 1}: ${s.title}`}
                  disabled={savingMode}
                  onClick={() => setStep(i)}
                  className={cn("h-2 rounded-full transition-all", i === step ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50")}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <current.icon className="size-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-xl">{current.title}</DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-relaxed">{current.text}</DialogDescription>
            </div>
          </div>

          {"choosesMode" in current && user && <LearningModeSwitch mode={user.learningMode} variant="cards" confirm={false} onPendingChange={setSavingMode} />}
          {"joinsLeague" in current && user && <LeagueJoin user={user} />}

          <div className="flex items-center justify-between gap-2 pt-1">
            <Button variant="ghost" onClick={close} disabled={savingMode} className="text-muted-foreground">
              Skip
            </Button>
            <div className="flex gap-2">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep(step - 1)} disabled={savingMode}>
                  <ArrowLeft /> Back
                </Button>
              )}
              <Button onClick={() => (last ? close() : setStep(step + 1))} disabled={savingMode}>
                {last ? "Get started" : "Next"} <ArrowRight />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LeagueJoin({ user }: { user: User }) {
  const optIn = useLeagueOptIn();
  return (
    <label htmlFor="tour-league" className="flex items-center gap-3 rounded-xl border p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-chart-4/15 text-chart-4">
        <Trophy className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">Join the weekly leagues</span>
        <span className="block text-xs text-muted-foreground">As @{user.username}. You can leave any time from the dashboard or Settings.</span>
      </span>
      <Switch id="tour-league" aria-label="Join the weekly leagues" checked={optIn.isPending ? optIn.variables : user.leagueOptIn} disabled={optIn.isPending} onCheckedChange={(on) => optIn.mutate(on)} />
    </label>
  );
}
