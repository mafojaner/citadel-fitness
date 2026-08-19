-- Run this in the Supabase SQL Editor.
-- Postgres does not automatically index foreign-key columns (only primary
-- and unique keys get one for free). These three FK columns get joined
-- through on every read (fetchWorkoutForDate's nested select filters
-- logged_exercises by workout_id) and on every write to logged_exercises/
-- set_entries, since their RLS policies run an `exists` subquery through
-- exactly these columns. Fine at today's row counts; will matter more as
-- workout history grows.

create index if not exists logged_exercises_workout_id_idx on public.logged_exercises (workout_id);
create index if not exists logged_exercises_exercise_id_idx on public.logged_exercises (exercise_id);
create index if not exists set_entries_logged_exercise_id_idx on public.set_entries (logged_exercise_id);
