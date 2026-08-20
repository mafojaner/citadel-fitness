# Fortress: scope to operational

Written 2026-08-20. The question this answers: what is left before every
Fortress feature genuinely works for a paying member, rather than appearing to.

## What "operational" means here

A feature is done when all seven hold. Anything less is a demo.

1. **Reachable** from a place in the app you would naturally look for it.
2. **Real data** — reads and writes the member's own rows, no fixtures.
3. **Gated server-side.** A non-member who calls the API directly is refused
   by the database, not just hidden from in the UI.
4. **Infrastructure running.** Anything that must fire on a schedule has
   actually fired, and the run is observable.
5. **Empty and failure states** written, not just the happy path.
6. **Tested** at the logic layer.
7. **Verified against a real account by a person**, with the result recorded.

Criterion 3 is the one currently missing everywhere, and criterion 7 is
missing everywhere. They are the bulk of this document.

## The blocker under all of it: the gate is not real

`membership_tier` exists on `profiles` with a `check` constraint, and that is
the whole of it. Grep the migrations: no RLS policy on any table references
it.

Every Fortress feature is gated by `useMembershipTier()` in the client. That
is a display rule. The Supabase anon key ships inside the app, so a free
account can call PostgREST directly and read exactly what a member reads.
Nothing in the database would stop it.

This is not a hypothetical once memberships go on sale — it is the difference
between selling a product and selling a hidden button. It also cannot be
retrofitted per-feature later without touching all of them again, which is why
it is Phase 1 and everything else waits behind it.

Two things make it tractable. Tier is already a single ordered column rather
than a scatter of booleans, so a policy only has to compare one value. And
`20260817120000_profile_column_privileges.sql` already revoked client writes to
`membership_tier` via column privileges, so a member cannot promote themselves —
that half is done and verified.

### What Phase 1 has to produce

- A `security definer` helper, e.g. `public.tier_rank(uid uuid)`, returning the
  caller's rank as an integer. Definer so the policy can read `profiles`
  without recursing through `profiles`' own RLS — the same trap that already
  bit `group_members`.
- An RLS policy on every table backing a paid feature, requiring
  `tier_rank(auth.uid()) >= <rank>`. Tables in scope: `personal_records`,
  `lift_goals`, `programs` / `program_days`, `groups` / `group_members`,
  plus RPE columns on the sets table.
- The same rank check inside the Edge Functions that act for a member, since
  those run with the service key and bypass RLS entirely.
- An abort-probe migration per table proving a free account gets zero rows,
  run against production, output pasted into the dashboard.

Estimate: 2–3 days, most of it in the probes rather than the policies.

## Feature status

Eleven features. Nine have working code; none has been verified by a person.

| Feature | Code | Server gate | Infra | Verified | Work left |
|---|---|---|---|---|---|
| Advanced analytics | done | missing | n/a | no | gate + verify |
| PR vault | done | missing | n/a | no | gate + verify + re-home |
| Data export | done | missing | n/a | no | gate + verify both platforms |
| Goal forecasting | done | missing | n/a | no | gate + verify |
| RPE & rest timer | done | missing | n/a | no | gate + verify |
| Structured programs | done | missing | n/a | no | gate + verify |
| Private groups | done | partial | n/a | no | tier gate + verify |
| Weekly digest | done | missing | scheduled, never observed | no | prove it fires |
| Refer & earn | attribution only | missing | n/a | no | reward half needs billing |
| Offline sync | **none** | — | — | — | full build |
| Video demonstrations | **none** | — | needs hosting | — | not a code task |

Notes on the four that are not simply "gate and verify":

**Private groups** already has row policies — membership of a group is
enforced, and a non-member getting zero rows was probed. What is missing is the
*tier* check: a free account that is a member of a group can still read it.

**Weekly digest** is real code on a real schedule —
`.github/workflows/weekly-digest.yml`, Sundays at 17:00 UTC, calling the
`send-weekly-digest` Edge Function through Resend. It is scheduled with GitHub
Actions rather than `pg_cron` on purpose, so no secret has to live in a
scheduled SQL statement. But no run has ever been observed, and it depends on
`SUPABASE_FUNCTIONS_URL` and `WEBHOOK_SECRET` being set as repo secrets. Until
one run is watched end to end and an email lands, treat this as unproven rather
than done.

**Refer & earn** tracks attribution today and stores a `reward_status`.
Self-referral, duplicates and bogus codes are all blocked and probed. The
reward itself cannot exist before billing does, so this feature is honestly
half-shipped and its catalogue copy already says so.

**Video demonstrations** is filming and hosting, not engineering. It should be
cut from the Fortress list until footage exists, rather than shipped as a
permanent teaser — a paid tier advertising something that never arrives is the
single fastest way to earn refunds.

## Phases

**Phase 1 — Make the gate real.** As above. Blocks everything; nothing else
should start first, because every later verification would have to be redone
once policies land.

**Phase 2 — Verify the nine.** Walk each feature against a real account with
real history: does the number match what the app shows elsewhere, does the
empty state appear for a lift you have never done, does the error state appear
with the network off. Needs two accounts — one Valhalla, one free — to check
both sides of each gate. This is the cheapest phase and the one that has been
skipped every time so far.

**Phase 3 — Prove the digest.** Trigger the workflow manually, watch the run,
confirm an email arrives with correct numbers, confirm the opt-out actually
suppresses it. Then leave the schedule to fire on its own for one week and
check it did.

**Phase 4 — Offline sync.** The only remaining Fortress feature that is real
engineering. It needs a local write queue, a reconnect reconciler, and a
conflict rule. Note the existing `save_workout` does a full-day REPLACE, so
last-write-wins per day falls out naturally — but that means a day edited on
two devices loses one of them, and that has to be a stated behaviour rather
than a surprise. Sizeable: 1–2 weeks, and it touches every write path.

**Phase 5 — Decide on video.** Either commission footage or drop it from the
tier.

## Ordering rationale

Phase 1 first because it invalidates prior verification. Phase 2 before 3 and 4
because it is hours of work that could surface days of it — nine features have
never been opened, and the last two times something was assumed working, it
wasn't. Phase 4 last among the engineering because it is the only one that can
slip a week without holding anything else up.

## What only the account owner can do

- Set `SUPABASE_FUNCTIONS_URL` and `WEBHOOK_SECRET` as repo secrets, or confirm
  they are set — Phase 3 cannot start otherwise.
- Restore the paused staging project, so policies can be tested somewhere that
  is not production.
- Create a second, free test account for the other side of every gate.
- Decide who delivers Valhalla's human work, which sets its capacity cap and
  price floor. Not a Fortress blocker, but it gates the tier above it.
