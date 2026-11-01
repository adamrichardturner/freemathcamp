"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, MailCheck, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { keys, useLogout } from "@/hooks/queries";
import { api, ApiError, type User } from "@/lib/api";
import { cn } from "@/lib/utils";

/** Shown in place of learner features until the account's email is confirmed. */
export function VerifyEmailCard({ user, compact = false }: { user: User; compact?: boolean }) {
  const qc = useQueryClient();
  const logout = useLogout();
  const resend = useMutation({
    mutationFn: () => api.post<{ sent: boolean; alreadyVerified: boolean }>("/auth/resend-verification"),
    onSuccess: (r) => {
      if (r.alreadyVerified) return void qc.invalidateQueries({ queryKey: keys.me });
      toast.success(`New link sent to ${user.email}`);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't send the email."),
  });
  const refresh = useMutation({
    mutationFn: () => qc.refetchQueries({ queryKey: keys.me }),
    onSuccess: () => {
      const fresh = qc.getQueryData<User | null>(keys.me);
      if (!fresh?.emailVerified) toast("Not confirmed yet — open the link in the email we sent.");
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("mx-auto flex max-w-lg flex-col items-center gap-4 rounded-3xl border bg-card text-center", compact ? "p-6" : "my-8 p-8 sm:p-10")}
    >
      <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-chart-4 text-white shadow-lg shadow-primary/25">
        <MailCheck className="size-7" />
      </span>
      <div>
        <h2 className="font-display text-3xl">Confirm your email</h2>
        <p className="mt-2 text-muted-foreground">
          We sent a link to <span className="font-medium text-foreground">{user.email}</span>. Open it to unlock practice, your dashboard and progress tracking. Lessons are open while you wait.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => refresh.mutate()} disabled={refresh.isPending || logout.busy}>
          {refresh.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />} I&apos;ve confirmed
        </Button>
        <Button variant="outline" onClick={() => resend.mutate()} disabled={resend.isPending || logout.busy}>
          {resend.isPending && <Loader2 className="animate-spin" />} Resend email
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Can&apos;t find it? Check spam, or{" "}
        <button
          type="button"
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline disabled:no-underline disabled:opacity-60"
          onClick={() => logout.mutate()}
          disabled={logout.busy}
        >
          {logout.busy && <Loader2 className="size-3 animate-spin" />} sign up with a different email
        </button>
        .
      </p>
    </motion.div>
  );
}
