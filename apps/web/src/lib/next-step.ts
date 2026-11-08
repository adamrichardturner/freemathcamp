import type { PracticeMode, ProgressView } from "@/lib/api";

/**
 * What a lesson page should steer the learner towards. The page always opens on the
 * lesson; when practice is the better next move it says so, loudly.
 */
export type NextStep = { kind: "lesson"; mode: PracticeMode } | { kind: "practice"; mode: PracticeMode; label: string; title: string; text: string; cta: string };

/** The view stamp is rewritten on every visit, so one older than this is a past visit rather than this one landing first. */
const SEEN_BEFORE_MS = 15_000;

export function nextStep({
  progress,
  requested,
  viewedAt,
  now = Date.now(),
}: {
  progress: ProgressView | null | undefined;
  /** The mode a recommendation linked here with (?mode=…), if any. */
  requested: PracticeMode | null | undefined;
  /** When the lesson was viewed before this visit, if ever. */
  viewedAt: string | null | undefined;
  now?: number;
}): NextStep {
  const sessions = progress?.sessionsCompleted ?? 0;
  const seen = !!viewedAt && now - new Date(viewedAt).getTime() > SEEN_BEFORE_MS;
  const due = !!progress?.dueAt && new Date(progress.dueAt).getTime() <= now;

  if (sessions > 0 && (requested === "challenge" || progress?.status === "struggling"))
    return {
      kind: "practice",
      mode: "challenge",
      label: "Needs practice",
      title: "Time to strengthen this",
      text: "Eight problems that start gently and rebuild confidence on the tricky parts. Skim the lesson first if you need a reminder.",
      cta: "Start challenge",
    };
  if (sessions > 0 && (requested === "review" || due))
    return {
      kind: "practice",
      mode: "review",
      label: "Review due",
      title: "Your review is due",
      text: "A quick five-problem refresher, right as you're about to forget. That's what makes it stick.",
      cta: "Start review",
    };
  if (sessions > 0 && requested === "learn")
    return {
      kind: "practice",
      mode: "learn",
      label: "Keep going",
      title: "Pick up where you left off",
      text: "Six problems that start at your level and adapt as you go.",
      cta: "Continue practising",
    };
  if (sessions === 0 && seen)
    return {
      kind: "practice",
      mode: "learn",
      label: "Ready to practise",
      title: "You've read this lesson",
      text: "Now put it to work: six problems that start at your level and adapt as you go.",
      cta: "Start practising",
    };
  return { kind: "lesson", mode: progress?.status === "struggling" ? "challenge" : progress?.status === "review" ? "review" : "learn" };
}
