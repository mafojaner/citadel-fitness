-- Citadel Fitness — core category
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).
--
-- Adds a "Core" category to the exercise catalogue. exercises.category has
-- no check constraint (per migration_008's note), so no schema change is
-- needed here — this only seeds the exercises. Idempotent via the
-- exercises_name_unique constraint added in migration_003.
--
-- Plank and Side Plank are tagged 'cardio' type (not because they're
-- cardiovascular, but because the app's type field really means "tracked
-- by duration" vs "tracked by reps/weight", and holds are timed, not
-- repped) — matching how existing duration-based movements are classified.

insert into public.exercises (name, category, type, description) values
  ('Plank', 'core', 'cardio', 'Hold a straight-body position on forearms and toes, bracing the core to keep the hips from sagging or piking.'),
  ('Side Plank', 'core', 'cardio', 'Hold a straight-body position on one forearm and the side of one foot, bracing the obliques to keep the hips lifted.'),
  ('Crunches', 'core', 'strength', 'Lying on your back with knees bent, curl the shoulders off the floor toward the hips to isolate the upper abs.'),
  ('Bicycle Crunches', 'core', 'strength', 'Alternate bringing elbow to opposite knee in a pedaling motion, working the rectus abdominis and obliques together.'),
  ('Sit-Up', 'core', 'strength', 'Lying on your back with knees bent, curl the entire torso up to a seated position, a fuller range than a crunch.'),
  ('Russian Twist', 'core', 'strength', 'Seated with feet lifted and torso leaned back, rotate side to side to build rotational core strength through the obliques.'),
  ('Leg Raise', 'core', 'strength', 'Lying flat, lift straight legs toward the ceiling under control, targeting the lower abs and hip flexors.'),
  ('Hanging Leg Raise', 'core', 'strength', 'Hanging from a bar, raise the legs toward the chest without swinging, a harder lower-ab variation than the floor version.'),
  ('Mountain Climbers', 'core', 'strength', 'From a plank position, drive the knees toward the chest in a quick alternating run, combining core work with a cardio pulse.'),
  ('Ab Wheel Rollout', 'core', 'strength', 'Kneeling with a wheel in both hands, roll forward and back under control, one of the hardest anti-extension core exercises.'),
  ('Cable Crunch', 'core', 'strength', 'Kneeling below a high cable, crunch the torso down against resistance for a loaded, progressive ab exercise.'),
  ('Dead Bug', 'core', 'strength', 'Lying on your back with arms and legs raised, lower opposite arm and leg toward the floor while keeping the lower back pressed down, training core control under movement.')
on conflict (name) do nothing;
