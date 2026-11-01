"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AtSign, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { keys, useSession } from "@/hooks/queries";
import { api, ApiError, type User } from "@/lib/api";
import { suggestUsername, UsernameInput, useUsernameCheck } from "./username-field";

/**
 * Accounts made before usernames existed (and Google sign-ups) have none yet.
 * They're asked once signed in, and the prompt stays until one is chosen.
 */
export function UsernamePrompt() {
  const { user, ready } = useSession();
  const open = ready && !!user && !user.username;

  return (
    <Dialog open={open} disablePointerDismissal>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <div className="flex gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <AtSign className="size-5" />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-xl">Choose a username</DialogTitle>
            <DialogDescription className="mt-1 leading-relaxed">
              Every FreeMathCamp account now has one. It&apos;s how other learners see you in leagues; your name and email stay private.
            </DialogDescription>
          </div>
        </div>
        {user && <UsernameForm email={user.email} />}
      </DialogContent>
    </Dialog>
  );
}

/** Starts from a suggestion based on their email, which they can keep or change. */
function UsernameForm({ email }: { email: string }) {
  const qc = useQueryClient();
  const [value, setValue] = useState(() => suggestUsername(email));
  const check = useUsernameCheck(value);
  const save = useMutation({
    mutationFn: () => api.patch<{ user: User }>("/me/username", { username: value.trim() }),
    onSuccess: ({ user: u }) => qc.setQueryData(keys.me, u),
  });
  const serverError = save.error instanceof ApiError ? save.error.message : save.error ? "Couldn't save your username. Try again." : undefined;
  const canSave = check.status === "available" && !save.isPending;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSave) save.mutate();
      }}
    >
      <fieldset disabled={save.isPending} className="min-w-0 space-y-1.5">
        <Label htmlFor="prompt-username">Username</Label>
        <UsernameInput
          id="prompt-username"
          value={value}
          onChange={(v) => {
            setValue(v);
            save.reset();
          }}
          check={check}
          serverError={serverError}
          autoFocus
        />
      </fieldset>
      <Button type="submit" className="w-full" disabled={!canSave} aria-busy={save.isPending}>
        {save.isPending && <Loader2 className="animate-spin" />} Save username
      </Button>
    </form>
  );
}
