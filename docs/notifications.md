# Notifications

FreeMathCamp tells learners about account activity, celebrates progress and
nudges them back to practice. Everything is stored in Postgres and delivered by
the API itself: there is no Firebase or other paid relay.

## Channels

| Channel | When | Delivered by |
| --- | --- | --- |
| **In-app** (notification centre) | Every notification | `notifications` table, read by the web app (and later the iOS app) |
| **Web Push** | Every notification, to browsers the learner turned push on for | The browser vendors' push services, using the open Web Push protocol signed with our VAPID keys (free) |
| **APNs** (iOS) | Every notification, to registered iPhones/iPads | Apple's push service directly, with a token-based `.p8` key (free with an Apple Developer account) |
| **Email** | Security notices (always); "come back", "first lesson" and weekly-summary reminders (unless unsubscribed) | Resend, through the existing email sender |

Milestones and daily nudges (streak at risk, reviews due, nearly at your goal)
stay in the app and on push, so inboxes stay quiet.

## What triggers a notification

- **Account and security:** welcome, email confirmed, a sign-in from a different IP
  address than the previous sign-in (`users.last_login_ip`), Google sign-in linked, password changed or
  added, other devices signed out, course progress reset. These can't be
  switched off.
- **Progress:** the first completed session on a lesson (and, in Path mode, the
  lesson it unlocks), lesson mastered, unit mastered, 25/50/75/100% of the
  course mastered, streak milestones (3, 7, 14, 30… days), daily goal reached,
  and problem-count milestones. Learners can switch these off.
- **Reminders** (`apps/api/src/domain/reminders.ts`): a sweep every 10 minutes
  sends at most **one** reminder per learner per local day, only between 09:00
  and 20:00 in their time zone (synced automatically from the browser). In
  priority order: Monday weekly summary, streak at risk (evening), reviews due
  (morning), nearly at the daily goal (afternoon), first-lesson nudges 1/3/7 days
  after sign-up, and "come back" nudges after 2/4/7/14/30 days away (each step
  once per lapse). Learners can switch reminders and reminder emails off.

Every one-off notification carries a dedupe key (unique per learner), so a
milestone or a day's reminder is never stored twice, even with several API
instances.

## How delivery works

```
event / reminder sweep ──► notifications row ──► push outbox ──► Web Push / APNs
                                   │
                                   └──────────► email outbox ──► Resend
```

- A notification row is the source of truth and doubles as the outbox:
  `push_status` and `email_status` start as `pending`.
- Workers in the API process (`apps/api/src/application/jobs.ts`) claim pending
  rows with `FOR UPDATE SKIP LOCKED` and a short lease, so several API instances
  can run them safely. Push is drained every 5 seconds and email every 15.
- Failures retry with exponential backoff (5 attempts for push, 4 for email).
  Endpoints the push service reports as gone are deleted. Pushes older than a
  day and reminder emails older than 12 hours are dropped rather than sent late.
- Reminders run under a lease row (`job_leases`), so only one instance sweeps at
  a time. Dismissed notifications are pruned after 30 days, and read ones that
  aren't kept after 180 days. Kept notifications stay until the learner removes them.

## Configuration

| Variable | Purpose |
| --- | --- |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Web Push keys. `pnpm setup` generates them for new env files; add them to an existing file with `node scripts/vapid-keys.mjs <file>`. Rotating them invalidates every browser subscription. |
| `VAPID_SUBJECT` | Contact for push services (default `https://freemathcamp.app`). |
| `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_PRIVATE_KEY`, `APNS_PRODUCTION` | iOS push. Create a key with APNs enabled under Apple Developer → Keys; paste the `.p8` contents with newlines as `\n`. |
| `JOBS_ENABLED` | Set `false` to stop this instance running the push, email and reminder workers. |
| `RESEND_API_KEY` | Email delivery (already used for verification emails). |

Without VAPID or APNs settings the matching channel is simply off, and
notifications still appear in the app.

## API

All routes are under the signed-in session.

| Method & path | Does |
| --- | --- |
| `GET /api/me/notifications?filter=all\|unread\|kept&cursor=…` | A page of notifications (newest first) plus counts |
| `GET /api/me/notifications/counts` | `{ unseen, unread, kept, total }`, cheap to poll (drives the badge) |
| `POST /api/me/notifications/seen` | Marks everything seen (clears the badge) |
| `PATCH /api/me/notifications/:id` | `{ "read": bool }` or `{ "kept": bool }` |
| `DELETE /api/me/notifications/:id` | Dismisses one |
| `POST /api/me/notifications/read-all` | Marks all read |
| `POST /api/me/notifications/dismiss-read` | Clears read notifications that aren't kept |
| `GET /api/me/push/config` | VAPID public key and which channels are enabled |
| `POST /api/me/push/subscriptions` | Registers a device (see below) |
| `DELETE /api/me/push/subscriptions` | `{ "endpoint" }` or `{ "token" }` |
| `PATCH /api/me/preferences` | `notifyProgress`, `notifyReminders`, `notifyEmailReminders`, `timezone` |
| `POST /api/email/unsubscribe?token=…` | One-click unsubscribe from reminder emails (RFC 8058) |

## Building the iOS app

1. Ask for permission with `UNUserNotificationCenter`, call
   `registerForRemoteNotifications()`, and send the hex device token after sign-in:

   ```http
   POST /api/me/push/subscriptions
   { "platform": "ios", "token": "<64+ hex chars>" }
   ```

   Send it again whenever iOS hands you a new token. Call `DELETE` with
   `{ "token" }` on sign-out.
2. Pushes arrive as standard APNs alerts with a badge (the unread count), grouped
   by `thread-id` (`account`, `progress` or `reminder`). Custom keys sit at the
   top level of the payload: `id`, `kind`, `category`, `href` (an app path such
   as `/courses/foundations/division`, to deep-link to) and `badge`.
3. When the learner opens a push, call `PATCH /api/me/notifications/:id` with
   `{ "read": true }`, and show the same centre using the list endpoints above.
4. Two API changes the native app will need. Both are small:
   - **Bearer-token sessions.** Sessions are currently cookie-based, and write
     requests are checked against the web origin.
   - **An app-specific `User-Agent`** (e.g. `FreeMathCamp/1.0 iOS`), so
     sign-in notices read "the FreeMathCamp iOS app".
