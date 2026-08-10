# GolfBuana — Project Context

Paste this at the start of any AI coding session (Emergent, Claude, Cursor,
RapidNative, Dreamflow, or a fresh chat with any assistant) **before** making
a build request. It exists so the agent builds against the backend that
already exists instead of inventing its own.

Sections 2–6 are tool-agnostic — they describe GolfBuana, not a toolchain.
Two things need adapting per tool:

- **§1.5 (stack)** assumes React Native + Expo. For a Flutter tool, swap in
  Flutter and `supabase_flutter`, and treat §6 as colour values rather than
  StyleSheet guidance. For a UI-only generator, drop the TanStack Query and
  Zustand requirements — it does not handle server state.
- **§7 (how to work)** assumes a tool you can iterate with. For a one-shot
  generator, ask for a single screen per prompt instead.

**§1.1 matters most when switching tools.** Nearly every AI app builder ships
a bundled backend and will reach for it by default. Keep that line at the top
regardless of which tool you are using.

Keep this file current: append to §4 whenever a new backend gotcha is found.
That section is the expensive knowledge — no tool can infer it.

*Last updated 10 August 2026, after an audit session that found sixteen
production bugs across notifications, signup approval, venue and caddy flows,
and admin data operations. Every one of them was code that existed, read
correctly, and never ran.*

---

## 1. Non-negotiable constraints

Read these first. Violating any of them produces an app that cannot ship.

1. **Do not create a database, auth system, or backend.** They already exist.
   The app is a client for an existing Supabase project — nothing more.
2. **Supabase project ref:** `duktebslocooppxedanv`
   URL: `https://duktebslocooppxedanv.supabase.co`
   Use the anon key only. Never the service role key.
3. **Do not invent table or column names.** The schema is fixed and listed
   below. If a needed field does not exist, say so instead of guessing.
4. **Android package ID must be `com.golfbuana.app`.** This app ships as an
   *update* to an existing Play Store listing (a TWA wrapper), not as a new
   app. A different package ID breaks that path permanently.
5. **Stack:** React Native with Expo (SDK 57 or newer), Expo Router for
   navigation, `@supabase/supabase-js`, TanStack Query for server state,
   Zustand for auth state. TypeScript throughout.
6. **UI language is English.** User-generated content stays multilingual.

---

## 2. What the product is

GolfBuana is a community golf platform for the Indonesian market, structured
as a platform cooperative. Three stakeholder classes share in the platform:

- **Golfer** (Class A) — the only class currently active
- **Caddy** (Class B) — features hidden behind a feature flag
- **Venue** (Class C) — features hidden behind a feature flag

The anchor community is The Explorationists Golf Club (EGC), a network of oil
and gas professionals with tournament history since 2012, running the EGT
tournament series.

**Current mode is "Logbook Mode":** six feature flags in the `feature_flags`
table are all OFF, hiding caddy and venue features. Build golfer-facing
screens first. Read flags at runtime; never hardcode features as visible.

The flags: `venue_booking`, `caddy_assignment`, `staff_join_request`,
`invoice_download`, `tee_time_picker`, `venue_schedule_admin`. Read them via
`useFeatureFlags`, which spreads the query result over `DEFAULT_FLAGS` so a
flag defined in code but missing a row resolves to false rather than
undefined.

### Where the two codebases stand (August 2026)

- **`cfgolf`** — the PWA at golfbuana.com, deployed on Vercel. Mature and in
  production. Also wrapped as an Android TWA via Bubblewrap, package
  `com.golfbuana.app`.
- **`golfbuana-app`** — native rebuild on Expo SDK 57, started August 2026.
  Foundation only: Expo Router with auth gating, typed Supabase client, auth
  store, design tokens, a working login screen. The four tab screens are
  placeholders. Deliberately uses the **same** package ID as the TWA so it can
  ship as an update to that Play Store listing rather than a separate app —
  which requires the existing keystore (`android.keystore`, alias
  `golfbuana_keystore`) be uploaded to EAS credentials.
- **`gbplay-native`** (Expo SDK 54) and **`golfbuana-flutter`** are abandoned.
  Do not build on them.

Lovable is no longer used. GitHub is the single source of truth.

---

## 3. Database schema

> **The generated types are stale.** `src/integrations/supabase/types.ts` was
> generated some time ago and is missing at least `event_rounds` and
> `post_comments`, both of which exist in the live database. The list below is
> derived from that file and inherits the same gap. Regenerate before relying
> on it:
> `npx supabase gen types typescript --project-id duktebslocooppxedanv > src/integrations/supabase/types.ts`
> then copy the result to `golfbuana-app/src/types/database.ts`.
>
> To see what actually exists right now:
> `SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY 1;`

Do not query anything not on this list without checking it exists first.

**Identity & social**
`profiles`, `buddy_connections`, `conversations`, `conversation_participants`,
`chat_messages`, `notifications`, `system_admins`, `pending_approvals`,
`profile_claim_requests`, `audit_log`

**Clubs**
`clubs`, `members`, `club_staff`, `club_invitations`, `club_announcements`,
`club_committee_roles`, `is_club_admin`

**Content feed (Lounge)**
`channels`, `channel_follows`, `posts`, `post_likes`

**Courses & venues**
`courses`, `course_holes`, `course_tees`, `course_lockers`,
`course_bagdrop_slots`, `tee_time_slots`, `tee_time_bookings`,
`range_bays`, `range_bookings`, `range_lessons`

**Tournaments**
`tours`, `tour_clubs`, `tour_players`, `tournament_flights`,
`tournament_winner_categories`, `events`, `event_holes`, `tickets`,
`contestants`, `pairings`, `pairing_players`, `event_checkins`,
`event_results`, `event_leaderboard`, `event_roles`,
`event_staff_assignments`, `event_teeoff_log`, `event_incidents`,
`event_resource_allocations`, `event_venue_reports`,
`caddy_assignments`, `golf_cart_assignments`

**Scoring & handicap**
`rounds`, `round_players`, `scorecards`, `hole_scores`, `handicap_history`,
`handicap_history_public`, `player_handicap_trend`

**Cooperative**
`cooperative_interests`

Key columns on `profiles`: `id`, `full_name`, `avatar_url`, `handicap`,
`bio`, `location`, `is_approved`, `subscription_tier`, `active_roles`
(text array). There is **no** `username` column.

---

## 4. Backend behaviours that will break the app if ignored

These were found by debugging the production PWA. They are not theoretical.

### 4.0 The dominant failure mode: code that exists but never runs

Every bug found in this codebase so far has had the same shape. The code is
present, reads correctly, passes `tsc` and `npm run build`, and never
executes. Nothing appears in the console. Nothing appears in the logs. The
feature is simply absent at runtime, and can stay that way for months.

Instances found in a single audit session (10 August 2026), all in production,
several of them for months:

1. **Notifications never written.** Buddy requests, club invitations and chat
   messages had no `notifications` insert at all. The table held 6 rows in
   four and a half months, all of them manual tests. Push notification had
   therefore never once worked in production, despite the entire pipeline —
   VAPID keys, service worker, webhook, edge function, 29 live subscriptions —
   being correctly configured the whole time.
2. **Realtime listener never fired.** A complete, correct listener for
   `club_invitations` had been written — but the table was not in the
   `supabase_realtime` publication, so Postgres never broadcast to it.
3. **Button permanently disabled.** The "Request Sent" state was rendered
   `disabled`, leaving the sender with no way to cancel and no way to send a
   new request, because the unique pair constraint blocked a second insert.
4. **Feature flag gating nothing.** `caddy_assignment` was defined in the
   hook and toggleable in the admin dashboard, but zero code read it. The UI
   it appeared to control was actually gated by `venue_schedule_admin`. Its
   description in the database also named a screen that was never built.
5. **Notification addressed to the wrong person.** A booking request marked
   `// Notify venue` sent the notification to `user.id` — the sender. The
   venue was never told a request had arrived.
6. **UPDATE blocked by a missing policy, reported as success.** No table had
   an UPDATE policy for `pending_approvals`, so every Approve and Reject
   changed nothing. The handlers checked `error` only, and an RLS-blocked
   UPDATE sets no error — it affects zero rows. Signup approval, the gate to
   the entire platform, had never worked. The same gap existed on `courses`,
   `course_tees`, `handicap_history` and `round_players`.
7. **Six writes with no error handling at all.** Profile merge fired six
   UPDATEs through `Promise.all` and discarded every result. One path then
   deleted the old profile, which would orphan any rows that had not moved.
8. **Branch keyed on the wrong condition.** The signup queue was only written
   when no `profiles` row existed — but a trigger creates the profile with the
   auth account, so unapproved users with a profile fell through: they saw the
   waiting screen forever, never appeared in the admin list, and no email was
   sent, because the notification webhook fires on INSERT.
9. **Stale branding surviving a rename.** `notify-admin-signup` still emailed
   admins as "CFGolf System" with a button pointing at `cfgolf.lovable.app`.
   Every signup notification carried a dead link.

**Consequences for how to work here:**

- Reading the code is not verification. A flow counts as working only when a
  row has been observed in the database, or the effect seen on a device.
- **Check rows affected, not just `error`.** An RLS-blocked write returns no
  error. Add `.select()` to every UPDATE and DELETE whose success is reported
  to the user, and treat an empty result as failure.
- **Never `Promise.all` a batch of writes without inspecting each result.**
  Supabase resolves with `{ error }` rather than throwing.
- **Never delete a record that other rows point at until every reassignment
  is confirmed.**
- When adding a realtime listener, add the table to the publication in the
  same change: `ALTER PUBLICATION supabase_realtime ADD TABLE <t>;` plus
  `ALTER TABLE <t> REPLICA IDENTITY FULL;`
- When adding a feature flag, grep for its usage before considering it done,
  and make sure its `description` row matches what the code actually gates.
- When a state renders a disabled control, check that some other path can
  leave that state.
- **Audit RLS by operation, not by table.** A table with SELECT and INSERT
  policies looks configured; the gap only shows when you check UPDATE and
  DELETE separately. See the queries in §4.4.
- Silent failure is the norm in this stack: RLS blocks reads and writes
  without error, deep selects return empty without error, unpublished tables
  never broadcast, and non-frontend code does not deploy with the frontend.
  Suspect a missing permission or registration before suspecting the logic.

### 4.1 Query behaviour

**Deep nested selects fail silently.** Supabase returns empty results without
an error for deep joins. Use flat queries and join in JavaScript with maps.
The tournament pairings view needs 8 separate flat queries.

**Batch large `.in()` queries.** Fetching `hole_scores` for a full field must
be split into two batches of 72 scorecards or the URL exceeds the limit.

**`tickets` is authoritative** for which club a player represents in an event
— not `tour_players`.

### 4.2 Notifications, realtime and permissions

**Notifications drive push.** Inserting a row into `notifications` fires a
Database Webhook to the `send-push-notification` edge function. To notify a
user, insert a row; never call the function directly. Columns: `user_id`,
`title`, `message`, `type`, `metadata` (jsonb), `is_read`.

**Realtime only works for tables in the publication.** Currently only
`buddy_connections`, `chat_messages`, and `club_invitations` are in
`supabase_realtime`. A listener on any other table silently never fires.

**RLS is active on all tables.** Reads are filtered by policy. If a query
returns empty unexpectedly, suspect RLS before suspecting the query.

**Push subscriptions are per user, not per device.** A row in
`push_subscriptions` is tied to the `user_id` that was signed in when
permission was granted. Signing in as a different account on the same phone
does not carry it over — that account must grant permission again. Expired
endpoints are cleaned up automatically when a send returns 410 or 404, so
they only disappear once pushes are actually being sent.

**Use `src/lib/notify.ts`, never insert into `notifications` directly.** It
centralises the insert, dedupes chat pings per conversation, and looks up
club admins. Direct inserts bypass all of that.

### 4.3 Deployment — three targets, only one is automatic

Pushing to `main` deploys the **frontend only**. Two other surfaces have to be
deployed by hand, and forgetting them reproduces §4.0 exactly: the corrected
code sits in the repo while the old version keeps running in production.

| Surface | Lives in | How it ships |
|---|---|---|
| PWA frontend | `src/`, `public/`, `index.html` | Vercel, automatic on push to `main` |
| Edge functions | `supabase/functions/` | **Manual** — Supabase dashboard or CLI |
| Schema, RLS, publication, flags | not in the repo at all | **Manual** — SQL Editor |

Deploying an edge function:

```bash
npx supabase login
npx supabase link --project-ref duktebslocooppxedanv
npx supabase functions deploy <function-name>
```

Observed instance: `notify-admin-signup` was rebranded from CFGolf and its
dead `cfgolf.lovable.app` approval link repointed at `golfbuana.com`. The
commit landed and Vercel deployed, but the next signup email still carried
the old branding and the broken link, because the function itself had not
been redeployed.

**Database state is not version-controlled.** Feature flag rows, RLS policies,
webhooks, and publication membership exist only in the live project. The repo
cannot tell you their current state — query it. Two consequences seen in
practice: a flag row whose `description` no longer matched what the code did,
and a `notifications` webhook whose existence could only be confirmed from the
dashboard.

**After changing anything in `supabase/functions/`, deploy it and then trigger
the function for real.** Reading the diff proves nothing about what is running.

---

### 4.4 Auditing RLS

Run these against the live project; the repo cannot tell you the answer.

```sql
-- Tables with RLS on but no policy at all — invisible to the app entirely
SELECT c.relname FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity
GROUP BY c.relname HAVING COUNT(p.polname)=0;

-- Readable but not writable — the shape that produced findings 6 and 7
SELECT c.relname FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity
  AND EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid=c.oid AND p.polcmd IN ('r','*'))
  AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid=c.oid AND p.polcmd IN ('w','*'));
```

`polcmd`: `r`=SELECT, `a`=INSERT, `w`=UPDATE, `d`=DELETE, `*`=ALL.

A table appearing in the second query is not automatically a bug — append-only
tables (`audit_log`, `post_likes`, `channel_follows`, `event_teeoff_log`) are
correct as they are. Cross-check against the code before adding policies:

```bash
grep -rn 'from("<table>")' src --include=*.tsx -A3 | grep '\.update('
```

As of August 2026 the following UPDATE/DELETE policies exist and are keyed on
`system_admins` membership: `pending_approvals` (UPDATE, DELETE),
`handicap_history` (UPDATE), `round_players` (UPDATE). `courses` and
`course_tees` (UPDATE) are keyed on club owner/admin membership instead. None
of them check `system_admins.is_active` — a deactivated admin would still pass.

### 4.5 Signup and approval flow

Access is gated: a new account cannot use the platform until an admin approves
it. The moving parts, in order:

1. Google OAuth sign-in creates the auth user. **A database trigger creates the
   `profiles` row immediately**, with `is_approved` false.
2. `checkOnboarding` in `src/pages/Login.tsx` runs on every auth state change.
   If the user is not approved, it inserts a `pending_approvals` row — but only
   when no record exists yet, because a rewrite would be an UPDATE.
3. The INSERT fires the `notify-admin-on-signup` trigger → the
   `notify-admin-signup` edge function → an email to the admin.
4. `/admin/approvals` lists pending records. Approve sets `profiles.is_approved`
   and marks the record; Reject marks it rejected; a delete button removes the
   record entirely.
5. A `rejected` record short-circuits the next sign-in and shows a dedicated
   "not approved" screen rather than the waiting screen.

Consequences worth remembering:

- **The webhook fires on INSERT only.** Anything that reuses an existing row —
  an upsert, a status reset — produces no email. This is why rejection is
  cleared by deleting the record rather than flipping it back to pending.
- **Deleting a record is what lets someone reapply.** Approving from the
  rejected list is the alternative when you simply changed your mind.
- **Non-admins opening `/admin/approvals` are silently redirected to Lounge.**
  Confusing when an admin forwards the email link to the wrong browser session.
  Worth replacing with an explicit message.

---

## 5. Screens to build

Four bottom tabs: **Lounge · Clubs · Rounds · Profile**

- **Lounge** — Channels (Following / Discover) and Chats (Chats / Contacts).
  Auto-follow the official channel. Order channels by latest post.
- **Clubs** — My Clubs and Discover (Community / Venue sub-tabs). Club detail
  differs by `club_type`: `communal` shows Members + Tournaments;
  `venue` shows Staff + Schedule; `personal` is a private log.
- **Rounds** — Upcoming and Completed. Event detail includes leaderboard,
  pairings, check-in, and handicap correction.
- **Profile** — About, Clubs, Stats, Gallery, Bookings, plus Settings and
  admin dashboards for club admins and platform admins.

Auth: Login and Pending Approval. Google OAuth is the only provider in use;
see §4.5 for the approval gate.

### 5.1 Priority for the native rebuild

The PWA has 69 distinct screens (see `twa_pagelist.txt` and the 70 reference
screenshots). Rebuilding all of them natively is months of work for a payoff
that is mostly invisible — the ordering below is drawn from what the database
actually shows people doing.

The signal is lopsided. Tournament data is the crown jewel: EGT history back to
2012, 25 events, 1000+ contestants, 134 pairings, 223 handicap history entries,
152 recorded results. Social features are barely touched: 10 chat messages and
7 buddy requests in four and a half months. Bookings: 2. So the first release
should lean hard on tournaments and personal record, not on chat.

**Tier 1 — golfer core, 12 screens. Ship this first.**

Login · Rounds Upcoming · Rounds Completed · Event detail (leaderboard) ·
Event pairings · Event check-in · Handicap correction · Profile About ·
Profile Stats · Clubs My Clubs · Club detail (Members + Tournaments) ·
Tour detail (leaderboard + events)

An EGC golfer opens the app to see when they play next, who is in their flight,
what they scored, and where their handicap is heading. All of that lives here,
and the historical data is already populated — the app feels full on day one.

**Tier 2 — social and growth, 9 screens.**

Lounge Channels Following · Lounge Channels Discover · Channel detail ·
Chats list · Chat room · Contacts (Suggestions / Requests / My Buddies) ·
Clubs Discover Community · Club join flow · GBPlay Cooperative

The cooperative page is the founding-member funnel, so it can be pulled
forward if recruitment starts before Tier 1 finishes. It has no dependency on
the tournament screens.

**Tier 3 — leave on the web, 11 screens.**

All Club Admin and Platform Admin panels: tour and event management, course
management, users, features, reports, approvals. Admin work happens on large
screens with wide tables and long forms; rebuilding that for a narrow viewport
is a lot of effort for a worse result. The PWA handles it well and stays live.

**Excluded until the flags are on — 12 screens.**

Every venue and caddy screen. All six flags are OFF, and §4.0 shows how
quickly code for hidden features rots unnoticed. Build them when the caddy and
venue stakeholder groups are actually being onboarded.

**Result: 21 screens for the first release rather than 69.**

Treat the reference screenshots as a map of flows, not a pixel target. React
Native should use platform-native controls; reproducing the PWA's CSS
component by component gives up the native feel without gaining anything.

---

## 6. Visual design

Dark theme only. Colours (converted from the PWA so both platforms match):

| Token | Hex |
|---|---|
| background | `#13201A` |
| foreground | `#F1F4F1` |
| card | `#1D2B24` |
| primary | `#2BAB60` |
| secondary | `#2B3B33` |
| muted | `#28332E` |
| mutedForeground | `#819888` |
| accent | `#E8BA30` |
| destructive | `#DB2424` |
| border | `#304138` |
| brandDark (splash/icon) | `#0F1A0E` |

Interaction patterns follow WhatsApp: tab bar at the bottom, list-first
screens, detail pushed on top. Radius 8/12/16. Spacing scale 4/8/12/16/24/32.

---

## 7. How to work

Build **one screen at a time** and stop for review. Do not generate all
screens in one pass — the failure mode is plausible-looking code that queries
columns which do not exist.

Suggested order, each depending on the last:
1. Auth (login, session persistence, redirect on session change)
2. Profile — read-only, proves typed queries work end to end
3. Lounge channels
4. Clubs list and club detail
5. Rounds list and event detail
6. Chats, then buddy connections
7. Push notification registration

After each screen: run `tsc --noEmit`, then verify against real data on a
device before moving on.
