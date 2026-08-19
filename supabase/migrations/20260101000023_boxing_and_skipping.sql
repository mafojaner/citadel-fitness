-- Citadel Fitness — boxing category, skipping, and distance-aware entry
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).
--
-- Three related changes, all aimed at making the logging screen ask for
-- fields that actually apply to the exercise in front of you:
--
-- 1. tracks_distance flag. The `type` column only has two values, and
--    'cardio' really means "tracked by time" — so every timed exercise
--    currently also shows a Distance field. That's meaningless for a
--    plank, a skipping session, or three rounds on the heavy bag. This
--    adds an explicit per-exercise flag; it defaults to true, so nothing
--    that legitimately covers ground (running, cycling, rowing) changes.
--
-- 2. Skipping. 'Jump Rope' already existed — its own description read
--    "Skipping rope at a steady or fast pace". Rather than inserting a
--    duplicate row for the same movement, this renames it so both terms
--    find it in search. Renaming in place keeps the id, so workouts
--    already logged against it stay intact.
--
-- 3. Boxing category. Boxing is round-based: you log time, not reps or
--    distance, so every entry here is a timed exercise with distance off.
--    The two conditioning lifts at the end are rep-based on purpose.

-- 1. Distance-aware entry ------------------------------------------------
alter table public.exercises
  add column if not exists tracks_distance boolean not null default true;

-- 2. Skipping -------------------------------------------------------------
update public.exercises
  set name = 'Skipping (Jump Rope)',
      description = 'Skipping rope at a steady or fast pace to build cardiovascular conditioning, coordination, and calf endurance. A boxing staple for footwork and rhythm.'
  where name = 'Jump Rope';

-- 3. Boxing catalogue -----------------------------------------------------
insert into public.exercises (name, category, type, description, tracks_distance) values
  ('Shadowboxing', 'boxing', 'cardio', 'Throwing punches and moving against no resistance, focusing on form, rhythm, and head movement. Usually worked in timed rounds.', false),
  ('Heavy Bag Work', 'boxing', 'cardio', 'Punching a heavy bag in timed rounds to build power, endurance, and combination fluency.', false),
  ('Speed Bag', 'boxing', 'cardio', 'Rhythmic striking of a small inflated bag to build hand speed, timing, and shoulder endurance.', false),
  ('Double-End Bag', 'boxing', 'cardio', 'Striking a tethered floor-to-ceiling bag that rebounds unpredictably, sharpening accuracy, timing, and defensive reactions.', false),
  ('Focus Mitts', 'boxing', 'cardio', 'Punching hand-held pads fed by a partner or coach, drilling combinations, accuracy, and counters under live timing.', false),
  ('Sparring', 'boxing', 'cardio', 'Controlled live boxing against a partner in timed rounds, applying offence and defence at working intensity.', false),
  ('Slip Rope Drill', 'boxing', 'cardio', 'Moving under and around a horizontal rope to drill slipping, ducking, and head movement without a partner.', false),
  ('Footwork Drill', 'boxing', 'cardio', 'Timed ladder, cone, or pivot work to build ring movement, balance, and the ability to punch off either foot.', false),
  ('Boxing Conditioning Circuit', 'boxing', 'cardio', 'A continuous timed circuit of boxing-specific conditioning — burpees, sprawls, and punch-outs — run at round pace.', false),
  ('Medicine Ball Rotational Throw', 'boxing', 'strength', 'Explosively rotating through the hips to throw a medicine ball into a wall, training the trunk rotation that drives punching power.', true),
  ('Neck Harness Extension', 'boxing', 'strength', 'Controlled neck extension against a weighted harness to build the neck strength that helps absorb impact.', true)
on conflict (name) do nothing;

-- Turn distance off for timed exercises where it never made sense.
-- Safe to re-run, and names that don't exist simply don't match.
update public.exercises
  set tracks_distance = false
  where name in (
    'Skipping (Jump Rope)',
    'Battle Ropes',
    'HIIT Circuit',
    'Plank',
    'Side Plank'
  );

-- Every boxing exercise is round-based, never distance-based.
update public.exercises set tracks_distance = false where category = 'boxing' and type = 'cardio';
