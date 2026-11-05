import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Switch, View } from "react-native";
import type { League } from "@/lib/api";
import { useLeague, useLeagueOptIn, useSession } from "@/lib/queries";
import { alpha, useTheme } from "@/lib/theme";
import { Card, CardHeader, Icon, Pill, Skeleton, Text } from "./ui";

/** One colour per tier, readable on light and dark backgrounds (as on the web). */
export const TIER_COLOURS = ["#b26b34", "#7f8ea3", "#d4a017", "#2fa39a", "#3b82f6", "#7c3aed"] as const;
export const tierColour = (index: number) => TIER_COLOURS[index] ?? TIER_COLOURS[0];

export function TierBadge({ index, size = 48, dim }: { index: number; size?: number; dim?: boolean }) {
  const colour = tierColour(index);
  return (
    <LinearGradient
      colors={[alpha(colour, 0.3), alpha(colour, 0.1)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size * 0.3, borderCurve: "continuous", alignItems: "center", justifyContent: "center", opacity: dim ? 0.5 : 1 }}
    >
      <Icon name="shield.fill" size={size * 0.58} color={alpha(colour, 0.45)} />
      <Text weight="bold" style={{ position: "absolute", color: colour, fontSize: size * 0.24 }}>
        {index + 1}
      </Text>
    </LinearGradient>
  );
}

type Cohort = NonNullable<League["cohort"]>;

/** Where the learner stands this week, and what it would take to move up. */
export const standing = (cohort: Cohort, tierIndex: number, tierCount: number) => {
  const { rank, size, promote, demote, xp, promotionMinXp } = cohort;
  const inPromotion = promote > 0 && rank <= promote;
  const inDemotion = demote > 0 && rank > size - demote;
  const lastPromoted = cohort.members[promote - 1];
  let hint: string;
  if (tierIndex >= tierCount - 1) hint = "You're in the top league. Hold your place.";
  else if (inPromotion && promotionMinXp !== null && xp < promotionMinXp) hint = `Reach ${promotionMinXp} XP to lock in promotion: ${promotionMinXp - xp} to go.`;
  else if (inPromotion) hint = "You're on course for promotion. Keep it up.";
  else if (lastPromoted) hint = `${Math.max(1, lastPromoted.xp - xp + 1)} XP more puts you in the promotion zone.`;
  else hint = "Solve problems to climb the table.";
  return { zone: inPromotion ? ("promotion" as const) : inDemotion ? ("demotion" as const) : ("safe" as const), hint };
};

export function ZonePill({ zone }: { zone: "promotion" | "demotion" | "safe" }) {
  return <Pill label={zone === "promotion" ? "Promotion zone" : zone === "demotion" ? "Demotion zone" : "Safe"} tone={zone === "promotion" ? "success" : zone === "demotion" ? "danger" : "muted"} />;
}

/** "2d 5h left", refreshed each minute. */
export function useTimeLeft(endsAt: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, Date.parse(endsAt) - now);
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return d > 0 ? `${d}d ${h}h left` : h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

/** The dashboard's league summary: tier, rank and XP, the nearest rivals, and the opt-in switch. */
export function LeagueCard() {
  const { c } = useTheme();
  const { user } = useSession();
  const { data } = useLeague();
  const optIn = useLeagueOptIn();
  const timeLeft = useTimeLeft(data?.week.endsAt ?? new Date().toISOString());
  if (!data || !user) return <Skeleton height={200} />;
  const joined = optIn.isPending ? !!optIn.variables : data.optedIn;
  const { tier, cohort } = data;
  const s = cohort && standing(cohort, tier.index, data.tiers.length);
  const around = cohort ? cohort.members.slice(Math.max(0, cohort.rank - 2), Math.max(0, cohort.rank - 2) + 3) : [];
  return (
    <Card>
      <CardHeader
        title="Leagues"
        icon="trophy.fill"
        iconTone="chart4"
        right={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {optIn.isPending && <ActivityIndicator size="small" />}
            <Text variant="caption" muted>
              {joined ? "Competing" : "Not joined"}
            </Text>
            <Switch value={joined} disabled={optIn.isPending || (!joined && !user.username)} onValueChange={(on) => optIn.mutate(on)} trackColor={{ true: c.primary }} style={{ transform: [{ scale: 0.8 }] }} />
          </View>
        }
      />
      <View style={{ padding: 16, gap: 12 }}>
        {!data.optedIn ? (
          <Text variant="small" muted>
            Join a weekly table of learners at your level. Each problem you solve earns XP, and the top of the table moves up a tier. You'd appear as <Text variant="small" weight="medium">@{user.username}</Text>.
          </Text>
        ) : (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <TierBadge index={tier.index} />
              <View style={{ flex: 1 }}>
                <Text variant="small" weight="semibold" style={{ color: tierColour(tier.index) }}>
                  {tier.name} League
                </Text>
                <Text variant="caption" muted>
                  {cohort ? `#${cohort.rank} of ${cohort.size}` : "Solve a problem to be placed"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <Icon name="bolt.fill" size={14} tone="chart4" />
                  <Text variant="title">{(cohort?.xp ?? 0).toLocaleString()}</Text>
                </View>
                <Text variant="caption" muted style={{ fontSize: 11 }}>
                  XP this week
                </Text>
              </View>
            </View>
            {s && (
              <View style={{ gap: 6 }}>
                <ZonePill zone={s.zone} />
                <Text variant="caption" muted>
                  {s.hint}
                </Text>
              </View>
            )}
            {around.length > 0 && (
              <View style={{ borderWidth: 1, borderColor: c.border, borderRadius: 10, overflow: "hidden" }}>
                {around.map((m, i) => (
                  <View key={m.username} style={{ flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: m.you ? alpha(c.primary, 0.07) : undefined, borderTopWidth: i ? 1 : 0, borderColor: c.border }}>
                    <Text variant="small" muted style={{ width: 24 }}>
                      {m.rank}
                    </Text>
                    <Text variant="small" weight={m.you ? "semibold" : undefined} numberOfLines={1} style={{ flex: 1 }}>
                      @{m.username}
                    </Text>
                    <Text variant="small">{m.xp.toLocaleString()} XP</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text variant="caption" muted>
            Week ends · {timeLeft}
          </Text>
          <Text variant="caption" tone="primary" weight="medium" onPress={() => router.navigate("/leagues")}>
            {data.optedIn ? "Full table →" : "How leagues work →"}
          </Text>
        </View>
      </View>
    </Card>
  );
}
