"use client";

import { CircleCheck, Loader2, MailX } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { ButtonLink } from "@/components/app/button-link";
import { Logo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { useAction } from "@/hooks/use-action";

/**
 * Landing page for "Unsubscribe" in reminder emails. It asks for a click rather
 * than acting on page load, so link scanners in mail systems can't unsubscribe anyone.
 */
export function UnsubscribeView() {
  const token = useSearchParams().get("token") ?? "";
  const unsubscribe = useAction({ mutationFn: () => api.post(`/email/unsubscribe?token=${encodeURIComponent(token)}`) });
  const done = unsubscribe.isSuccess;

  return (
    <div className="flex w-full max-w-sm flex-col items-center text-center">
      <Logo />
      <div className="mt-10 grid size-16 place-items-center rounded-2xl bg-card shadow-sm">
        {done ? <CircleCheck className="size-9 text-success" /> : <MailX className="size-8 text-muted-foreground" />}
      </div>
      <h1 className="mt-6 font-display text-4xl">{done ? "You're unsubscribed" : "Stop reminder emails?"}</h1>
      <p className="mt-2 text-muted-foreground">
        {done
          ? "We won't email you practice reminders or weekly summaries. Security notices about your account still come through."
          : "You'll stop getting practice reminders and weekly summaries by email. In-app reminders and security notices aren't affected."}
      </p>
      {unsubscribe.isError && (
        <p className="mt-3 text-sm text-danger">{unsubscribe.error instanceof ApiError ? unsubscribe.error.message : "Something went wrong. Please try again."}</p>
      )}
      {done ? (
        <ButtonLink href="/settings#notifications" variant="outline" className="mt-8">
          Notification settings
        </ButtonLink>
      ) : (
        <Button size="lg" className="mt-8 h-11 px-6" onClick={() => unsubscribe.mutate()} disabled={!token || unsubscribe.isPending} aria-busy={unsubscribe.isPending}>
          {unsubscribe.isPending && <Loader2 className="animate-spin" />} {unsubscribe.isPending ? "Unsubscribing…" : "Unsubscribe"}
        </Button>
      )}
    </div>
  );
}
