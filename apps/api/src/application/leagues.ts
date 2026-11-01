import { Effect } from "effect";
import { PROMOTION_MIN_XP, settle, TIERS, TOP_TIER, weekEnd, weekStart, zones } from "../domain/leagues";
import { ValidationError } from "../domain/errors";
import { notices } from "../domain/notifications";
import type { User } from "../infrastructure/db/schema";
import { toPublicUser } from "./auth";
import { notifySafely } from "./notifications";
import { LeagueRepository, UserRepository } from "./ports";

/** Adds a solved problem's XP to this week's league. Never fails practice: a league hiccup is logged and skipped. */
export const awardXp = (userId: string, xp: number) =>
  Effect.flatMap(LeagueRepository, (l) => l.addXp(userId, xp, weekStart())).pipe(Effect.catchAll((e) => Effect.logWarning("league XP not recorded", e)));

const tierView = (tier: number) => ({ index: tier, name: TIERS[tier] ?? TIERS[0] });

/**
 * The learner's league: their tier, this week's cohort in rank order (by
 * username only), the promotion and demotion zones, last week's result and
 * their lifetime XP.
 */
export const leagueOverview = (user: User) =>
  Effect.gen(function* () {
    const leagues = yield* LeagueRepository;
    const week = weekStart();
    // Opted-in learners are always in this week's table, with no separate step to join.
    const membership = user.league_opt_in ? yield* leagues.join(user.id, week) : undefined;
    const standings = membership ? yield* leagues.standings(membership.cohortId) : [];
    const last = yield* leagues.lastSettled(user.id, week);
    const lifetimeXp = yield* leagues.lifetimeXp(user.id);
    const tier = membership?.tier ?? user.league_tier;
    const z = zones(standings.length, tier);
    const rank = standings.findIndex((s) => s.userId === user.id) + 1;
    return {
      optedIn: user.league_opt_in,
      username: user.username,
      tier: tierView(tier),
      tiers: TIERS,
      lifetimeXp,
      week: { start: week, endsAt: weekEnd(week).toISOString() },
      cohort: membership
        ? {
            rank,
            size: standings.length,
            xp: membership.xp,
            promote: z.promote,
            demote: z.demote,
            promotionMinXp: tier >= TOP_TIER ? null : PROMOTION_MIN_XP,
            members: standings.map((s, i) => ({ rank: i + 1, username: s.username, xp: s.xp, you: s.userId === user.id })),
          }
        : null,
      lastWeek: last ? { weekStart: last.weekStart, tier: tierView(last.tier), result: last.result, rank: last.finalRank } : null,
    };
  });

/** Opting in needs a username (it's how others see you). Opting out removes you from this week's standings. */
export const setLeagueOptIn = (user: User, optIn: boolean) =>
  Effect.gen(function* () {
    if (optIn && !user.username) return yield* Effect.fail(new ValidationError({ message: "Choose a username before joining a league." }));
    const updated = yield* Effect.flatMap(UserRepository, (u) => u.updatePreferences(user.id, { leagueOptIn: optIn }));
    const leagues = yield* LeagueRepository;
    if (optIn) yield* leagues.join(user.id, weekStart());
    else yield* leagues.leave(user.id, weekStart());
    return toPublicUser(updated);
  });

/** Puts every opted-in learner into this week's table for their tier (Bronze for newcomers). */
export const enrolOptedIn = Effect.flatMap(LeagueRepository, (l) => l.enrolOptedIn(weekStart()));

/**
 * Settles every cohort from a finished week: ranks, promotions and demotions,
 * then tells those who moved. Cohorts are locked one at a time, so several
 * instances can run this safely.
 */
export const settleFinishedWeeks = Effect.gen(function* () {
  const leagues = yield* LeagueRepository;
  const users = yield* UserRepository;
  const ids = yield* leagues.unsettledCohorts(weekStart());
  let settled = 0;
  for (const id of ids) {
    const outcome = yield* leagues.settleCohort(id, (ranked, tier) =>
      settle(ranked, tier).map((s) => ({ userId: s.member.userId, rank: s.rank, result: s.result, nextTier: s.nextTier })),
    );
    if (!outcome) continue;
    settled++;
    for (const m of outcome.members) {
      if (m.result === "stayed") continue;
      const user = yield* users.findById(m.userId);
      if (user) yield* notifySafely(user, notices.leagueResult(outcome.weekStart, m.result, TIERS[m.nextTier]!, m.rank));
    }
  }
  return settled;
});
