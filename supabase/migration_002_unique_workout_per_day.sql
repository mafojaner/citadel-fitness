-- Run this in the Supabase SQL Editor.
-- Fixes duplicate `workouts` rows created before saveWorkout() upserted by
-- (user_id, date), and stops it from happening again.

-- Keep only the earliest workout row per (user_id, date); cascades to
-- delete its logged_exercises/set_entries via the existing FK constraints.
delete from public.workouts w
using public.workouts w2
where w.user_id = w2.user_id
  and w.date = w2.date
  and w.created_at > w2.created_at;

-- Enforce one workout per user per day going forward.
alter table public.workouts
  add constraint workouts_user_date_unique unique (user_id, date);
