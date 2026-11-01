"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Clock, ShieldAlert, Target, TrendingUp, Users } from "lucide-react";
import { ButtonLink } from "@/components/app/button-link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/queries";
import { api, ApiError, type AdminOverview } from "@/lib/api";
import { COURSE_ID } from "@/lib/course";
import { duration, pct } from "@/lib/format";
import { AdminCharts, AdminTime, LessonTable } from "./admin-charts";
import { AdminUsers } from "./admin-users";

export const adminKeys = {
  overview: ["admin", "overview", COURSE_ID] as const,
  users: (q: string, page: number) => ["admin", "users", q, page] as const,
  user: (id: string) => ["admin", "user", id] as const,
};

/**
 * The admin panel. The page is hidden from everyone but the admin, but that's
 * only cosmetic: every /api/admin route refuses anyone else on the server.
 */
export function AdminView() {
  const { user, ready } = useSession();
  const allowed = !!user?.isAdmin;
  const overview = useQuery({ queryKey: adminKeys.overview, queryFn: () => api.get<AdminOverview>(`/admin/overview/${COURSE_ID}`), enabled: allowed });

  if (!ready) return <AdminSkeleton />;
  if (!allowed || (overview.error instanceof ApiError && overview.error.status === 403)) return <NoAccess />;
  if (overview.isError)
    return <p className="py-20 text-center text-muted-foreground">Couldn&apos;t load the admin panel. Refresh to try again.</p>;
  if (!overview.data) return <AdminSkeleton />;
  const t = overview.data.totals;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Badge variant="secondary">Admin</Badge>
        <h1 className="font-display text-4xl sm:text-5xl">Who is learning</h1>
        <p className="max-w-2xl text-muted-foreground">
          {t.users.toLocaleString()} {t.users === 1 ? "account" : "accounts"}, {t.active7.toLocaleString()} practised in the last 7 days, and {pct(t.accuracy)} of{" "}
          {t.problems.toLocaleString()} problems were solved first time.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Users} label="Accounts" value={t.users.toLocaleString()} sub={`${t.signups7} new in 7 days · ${t.signups30} in 30`} />
        <Kpi icon={Activity} label="Active learners" value={t.active7.toLocaleString()} sub={`${t.active30} in 30 days · ${t.verified} verified`} />
        <Kpi icon={Target} label="Problems solved" value={t.problems.toLocaleString()} sub={`${t.sessionsCompleted.toLocaleString()} sessions completed`} />
        <Kpi icon={TrendingUp} label="First-try accuracy" value={pct(t.accuracy)} sub={`${t.cleanSolves.toLocaleString()} clean solves`} />
      </section>

      <AdminTime time={overview.data.time} />
      <AdminCharts overview={overview.data} />
      <LessonTable lessons={overview.data.lessons} />
      <AdminUsers />

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="size-3.5" /> Learners have spent {duration(t.timeMs)} practising in total.
      </p>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: string; sub: string }) {
  return (
    <Card className="gap-0 py-4">
      <CardContent className="px-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Icon className="size-4 text-primary" /> {label}
        </div>
        <div className="mt-1 text-2xl font-semibold tabular-nums sm:text-3xl">{value}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

function NoAccess() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <ShieldAlert className="size-7" />
      </span>
      <h1 className="font-display text-4xl">No access</h1>
      <p className="text-muted-foreground">This page is only available to the FreeMathCamp team.</p>
      <ButtonLink href="/learn">Back to your dashboard</ButtonLink>
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full max-w-xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
