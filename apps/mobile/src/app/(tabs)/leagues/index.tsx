import { useState } from "react";
import { Pressable, RefreshControl, View } from "react-native";
import { Reveal } from "@/components/reveal";
import { standing, TierBadge, tierColour, useTimeLeft, ZonePill } from "@/components/league";
import { Button, Card, CardHeader, Icon, Screen, Separator, Skeleton, Text } from "@/components/ui";
import type { League } from "@/lib/api";
import { useLeague, useLeagueOptIn } from "@/lib/queries";
import { alpha, useTheme } from "@/lib/theme";

/** The web's /leagues page: this week's table, last week's result, the tiers and how XP works. */
export default function Leagues() {
  const { data, refetch, isRefetching } = useLeague();
  return (
    <Screen title="Leagues" refreshControl={data ? <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} /> : undefined}>
      <Text muted>Weekly tables of learners at your level. Solve problems, earn XP, move up.</Text>
      <Reveal
        ready={!!data}
        gap={20}
        skeleton={
          <>
            <Skeleton height={180} />
            <Skeleton height={320} />
          </>
        }
      >
        {data && (
          <>
            {data.lastWeek && <LastWeek last={data.lastWeek} />}
            {data.optedIn ? <Standing league={data} /> : <Join league={data} />}
            {data.optedIn && data.cohort && <Table cohort={data.cohort} />}
            <Tiers league={data} />
            <HowItWorks />
          </>
        )}
      </Reveal>
    </Screen>
  );
}

function Standing({ league }: { league: League }) {
  const { tier, cohort } = league;
  const colour = tierColour(tier.index);
  const s = cohort && standing(cohort, tier.index, league.tiers.length);
  const timeLeft = useTimeLeft(league.week.endsAt);
  const optIn = useLeagueOptIn();
  return (
    <Card style={{ padding: 16, gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <TierBadge index={tier.index} size={72} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title" style={{ color: colour }}>
            {tier.name} League
          </Text>
          <Text variant="small" muted>
            {cohort ? `#${cohort.rank} of ${cohort.size} · ${timeLeft}` : timeLeft}
          </Text>
        </View>
      </View>
      {s ? (
        <View style={{ gap: 6 }}>
          <ZonePill zone={s.zone} />
          <Text variant="small">{s.hint}</Text>
        </View>
      ) : (
        <Text variant="small" muted>
          Solve a problem this week and you'll be placed in a {tier.name} league with up to 30 learners.
        </Text>
      )}
      <View style={{ flexDirection: "row", gap: 24 }}>
        <View>
          <Text variant="caption" muted>
            This week
          </Text>
          <Text variant="title">{(cohort?.xp ?? 0).toLocaleString()} XP</Text>
        </View>
        <View>
          <Text variant="caption" muted>
            All time
          </Text>
          <Text variant="title">{league.lifetimeXp.toLocaleString()} XP</Text>
        </View>
      </View>
      <Button title="Leave the leagues" variant="ghost" size="sm" loading={optIn.isPending} onPress={() => optIn.mutate(false)} style={{ alignSelf: "flex-start", paddingHorizontal: 0 }} />
    </Card>
  );
}

function Join({ league }: { league: League }) {
  const optIn = useLeagueOptIn();
  return (
    <Card featured style={{ padding: 16, gap: 10 }}>
      <Icon name="trophy.fill" size={28} tone="chart4" />
      <Text variant="title">Compete in weekly leagues</Text>
      <Text variant="small" muted>
        Join a table of up to 30 learners in your tier. Every problem you solve earns XP; finish near the top to move up from Bronze towards Obsidian. Others see only{" "}
        <Text variant="small" weight="medium">
          @{league.username ?? "your username"}
        </Text>{" "}
        and your XP.
      </Text>
      <Text variant="caption" muted>
        You have {league.lifetimeXp.toLocaleString()} XP so far, and this week's counts as soon as you join.
      </Text>
      <Button title="Join this week's league" icon="trophy" loading={optIn.isPending} disabled={!league.username} onPress={() => optIn.mutate(true)} />
    </Card>
  );
}

function LastWeek({ last }: { last: NonNullable<League["lastWeek"]> }) {
  const { c } = useTheme();
  const tone = last.result === "promoted" ? c.success : last.result === "demoted" ? c.danger : c.mutedForeground;
  const week = new Date(last.weekStart).toLocaleDateString("en", { day: "numeric", month: "short", timeZone: "UTC" });
  const moved = last.result === "promoted" || last.result === "demoted";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: moved ? alpha(tone, 0.3) : c.border, backgroundColor: moved ? alpha(tone, 0.06) : undefined }}>
      <Icon name={last.result === "promoted" ? "arrow.up" : last.result === "demoted" ? "arrow.down" : "trophy"} size={16} color={tone} />
      <Text variant="small" style={{ flex: 1 }}>
        Week of {week}: you finished <Text variant="small" weight="semibold">#{last.rank}</Text> in {last.tier.name}
        {moved ? (last.result === "promoted" ? " and were promoted." : " and moved down a league.") : " and held your place."}
      </Text>
    </View>
  );
}

function Table({ cohort }: { cohort: NonNullable<League["cohort"]> }) {
  const { c } = useTheme();
  const { members, promote, demote } = cohort;
  return (
    <Card>
      <CardHeader
        title="This week's table"
        subtitle={`${promote > 0 ? `Top ${promote} move up` : "The top league: no promotions"}${cohort.promotionMinXp !== null && promote > 0 ? ` (with at least ${cohort.promotionMinXp} XP)` : ""}${demote > 0 ? ` · bottom ${demote} move down` : ""}`}
      />
      <View style={{ paddingVertical: 8 }}>
        {members.map((m, i) => (
          <View key={m.username}>
            {promote > 0 && i === promote && <ZoneDivider label="Promotion zone ↑" color={c.success} />}
            {demote > 0 && i === members.length - demote && <ZoneDivider label="Demotion zone ↓" color={c.danger} />}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: m.you ? alpha(c.primary, 0.08) : i < promote ? alpha(c.success, 0.04) : undefined }}>
              <Text variant="small" muted style={{ width: 26 }}>
                {m.rank}
              </Text>
              <Text weight={m.you ? "semibold" : "medium"} numberOfLines={1} style={{ flex: 1 }}>
                @{m.username}
                {m.you ? "  (you)" : ""}
              </Text>
              <Text variant="small" weight="semibold">
                {m.xp.toLocaleString()} <Text variant="caption" muted>XP</Text>
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

function ZoneDivider({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 4 }}>
      <View style={{ flex: 1, height: 1, borderTopWidth: 1, borderStyle: "dashed", borderColor: alpha(color, 0.5) }} />
      <Text variant="caption" weight="semibold" style={{ color, fontSize: 10 }}>
        {label}
      </Text>
      <View style={{ flex: 1, height: 1, borderTopWidth: 1, borderStyle: "dashed", borderColor: alpha(color, 0.5) }} />
    </View>
  );
}

function Tiers({ league }: { league: League }) {
  return (
    <Card>
      <CardHeader title="Tiers" />
      <View style={{ padding: 16, gap: 10 }}>
        {[...league.tiers].reverse().map((name, r) => {
          const index = league.tiers.length - 1 - r;
          const here = index === league.tier.index;
          return (
            <View key={name} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <TierBadge index={index} size={32} dim={index > league.tier.index} />
              <Text weight="medium" muted={index > league.tier.index} style={{ flex: 1 }}>
                {name}
              </Text>
              {here && <Text variant="caption" weight="semibold" tone="primary">You're here</Text>}
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const HOW: { title: string; body: string[] }[] = [
  {
    title: "Earning XP",
    body: [
      "Each problem you solve earns XP, more for harder ones: Warm-up 10, Core 15, Stretch 20.",
      "First-try answers keep it all. After one wrong attempt you get half, after more a quarter, and using a hint takes off a quarter. Revealing the answer earns nothing.",
    ],
  },
  {
    title: "Weeks, promotion and demotion",
    body: [
      "Weeks run Monday to Sunday (UTC). Your first solved problem each week places you in a table of up to 30 learners in your tier.",
      "When the week ends, the top fifth move up a tier (with at least 150 XP) and the bottom fifth of a table of five or more move down. Ties go to whoever reached the score first.",
    ],
  },
  { title: "Privacy", body: ["Other learners see only your username and XP, never your name or email. Leave any time and you disappear from this week's table."] },
];

function HowItWorks() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <Card>
      <CardHeader title="How XP works" />
      <View style={{ paddingVertical: 6 }}>
        {HOW.map((h, i) => (
          <View key={h.title}>
            {i > 0 && <Separator inset={16} />}
            <Pressable onPress={() => setOpen(open === i ? null : i)} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text weight="medium" style={{ flex: 1 }}>
                {h.title}
              </Text>
              <Icon name={open === i ? "chevron.up" : "chevron.down"} size={13} tone="muted" />
            </Pressable>
            {open === i && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}>
                {h.body.map((p) => (
                  <Text key={p} variant="small" muted>
                    {p}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>
    </Card>
  );
}
