"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, ChevronLeft, ChevronRight, Copy, KeyRound, Loader2, Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog, PasswordInput, passwordProblem } from "@/components/settings/settings-view";
import { Field } from "@/components/settings/settings-ui";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError, type AdminUser, type AdminUserDetail, type AdminUserPage } from "@/lib/api";
import { COURSE_ID } from "@/lib/course";
import { duration, pct, relative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { adminKeys } from "./admin-view";
import { useAction } from "@/hooks/use-action";

const PAGE_SIZE = 20;
const errorMessage = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);
const signInLabel = { password: "Password", google: "Google", both: "Password + Google" } as const;
const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function Initials({ user, className }: { user: Pick<AdminUser, "displayName" | "avatarUrl">; className?: string }) {
  const letters = user.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "?";
  return (
    <Avatar className={className}>
      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />}
      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-chart-4/20 text-xs font-semibold text-primary">{letters}</AvatarFallback>
    </Avatar>
  );
}

export function AdminUsers() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const q = useDeferredValue(query.trim());
  const { data, isPlaceholderData, isError } = useQuery({
    queryKey: adminKeys.users(q, page),
    queryFn: () => api.get<AdminUserPage>(`/admin/users?${new URLSearchParams({ q, page: String(page), pageSize: String(PAGE_SIZE) })}`),
    placeholderData: keepPreviousData,
  });
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <Card id="accounts">
      <CardHeader className="sm:grid-cols-[1fr_auto]">
        <div>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>{data ? `${data.total.toLocaleString()} ${q ? "matching" : "in total"}, newest first` : "Loading…"}</CardDescription>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, email or username"
            aria-label="Search accounts"
            className="pl-8"
            maxLength={100}
          />
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {isError ? (
          <p className="px-4 py-8 text-center text-muted-foreground">Couldn&apos;t load accounts.</p>
        ) : !data ? (
          <div className="space-y-2 px-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : (
          <div className={cn("overflow-x-auto transition-opacity", isPlaceholderData && "opacity-60")}>
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3 pl-4 font-medium">Learner</th>
                  <th className="px-3 py-2 font-medium">Sign-in</th>
                  <th className="px-3 py-2 text-right font-medium">Problems</th>
                  <th className="px-3 py-2 text-right font-medium">Mastered</th>
                  <th className="px-3 py-2 font-medium">Joined</th>
                  <th className="py-2 pr-4 pl-3 font-medium">Last active</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id} className="cursor-pointer border-b last:border-0 hover:bg-muted/50" onClick={() => setOpenId(u.id)}>
                    <td className="py-2 pr-3 pl-4">
                      <button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={() => setOpenId(u.id)}>
                        <Initials user={u} className="size-8" />
                        <span className="min-w-0">
                          <span className="flex items-center gap-1 font-medium">
                            <span className="truncate">{u.displayName}</span>
                            {u.emailVerified && <BadgeCheck className="size-3.5 shrink-0 text-primary" aria-label="Verified" />}
                            {u.isAdmin && (
                              <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                                Admin
                              </Badge>
                            )}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {u.email}
                            {u.username && ` · @${u.username}`}
                          </span>
                        </span>
                      </button>
                    </td>
                    <td className="px-3 text-xs text-muted-foreground">{signInLabel[u.signIn]}</td>
                    <td className="px-3 text-right tabular-nums">{u.problems.toLocaleString()}</td>
                    <td className="px-3 text-right tabular-nums">{u.mastered}</td>
                    <td className="px-3 text-xs whitespace-nowrap text-muted-foreground">{date(u.createdAt)}</td>
                    <td className="pr-4 pl-3 text-xs whitespace-nowrap text-muted-foreground">{u.lastActiveAt ? relative(u.lastActiveAt) : "Never"}</td>
                  </tr>
                ))}
                {data.users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No accounts match &ldquo;{q}&rdquo;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {data && pages > 1 && (
          <div className="flex items-center justify-between gap-2 border-t px-4 pt-3 text-sm">
            <span className="text-muted-foreground tabular-nums">
              Page {page} of {pages}
            </span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Previous page">
                <ChevronLeft />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Next page">
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
      <Sheet open={openId !== null} onOpenChange={(open) => !open && setOpenId(null)}>
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">{openId && <UserDetail id={openId} onDeleted={() => setOpenId(null)} />}</SheetContent>
      </Sheet>
    </Card>
  );
}

function UserDetail({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const { data, isError } = useQuery({ queryKey: adminKeys.user(id), queryFn: () => api.get<AdminUserDetail>(`/admin/users/${id}/${COURSE_ID}`) });
  if (isError)
    return (
      <SheetHeader>
        <SheetTitle>Account not found</SheetTitle>
        <SheetDescription>It may have just been deleted.</SheetDescription>
      </SheetHeader>
    );
  if (!data)
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-40" />
      </div>
    );
  const { user, stats } = data;
  const facts: [string, string][] = [
    ["Username", user.username ? `@${user.username}` : "Not chosen yet"],
    ["Joined", date(user.createdAt)],
    ["Last active", user.lastActiveAt ? relative(user.lastActiveAt) : "Never"],
    ["Sign-in", signInLabel[user.signIn]],
    ["Last sign-in IP", user.lastLoginIp ?? "—"],
    ["Course mode", user.learningMode === "path" ? "Path" : "Audit"],
    ["Daily goal", `${user.dailyGoal} problems`],
    ["Time zone", user.timezone],
    ["Tour", user.onboarded ? "Seen" : "Not seen"],
  ];

  return (
    <>
      <SheetHeader className="border-b">
        <div className="flex items-center gap-3">
          <Initials user={user} className="size-11" />
          <div className="min-w-0">
            <SheetTitle className="flex items-center gap-1.5 text-base">
              <span className="truncate">{user.displayName}</span>
              {user.isAdmin && <Badge variant="secondary">Admin</Badge>}
            </SheetTitle>
            <SheetDescription className="truncate">
              {user.email} · {user.emailVerified ? "verified" : "unverified"}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>
      <div className="space-y-6 p-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Mini label="Mastered" value={`${stats.mastered}/${stats.totalLessons}`} />
          <Mini label="Started" value={String(stats.started)} />
          <Mini label="Streak" value={`${stats.streak.current}d`} />
          <Mini label="Problems, 30d" value={stats.last30.problems.toLocaleString()} />
          <Mini label="First try, 30d" value={stats.last30.accuracy === null ? "—" : pct(stats.last30.accuracy)} />
          <Mini label="Time, 30d" value={duration(stats.last30.timeMs)} />
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          {facts.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="truncate font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Recent sessions</h3>
          {data.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completed practice yet{stats.progressResets ? ` (progress reset ${stats.progressResets}×)` : ""}.</p>
          ) : (
            <ul className="divide-y rounded-lg border text-sm">
              {data.sessions.map((s) => (
                <li key={s.id} className="flex items-center gap-2 px-3 py-2">
                  <span className="w-20 shrink-0 rounded-full bg-muted px-2 py-0.5 text-center text-xs capitalize">{s.mode}</span>
                  <span className="min-w-0 flex-1 truncate">{s.title}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {pct(s.masteryBefore)} → {pct(s.masteryAfter ?? s.masteryBefore)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <PasswordActions user={user} />
        <DangerActions user={user} onDeleted={onDeleted} />
      </div>
    </>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/60 px-2 py-2">
      <div className="text-sm font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

const useRefreshAdmin = () => {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["admin"] });
};

function PasswordActions({ user }: { user: AdminUserDetail["user"] }) {
  const refresh = useRefreshAdmin();
  const [password, setPassword] = useState("");
  const [temporary, setTemporary] = useState<string | null>(null);
  const problem = passwordProblem(password);
  const set = useAction({
    mutationFn: (body: { password?: string }) => api.post<{ signedOutSessions: number; temporaryPassword: string | null }>(`/admin/users/${user.id}/password`, body),
    onSuccess: (r) => {
      setPassword("");
      setTemporary(r.temporaryPassword);
      toast.success(`${r.temporaryPassword ? "Temporary password created" : "Password set"} · signed out ${r.signedOutSessions} session${r.signedOutSessions === 1 ? "" : "s"}`);
      return refresh();
    },
    onError: (e) => toast.error(errorMessage(e, "Couldn't change the password.")),
  });
  return (
    <section className="space-y-3 rounded-xl border p-4">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="size-4 text-muted-foreground" /> Password
        </h3>
        <p className="text-xs text-muted-foreground">Either way, the learner is signed out everywhere and gets a notice by email.</p>
      </div>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (password && !problem) set.mutate({ password });
        }}
      >
        <Field id="adminNewPassword" label="Set a new password" error={problem}>
          <PasswordInput id="adminNewPassword" value={password} onChange={setPassword} autoComplete="new-password" />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={!password || !!problem || set.isPending}>
            {set.isPending && set.variables?.password && <Loader2 className="animate-spin" />} Set password
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={set.isPending} onClick={() => set.mutate({})}>
            {set.isPending && !set.variables?.password && <Loader2 className="animate-spin" />} Reset to a temporary password
          </Button>
        </div>
      </form>
      {temporary && (
        <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
          <span className="text-muted-foreground">Temporary:</span>
          <code className="flex-1 font-mono font-semibold select-all">{temporary}</code>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Copy temporary password"
            onClick={() => navigator.clipboard.writeText(temporary).then(() => toast.success("Copied"), () => toast.error("Couldn't copy"))}
          >
            <Copy />
          </Button>
        </div>
      )}
    </section>
  );
}

function DangerActions({ user, onDeleted }: { user: AdminUserDetail["user"]; onDeleted: () => void }) {
  const refresh = useRefreshAdmin();
  const reset = useAction({
    mutationFn: () => api.post(`/admin/users/${user.id}/reset-progress`, { courseId: COURSE_ID }),
    onSuccess: () => {
      toast.success(`Reset ${user.displayName}'s progress`);
      return refresh();
    },
    onError: (e) => toast.error(errorMessage(e, "Couldn't reset progress.")),
  });
  const del = useAction({
    mutationFn: () => api.delete(`/admin/users/${user.id}`, { confirmEmail: user.email }),
    onSuccess: () => {
      onDeleted();
      toast.success(`Deleted ${user.email}`);
      return refresh();
    },
    onError: (e) => toast.error(errorMessage(e, "Couldn't delete the account.")),
  });
  return (
    <section className="space-y-3 rounded-xl border border-danger/30 p-4">
      <h3 className="text-sm font-semibold text-danger">Danger zone</h3>
      <div className="flex flex-wrap gap-2">
        <ConfirmDialog
          trigger="Reset progress"
          title={`Reset ${user.displayName}'s progress?`}
          description="Their mastery, review schedule and practice history for Foundations are permanently removed. The account stays, and they're notified."
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
        {!user.isAdmin && (
          <ConfirmDialog
            trigger="Delete account"
            title={`Delete ${user.email}?`}
            description="The account and everything it owns (progress, answers, sessions and notifications) are deleted immediately. This can't be undone."
            phrase={user.email}
            phraseLabel={
              <>
                Type <span className="font-mono font-semibold">{user.email}</span> to confirm
              </>
            }
            confirmLabel="Delete forever"
            pending={del.isPending}
            onConfirm={() => del.mutateAsync()}
          />
        )}
      </div>
    </section>
  );
}
