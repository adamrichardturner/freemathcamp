"use client";

import { ArrowDown, ArrowUp, Clock, Loader2, Sparkles, Trophy, Zap } from "lucide-react";
import { motion } from "motion/react";
import { Fragment } from "react";
import { VerifyEmailCard } from "@/components/app/verify-email-card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLeague, useLeagueOptIn, useSession } from "@/hooks/queries";
import type { League } from "@/lib/api";
import { cn } from "@/lib/utils";
import { standing, TierBadge, tierColour, useTimeLeft, ZonePill } from "./league-ui";

const weekLabel = (start: string) => new Date(`${start}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });

export function LeaguesView() {
  const { user, ready, verified } = useSession();
  const { data, isLoading } = useLeague(verified);
  if (ready && user && !verified) return <VerifyEmailCard user={user} />;
  if (isLoading || !data) return <LeaguesSkeleton />;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl">Leagues</h1>
          <p className="mt-1 text-muted-foreground">Weekly tables of learners at your level. Solve problems, earn XP, move up.</p>
        </div>
        <WeekClock league={data} />
      </header>

      {!data.optedIn ? <JoinCard league={data} /> : <Hero league={data} />}
      {data.lastWeek && <LastWeek last={data.lastWeek} />}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">{data.optedIn && <Standings league={data} />}</div>
        <div className="space-y-6">
          <Ladder league={data} />
          <HowItWorks />
          {data.optedIn && <LeaveCard />}
        </div>
      </div>
    </div>
  );
}

function WeekClock({ league }: { league: League }) {
  const left = useTimeLeft(league.week.endsAt);
  return (
    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Clock className="size-4" /> Week of {weekLabel(league.week.start)} · <span className="font-medium text-foreground tabular-nums">{left}</span>
    </p>
  );
}

function Hero({ league }: { league: League }) {
  const { tier, cohort } = league;
  const colour = tierColour(tier.index);
  const s = cohort && standing(cohort, tier.index, league.tiers.length);
  return (
    <Card className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(120% 90% at 0% 0%, color-mix(in oklch, ${colour} 16%, transparent), transparent 60%)` }} />
      <CardContent className="relative grid gap-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <div className="flex items-center gap-4">
          <TierBadge index={tier.index} name={tier.name} size="lg" />
          <div>
            <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: colour }}>
              {tier.name} League
            </div>
            {cohort ? (
              <div className="font-display text-4xl leading-tight tabular-nums">
                #{cohort.rank} <span className="text-xl text-muted-foreground">of {cohort.size}</span>
              </div>
            ) : (
              <div className="font-display text-3xl leading-tight">Placing you…</div>
            )}
            <div className="text-sm text-muted-foreground">@{league.username}</div>
          </div>
        </div>

        <div className="space-y-2 sm:px-4">
          {cohort && s ? (
            <>
              <ZonePill zone={s.zone} />
              <p className="text-sm">{s.hint}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Placing you in this week&apos;s {tier.name} table…</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-1 sm:text-right">
          <div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground sm:justify-end">
              <Zap className="size-3.5 text-chart-4" /> This week
            </div>
            <motion.div key={cohort?.xp ?? 0} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-3xl font-semibold tabular-nums">
              {(cohort?.xp ?? 0).toLocaleString()} <span className="text-base font-medium text-muted-foreground">XP</span>
            </motion.div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground sm:justify-end">
              <Sparkles className="size-3.5 text-primary" /> All time
            </div>
            <div className="text-lg font-semibold tabular-nums">{league.lifetimeXp.toLocaleString()} XP</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function JoinCard({ league }: { league: League }) {
  const optIn = useLeagueOptIn();
  return (
    <Card className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_0%_0%,color-mix(in_oklch,var(--chart-4)_14%,transparent),transparent_60%)]" />
      <CardContent className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-chart-4/15 text-chart-4">
          <Trophy className="size-8" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-xl font-semibold">Compete in weekly leagues</h2>
          <p className="text-sm text-muted-foreground">
            Join a weekly table with everyone in your tier, starting in Bronze. Every problem you solve earns XP; finish near the top to move up from Bronze towards Obsidian. Others see only{" "}
            <span className="font-medium text-foreground">@{league.username ?? "your username"}</span> and your XP.
          </p>
          <p className="text-xs text-muted-foreground">
            You have {league.lifetimeXp.toLocaleString()} XP so far, and this week&apos;s counts as soon as you join.
          </p>
        </div>
        <Button size="lg" onClick={() => optIn.mutate(true)} disabled={optIn.isPending || !league.username}>
          {optIn.isPending && <Loader2 className="animate-spin" />} Join the leagues
        </Button>
      </CardContent>
    </Card>
  );
}

function LastWeek({ last }: { last: NonNullable<League["lastWeek"]> }) {
  const moved = last.result === "promoted" || last.result === "demoted";
  const Icon = last.result === "promoted" ? ArrowUp : last.result === "demoted" ? ArrowDown : Trophy;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
        last.result === "promoted" && "border-success/30 bg-success/[0.06]",
        last.result === "demoted" && "border-danger/30 bg-danger/[0.05]",
      )}
    >
      <Icon className={cn("size-4 shrink-0", last.result === "promoted" ? "text-success" : last.result === "demoted" ? "text-danger" : "text-muted-foreground")} />
      <span>
        Week of {weekLabel(last.weekStart)}: you finished <span className="font-semibold">#{last.rank}</span> in {last.tier.name}
        {moved ? (last.result === "promoted" ? " and were promoted." : " and moved down a league.") : " and held your place."}
      </span>
    </div>
  );
}

function Standings({ league }: { league: League }) {
  const cohort = league.cohort;
  if (!cohort)
    return (
      <Card>
        <CardHeader>
          <CardTitle>This week&apos;s table</CardTitle>
          <CardDescription>You&apos;ll appear here after your first solved problem this week.</CardDescription>
        </CardHeader>
      </Card>
    );
  const { members, promote, demote } = cohort;
  const demoteFrom = members.length - demote;
  return (
    <Card>
      <CardHeader>
        <CardTitle>This week&apos;s table</CardTitle>
        <CardDescription>
          {promote > 0 ? `Top ${promote} move up` : "The top league: no promotions"}
          {cohort.promotionMinXp !== null && promote > 0 ? ` (with at least ${cohort.promotionMinXp} XP)` : ""}
          {demote > 0 ? `, bottom ${demote} move down.` : "."}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:px-4">
        <ol className="space-y-1" aria-label="League standings">
          {members.map((m, i) => (
            <Fragment key={m.username}>
              {demote > 0 && i === demoteFrom && <ZoneDivider tone="danger" label="Demotion zone" />}
              <motion.li
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.025, 0.4) }}
                aria-current={m.you ? "true" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-2 py-2 text-sm",
                  m.you ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/60",
                  i < promote && !m.you && "bg-success/[0.05]",
                  i >= demoteFrom && demote > 0 && !m.you && "bg-danger/[0.04]",
                )}
              >
                <span className={cn("w-7 shrink-0 text-center font-semibold tabular-nums", i < 3 ? "text-warning" : "text-muted-foreground")}>{m.rank}</span>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold uppercase" aria-hidden>
                  {m.username[0]}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  @{m.username}
                  {m.you && <span className="ml-1.5 text-xs font-normal text-primary">(you)</span>}
                </span>
                <span className="font-semibold tabular-nums">
                  {m.xp.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">XP</span>
                </span>
              </motion.li>
              {promote > 0 && i === promote - 1 && i < members.length - 1 && <ZoneDivider tone="success" label="Promotion zone" />}
            </Fragment>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function ZoneDivider({ tone, label }: { tone: "success" | "danger"; label: string }) {
  return (
    <li role="separator" className={cn("flex items-center gap-2 px-2 py-1 text-[10px] font-semibold tracking-widest uppercase", tone === "success" ? "text-success" : "text-danger")}>
      {tone === "success" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {label}
      <span className={cn("h-px flex-1", tone === "success" ? "bg-success/30" : "bg-danger/30")} />
    </li>
  );
}

function Ladder({ league }: { league: League }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>The tiers</CardTitle>
        <CardDescription>Everyone starts in Bronze.</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-1.5">
          {[...league.tiers].reverse().map((name, ri) => {
            const index = league.tiers.length - 1 - ri;
            const here = index === league.tier.index;
            return (
              <li key={name} className={cn("flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm", here && "bg-muted")} aria-current={here ? "true" : undefined}>
                <TierBadge index={index} size="sm" className={cn(index > league.tier.index && "opacity-50")} />
                <span className={cn("flex-1 font-medium", index > league.tier.index && "text-muted-foreground")}>{name}</span>
                {here && <span className="text-xs font-semibold text-primary">You{league.optedIn ? "" : " (not joined)"}</span>}
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

function HowItWorks() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>How XP works</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion>
          <AccordionItem value="xp">
            <AccordionTrigger>Earning XP</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p>Each problem you solve earns XP, more for harder ones: Warm-up 10, Core 15, Stretch 20.</p>
              <p>First-try answers keep it all. After one wrong attempt you get half, after more a quarter, and using a hint takes off a quarter. Revealing the answer earns nothing.</p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="weeks">
            <AccordionTrigger>Weeks, promotion and demotion</AccordionTrigger>
            <AccordionContent className="space-y-2 text-sm text-muted-foreground">
              <p>Weeks run Monday to Sunday (UTC). Once you&apos;ve joined, you&apos;re placed automatically each week in a table with everyone in your tier, starting in Bronze.</p>
              <p>When the week ends, the top fifth move up a tier (with at least 150 XP) and the bottom fifth of a table of five or more move down. Ties go to whoever reached the score first.</p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="privacy">
            <AccordionTrigger>Privacy</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">Other learners see only your username and XP, never your name or email. Leave any time and you disappear from this week&apos;s table.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

function LeaveCard() {
  const optIn = useLeagueOptIn();
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm">
      <span className="text-muted-foreground">Rather practise without a table?</span>
      <Button variant="outline" size="sm" onClick={() => optIn.mutate(false)} disabled={optIn.isPending}>
        {optIn.isPending && <Loader2 className="animate-spin" />} Leave leagues
      </Button>
    </div>
  );
}

function LeaguesSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 w-72" />
      <Skeleton className="h-40 rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}
