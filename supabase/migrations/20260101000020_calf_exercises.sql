-- Citadel Fitness — calf exercises
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).
--
-- Adds calf-specific movements to the existing "Legs" category — no new
-- category, just filling a gap in the catalogue. Idempotent via the
-- exercises_name_unique constraint added in migration_003.

insert into public.exercises (name, category, type, description) values
  ('Standing Calf Raise', 'legs', 'strength', 'Rise onto the toes from a standing position, loaded with a barbell or machine, to build the gastrocnemius through a full stretch and contraction.'),
  ('Seated Calf Raise', 'legs', 'strength', 'Rise onto the toes while seated with knees bent, shifting emphasis onto the soleus underneath the larger calf muscle.'),
  ('Leg Press Calf Raise', 'legs', 'strength', 'Push through the balls of the feet on a leg press machine to train the calves without loading the spine.'),
  ('Donkey Calf Raise', 'legs', 'strength', 'Hinged forward at the hips with weight loaded across the lower back, rise onto the toes for a deep calf stretch and strong contraction.'),
  ('Single-Leg Calf Raise', 'legs', 'strength', 'Rise onto the toes on one foot at a time, exposing and correcting side-to-side calf strength imbalances.')
on conflict (name) do nothing;
