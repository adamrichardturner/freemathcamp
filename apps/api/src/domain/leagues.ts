/**
 * Leagues: weekly cohorts of every opted-in learner in the same tier (no size
 * limit for now), ranked by XP.
 * At the end of each week (Monday 00:00 UTC) the top of every cohort moves up
 * a tier and the bottom moves down. Pure functions only; see docs/leagues.md.
 */

export const TIERS = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Obsidian"] as const;
export type TierName = (typeof TIERS)[number];
export const TOP_TIER = TIERS.length - 1;

/** Share of a cohort that moves up, and down, each week. */
export const PROMOTE_SHARE = 0.2;
export const DEMOTE_SHARE = 0.2;
/** A promotion has to be earned: roughly 15 problems solved cleanly at the middle level. */
export const PROMOTION_MIN_XP = 150;
/** Small cohorts (early on, or in high tiers) don't demote anyone. */
export const DEMOTION_MIN_COHORT = 5;

/* ---- Scoring ---- */

const BASE_XP: Record<number, number> = { 1: 10, 2: 15, 3: 20 };

/**
 * XP for one finished problem. Harder problems are worth more, first-try
 * answers keep all of it, and hints trim it. A revealed answer earns nothing,
 * so XP can only come from solving. Recorded on each item result.
 */
export const xpFor = (r: { level: number; wrongAttempts: number; hintsUsed: number; revealed: boolean }) => {
  if (r.revealed) return 0;
  const base = BASE_XP[r.level] ?? BASE_XP[1]!;
  const accuracy = r.wrongAttempts === 0 ? 1 : r.wrongAttempts === 1 ? 0.5 : 0.25;
  const hints = r.hintsUsed > 0 ? 0.75 : 1;
  return Math.round(base * accuracy * hints);
};

/* ---- Weeks ---- */

const DAY = 86_400_000;

/** Monday 00:00 UTC of the week containing `at`, as YYYY-MM-DD. */
export const weekStart = (at: Date = new Date()) => {
  const midnight = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate());
  const sinceMonday = (new Date(midnight).getUTCDay() + 6) % 7;
  return new Date(midnight - sinceMonday * DAY).toISOString().slice(0, 10);
};

export const weekEnd = (start: string) => new Date(Date.parse(`${start}T00:00:00Z`) + 7 * DAY);

export const previousWeek = (start: string) => new Date(Date.parse(`${start}T00:00:00Z`) - 7 * DAY).toISOString().slice(0, 10);

/* ---- Promotion and demotion ---- */

export type LeagueResult = "promoted" | "stayed" | "demoted";

/** How many places move up and down in a cohort of `size` at `tier`. */
export const zones = (size: number, tier: number) => ({
  promote: tier >= TOP_TIER ? 0 : Math.max(1, Math.ceil(size * PROMOTE_SHARE)),
  demote: tier <= 0 || size < DEMOTION_MIN_COHORT ? 0 : Math.floor(size * DEMOTE_SHARE),
});

/**
 * Settles a finished week. `ranked` is the cohort in final order (most XP
 * first). Promotion also needs PROMOTION_MIN_XP, so a quiet cohort doesn't
 * hand out free promotions.
 */
export const settle = <M extends { xp: number }>(ranked: readonly M[], tier: number) => {
  const { promote, demote } = zones(ranked.length, tier);
  return ranked.map((m, i) => {
    const result: LeagueResult = i < promote && m.xp >= PROMOTION_MIN_XP ? "promoted" : i >= ranked.length - demote ? "demoted" : "stayed";
    const nextTier = result === "promoted" ? tier + 1 : result === "demoted" ? tier - 1 : tier;
    return { member: m, rank: i + 1, result, nextTier };
  });
};

/* ---- Usernames ---- */

export const USERNAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{2,19}$/;
const RESERVED = new Set(["admin", "administrator", "support", "help", "freemathcamp", "fmc", "moderator", "mod", "staff", "team", "root", "system", "null", "undefined", "anonymous", "you", "me"]);
export const isReservedUsername = (u: string) => RESERVED.has(u.toLowerCase());
