-- Citadel Fitness — reject negative set data
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).
--
-- Why: reps/weight/duration_minutes/distance had no bounds at all. RLS
-- already scopes every row to its owner, so this isn't a cross-user
-- exposure — but nothing stopped a buggy client (or a stolen session)
-- from silently writing a negative value into a user's own analytics.
--
-- Postgres has no `add constraint if not exists`, so each is dropped first,
-- making this file safe to run more than once.

alter table public.set_entries drop constraint if exists set_entries_reps_check;
alter table public.set_entries add constraint set_entries_reps_check check (reps >= 0);

alter table public.set_entries drop constraint if exists set_entries_weight_check;
alter table public.set_entries add constraint set_entries_weight_check check (weight >= 0);

alter table public.set_entries drop constraint if exists set_entries_duration_check;
alter table public.set_entries add constraint set_entries_duration_check
  check (duration_minutes is null or duration_minutes >= 0);

alter table public.set_entries drop constraint if exists set_entries_distance_check;
alter table public.set_entries add constraint set_entries_distance_check
  check (distance is null or distance >= 0);
