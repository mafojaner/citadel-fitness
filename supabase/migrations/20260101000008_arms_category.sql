-- Citadel Fitness — arms category
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).
--
-- Adds an "Arms" category to the exercise catalogue. exercises.category has
-- no check constraint (unlike exercises.type), so no schema change is
-- needed here — this only seeds the exercises. Idempotent via the
-- exercises_name_unique constraint added in migration_003.

insert into public.exercises (name, category, type) values
  ('Barbell Curl', 'arms', 'strength'),
  ('Dumbbell Curl', 'arms', 'strength'),
  ('Hammer Curl', 'arms', 'strength'),
  ('Preacher Curl', 'arms', 'strength'),
  ('Cable Curl', 'arms', 'strength'),
  ('Triceps Pushdown', 'arms', 'strength'),
  ('Skull Crusher', 'arms', 'strength'),
  ('Overhead Triceps Extension', 'arms', 'strength'),
  ('Close-Grip Bench Press', 'arms', 'strength')
on conflict (name) do nothing;
