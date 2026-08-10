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
table all default OFF, hiding caddy and venue features. Build golfer-facing
screens first. Read flags at runtime; never hardcode features as visible.

---

## 3. Database schema — 61 tables

Do not query anything not on this list.

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

**Deep nested selects fail silently.** Supabase returns empty results without
an error for deep joins. Use flat queries and join in JavaScript with maps.
The tournament pairings view needs 8 separate flat queries.

**Batch large `.in()` queries.** Fetching `hole_scores` for a full field must
be split into two batches of 72 scorecards or the URL exceeds the limit.

**`tickets` is authoritative** for which club a player represents in an event
— not `tour_players`.

**Notifications drive push.** Inserting a row into `notifications` fires a
Database Webhook to the `send-push-notification` edge function. To notify a
user, insert a row; never call the function directly. Columns: `user_id`,
`title`, `message`, `type`, `metadata` (jsonb), `is_read`.

**Realtime only works for tables in the publication.** Currently only
`buddy_connections`, `chat_messages`, and `club_invitations` are in
`supabase_realtime`. A listener on any other table silently never fires.

**RLS is active on all tables.** Reads are filtered by policy. If a query
returns empty unexpectedly, suspect RLS before suspecting the query.

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

Auth screens: Login, Sign Up, Pending Approval. Google OAuth is the only
social provider in use.

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
