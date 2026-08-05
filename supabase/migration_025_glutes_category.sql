-- Citadel Fitness — Glutes category
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).
--
-- Same pattern as migration_023's Boxing catalogue. category/type are
-- plain text columns (see schema.sql), so a new category needs no DDL —
-- just rows. Every exercise here is standard weight/rep training
-- (tracks_distance stays at its default true), and none duplicate the
-- glute-adjacent lifts already living under 'legs' (Glute Bridge, Hip
-- Thrust, Sumo Deadlift, Bulgarian Split Squat, Good Morning all already
-- exist there and are left in place).

insert into public.exercises (name, category, type, description) values
  ('Cable Kickback', 'glutes', 'strength', 'Kick one leg back against a low cable, isolating the glute through hip extension without loading the lower back.'),
  ('Hip Abduction Machine', 'glutes', 'strength', 'Push the knees outward against machine resistance while seated, isolating the glute medius that most standard lower-body pushes and pulls barely touch.'),
  ('Single-Leg Glute Bridge', 'glutes', 'strength', 'A bodyweight glute bridge performed on one leg at a time, forcing each side to work independently and exposing side-to-side imbalances.'),
  ('Cable Pull-Through', 'glutes', 'strength', 'Facing away from a low cable, hinge at the hips to pull the handle through the legs, grooving a hip-hinge pattern with constant tension on the glutes and hamstrings.'),
  ('Banded Lateral Walk', 'glutes', 'strength', 'Step sideways against a resistance band looped around the thighs or ankles, building glute medius strength and hip stability.'),
  ('Frog Pump', 'glutes', 'strength', 'Lying on the back with the soles of the feet together and knees dropped open, drive the hips up in short, fast reps for a high-rep glute burnout.'),
  ('Reverse Hyperextension', 'glutes', 'strength', 'Anchored at the hips on a bench or machine, raise the legs behind the body to extend the hips, working the glutes and lower back without compressing the spine.'),
  ('Curtsy Lunge', 'glutes', 'strength', 'Step one leg diagonally behind and across the other into a lunge, hitting the glute medius at an angle a standard lunge misses.')
on conflict (name) do nothing;
