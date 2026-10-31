"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, CircleX, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { ButtonLink } from "@/components/app/button-link";
import { Logo } from "@/components/app/logo";
import { keys } from "@/hooks/queries";
import { api, ApiError, type User } from "@/lib/api";

/** Landing page for the link in the verification email. */
export function VerifyEmailView() {
  const token = useSearchParams().get("token");
  const qc = useQueryClient();
  const verify = useMutation({
    mutationFn: (t: string) => api.post<{ user: User }>("/auth/verify-email", { token: t }),
    onSuccess: ({ user }) => qc.setQueryData(keys.me, user),
  });
  // Tokens are single-use: post exactly once, even under StrictMode.
  const sent = useRef(false);
  const { mutate } = verify;
  useEffect(() => {
    if (token && !sent.current) {
      sent.current = true;
      mutate(token);
    }
  }, [token, mutate]);

  const failed = !token || verify.isError;
  return (
    <div className="flex w-full max-w-sm flex-col items-center text-center">
      <Logo />
      <div className="mt-10 grid size-16 place-items-center rounded-2xl bg-card shadow-sm">
        {verify.isSuccess ? <CircleCheck className="size-9 text-success" /> : failed ? <CircleX className="size-9 text-danger" /> : <Loader2 className="size-8 animate-spin text-muted-foreground" />}
      </div>
      <h1 className="mt-6 font-display text-4xl">{verify.isSuccess ? "Email confirmed" : failed ? "Link not valid" : "Confirming…"}</h1>
      <p className="mt-2 text-muted-foreground">
        {verify.isSuccess
          ? `You're all set, ${verify.data.user.displayName.split(" ")[0]}. Your plan for today is ready.`
          : failed
            ? verify.error instanceof ApiError
              ? verify.error.message
              : "This link is missing its token. Use the button in the email we sent."
            : "One moment while we check your link."}
      </p>
      {verify.isSuccess && (
        <ButtonLink href="/learn" size="lg" className="mt-8 h-11 px-6">
          Start learning
        </ButtonLink>
      )}
      {failed && (
        <ButtonLink href="/learn" variant="outline" className="mt-8">
          Go to my account
        </ButtonLink>
      )}
    </div>
  );
}
