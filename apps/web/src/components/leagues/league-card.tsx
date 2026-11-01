"use client";

import { ArrowRight, Loader2, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useLeague, useLeagueOptIn, useSession } from "@/hooks/queries";
import { cn } from "@/lib/utils";
import { standing, TierBadge, tierColour, useTimeLeft, ZonePill } from "./league-ui";

/** The dashboard's league summary: tier, rank and XP this week, the nearest rivals, and the opt-in switch. */
export function LeagueCard() {
  const { user, verified } = useSession();
  const { data } = useLeague(verified);
  const optIn = useLeagueOptIn();
  if (!data || !user) return <Skeleton className="h-56 rounded-xl" />;
  const joined = optIn.isPending ? !!optIn.variables : data.optedIn;
  const { tier, cohort } = data;
  const s = cohort && standing(cohort, tier.index, data.tiers.length);
  // Up to three rows around you, so the card shows who's just ahead and behind.
  const around = cohort ? cohort.members.slice(Math.max(0, cohort.rank - 2), Math.max(0, cohort.rank - 2) + 3) : [];

  return (
    <Card className="gap-3">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-4 text-chart-4" /> Leagues
        </CardTitle>
        <label htmlFor="dashboard-league" className="flex items-center gap-2 text-xs text-muted-foreground">
          {optIn.isPending && <Loader2 className="size-3.5 animate-spin" />}
          {joined ? "Competing" : "Not joined"}
          <Switch id="dashboard-league" aria-label="Compete in leagues" size="sm" checked={joined} disabled={optIn.isPending || !user.username} aria-busy={optIn.isPending} onCheckedChange={(on) => optIn.mutate(on)} />
        </label>
      </CardHeader>
      <CardContent className="space-y-3">
        {!data.optedIn ? (
          <p className="text-sm text-muted-foreground">
            Join a weekly table of learners at your level. Each problem you solve earns XP, and the top of the table moves up a tier. You&apos;d appear as <span className="font-medium text-foreground">@{user.username}</span>.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <TierBadge index={tier.index} name={tier.name} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold" style={{ color: tierColour(tier.index) }}>
                  {tier.name} League
                </div>
                <div className="text-xs text-muted-foreground">{cohort ? `#${cohort.rank} of ${cohort.size}` : "Solve a problem to be placed"}</div>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1 text-2xl font-semibold tabular-nums">
                  <Zap className="size-4 text-chart-4" />
                  {(cohort?.xp ?? 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-muted-foreground">XP this week</div>
              </div>
            </div>
            {s && (
              <div className="flex flex-wrap items-center gap-2">
                <ZonePill zone={s.zone} />
                <span className="text-xs text-muted-foreground">{s.hint}</span>
              </div>
            )}
            {around.length > 0 && (
              <ol className="divide-y rounded-lg border text-sm">
                {around.map((m) => (
                  <li key={m.username} className={cn("flex items-center gap-2 px-3 py-1.5", m.you && "bg-primary/[0.07] font-medium")}>
                    <span className="w-6 text-muted-foreground tabular-nums">{m.rank}</span>
                    <span className="min-w-0 flex-1 truncate">@{m.username}</span>
                    <span className="tabular-nums">{m.xp.toLocaleString()} XP</span>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <WeekLeft endsAt={data.week.endsAt} />
          <Link href="/leagues" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            {data.optedIn ? "Full table" : "How leagues work"} <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function WeekLeft({ endsAt }: { endsAt: string }) {
  return <span>Week ends · {useTimeLeft(endsAt)}</span>;
}
