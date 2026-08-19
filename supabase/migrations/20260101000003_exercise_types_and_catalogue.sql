-- Run this in the Supabase SQL Editor.
-- 1. Gives exercises a tracking type (strength vs cardio) so the app can
--    show the right fields for each.
-- 2. Adds duration/distance columns to set_entries for cardio sessions,
--    since reps/weight don't make sense for running, cycling, etc.
-- 3. Expands the exercise catalogue well beyond the original 12.

-- Tracking type -------------------------------------------------------
alter table public.exercises
  add column if not exists type text not null default 'strength'
  check (type in ('strength', 'cardio'));

update public.exercises set type = 'cardio' where category = 'cardio';

-- Cardio fields on sets -------------------------------------------------
alter table public.set_entries
  add column if not exists duration_minutes numeric,
  add column if not exists distance numeric;

-- Prevent duplicate exercise names so the seed below is safe to re-run.
-- Postgres has no `add constraint if not exists`, so drop-then-add instead.
alter table public.exercises drop constraint if exists exercises_name_unique;
alter table public.exercises add constraint exercises_name_unique unique (name);

-- Expand the catalogue --------------------------------------------------
insert into public.exercises (name, category, type) values
  -- Chest (strength)
  ('Incline Barbell Press', 'chest', 'strength'),
  ('Decline Bench Press', 'chest', 'strength'),
  ('Dumbbell Fly', 'chest', 'strength'),
  ('Cable Crossover', 'chest', 'strength'),
  ('Chest Dip', 'chest', 'strength'),
  ('Machine Chest Press', 'chest', 'strength'),
  ('Pec Deck', 'chest', 'strength'),

  -- Back (strength)
  ('Chin-Up', 'back', 'strength'),
  ('Dumbbell Row', 'back', 'strength'),
  ('T-Bar Row', 'back', 'strength'),
  ('Seated Cable Row', 'back', 'strength'),
  ('Face Pull', 'back', 'strength'),
  ('Hyperextension', 'back', 'strength'),
  ('Straight-Arm Pulldown', 'back', 'strength'),

  -- Legs (strength)
  ('Front Squat', 'legs', 'strength'),
  ('Leg Press', 'legs', 'strength'),
  ('Romanian Deadlift', 'legs', 'strength'),
  ('Leg Curl', 'legs', 'strength'),
  ('Leg Extension', 'legs', 'strength'),
  ('Calf Raise', 'legs', 'strength'),
  ('Hip Thrust', 'legs', 'strength'),
  ('Bulgarian Split Squat', 'legs', 'strength'),

  -- Cardio (duration/distance based)
  ('Elliptical', 'cardio', 'cardio'),
  ('Stair Climber', 'cardio', 'cardio'),
  ('Jump Rope', 'cardio', 'cardio'),
  ('Swimming', 'cardio', 'cardio'),
  ('Walking', 'cardio', 'cardio'),
  ('Incline Treadmill Walk', 'cardio', 'cardio'),
  ('Sprint Intervals', 'cardio', 'cardio')
on conflict (name) do nothing;
