-- Citadel Fitness — apply the two migrations that never reached production
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).
--
-- An audit of all 31 migrations against the live schema found exactly two
-- that had never been applied: 016 (non-negative set data) and 017 (Fortress
-- waitlist update/delete policies). Everything else — tables, columns,
-- functions, triggers, indexes, other policies, and every data migration —
-- was already present.
--
-- 016 cannot be re-run as written. It constrains `duration_minutes`, a
-- column migration_022 replaced with `duration_seconds`, so running the
-- original file today errors on that statement. 022 already added its own
-- `duration_seconds >= 0` check, so duration is covered; only reps, weight
-- and distance are still unguarded, and those are carried over here against
-- the columns that actually exist now.
--
-- 017 applies unchanged. The waitlist still has only SELECT and INSERT
-- policies, so leaveFortressWaitlist() deletes zero rows — RLS filters the
-- row out rather than raising — and every user who tries to leave gets
-- "Couldn't leave the waitlist right now. Please try again."
--
-- Checked before writing: no existing row violates any of these three
-- constraints, so they apply without needing a data cleanup first.
--
-- Safe to run more than once: Postgres has no `add constraint if not
-- exists`, so each constraint and policy is dropped first.

alter table public.set_entries drop constraint if exists set_entries_reps_check;
alter table public.set_entries add constraint set_entries_reps_check
  check (reps is null or reps >= 0);

alter table public.set_entries drop constraint if exists set_entries_weight_check;
alter table public.set_entries add constraint set_entries_weight_check
  check (weight is null or weight >= 0);

alter table public.set_entries drop constraint if exists set_entries_distance_check;
alter table public.set_entries add constraint set_entries_distance_check
  check (distance is null or distance >= 0);

drop policy if exists "Users can update their own waitlist entry" on public.fortress_waitlist;
create policy "Users can update their own waitlist entry"
  on public.fortress_waitlist for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can leave their own waitlist entry" on public.fortress_waitlist;
create policy "Users can leave their own waitlist entry"
  on public.fortress_waitlist for delete
  using (auth.uid() = user_id);
