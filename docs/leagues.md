# Leagues

Leagues add some optional, friendly competition. Every learner is in by default
and can leave from the welcome tour, the dashboard, the leagues page or
Settings (migration `0011` opted in existing accounts that had never been in a
cohort; anyone who had left stays out). Those who are in are placed each week in a table of up to 30 people at the same tier, ranked by the XP they
earn by solving problems. When the week ends, the top of each table moves up a
tier and the bottom moves down.

## Usernames

Every account has a public username, and it's the only thing other learners see:
never a name, email or avatar.

- 3–20 characters: letters, numbers and underscores, starting with a letter.
- Unique regardless of letter case (`users.username` is `citext` with a unique
  index), so `Ada` and `ada` can't both exist. The case you type is kept for display.
- A few names are reserved (`admin`, `support`, `freemathcamp`…).
- Asked for at sign-up. Accounts made before usernames existed, and Google
  sign-ups, are shown a prompt after signing in that stays until they choose one.
- It can be changed in Settings. `GET /api/auth/username-available` gives live
  feedback while typing.

## Tiers

Bronze → Silver → Gold → Platinum → Diamond → Obsidian. Everyone starts in Bronze.

## Scoring: why XP

The score has to reward learning, not just activity, and has to be something
the learning engine already measures honestly. XP comes from each finished
problem (`domain/leagues.ts`, `xpFor`):

| | Warm-up (level 1) | Core (level 2) | Stretch (level 3) |
| --- | --- | --- | --- |
| Base XP | 10 | 15 | 20 |

- **First try** keeps all of it. After one wrong attempt the problem is worth
  half, after two or more a quarter.
- **Hints** take off a quarter.
- **Revealing the answer** earns nothing.

So XP grows with difficulty (which the engine raises as a learner improves) and
with first-try accuracy, the same signals that drive mastery. It can't be farmed
by guessing (wrong answers shrink the reward) or by revealing answers. Problems
are generated and marked on the server, so XP can't be submitted from the browser.

Each problem's XP is stored on its `item_results` row when it's marked. A
learner's all-time XP is the sum of those rows; resetting course progress clears it.

## Weeks, cohorts and promotion

- Weeks run Monday 00:00 to Monday 00:00 UTC.
- An opted-in learner joins a cohort with their first solved problem of the
  week (or immediately, when they opt in). XP already earned that week counts.
  Cohorts fill to 30 in order of joining; an advisory lock per tier and week
  keeps concurrent joins from overfilling one.
- At the end of the week a background job (every 5 minutes, under a lease)
  settles each cohort from a finished week:
  - the **top 20%** (rounded up, at least one) move up a tier, provided they
    earned at least **150 XP**, so a quiet table doesn't hand out free promotions;
  - the **bottom 20%** (rounded down) move down, only in tables of five or more,
    and never below Bronze;
  - Obsidian has no promotion zone.
  - Ties go to whoever reached the score first.
- Promoted and demoted learners get a notification.
- Opting out removes a learner from the current week's table. Their tier is kept.

## Data and queries

| Table | Holds |
| --- | --- |
| `users.username`, `league_opt_in`, `league_tier` | Handle, opt-in and current tier |
| `item_results.xp` | XP for each finished problem |
| `league_cohorts` | One row per table per week and tier; `finalized_at` once settled |
| `league_members` | One row per learner per week: cohort, running XP, and after settling, rank and result |

Standings are one indexed read (`league_members (cohort_id, xp desc, xp_at)`
joined to `users`), and solving a problem adds XP with a single update. Settling
a cohort is one transaction that locks its row (`FOR UPDATE SKIP LOCKED`, so
several API instances can run the job) and updates all members and tiers with
two set-based statements.

## API

| Route | |
| --- | --- |
| `GET /api/leagues/me` | Tier, this week's table (usernames and XP only), zones, last week's result, all-time XP |
| `PUT /api/me/league` `{ optIn }` | Join or leave |
| `PATCH /api/me/username` `{ username }` | Set or change the username |
| `GET /api/auth/username-available?username=` | Availability check |
