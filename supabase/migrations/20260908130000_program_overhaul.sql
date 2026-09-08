-- Rebuilds the programme catalogue, and adds two programmes to it.
--
-- The three that shipped were not merely short, they were wrong for their
-- own splits:
--
--   Push / Pull / Legs   Push had no overhead press and no lateral raise;
--                        Pull had no hinge, no rear delts and no face
--                        pulls; Legs had no quad accessory and no
--                        hamstring curl. Three movements a day.
--   Strength 5x5         Session B pressed on an incline instead of
--                        overhead, so the programme never pressed overhead
--                        anywhere in its cycle.
--   Upper / Lower        The most complete of the three, but Upper A had
--                        no shoulder or lateral work at all.
--
-- Every day below covers its split. The rep ranges follow the usual shape:
-- the compound first at a lower rep count, accessories behind it, isolation
-- last at higher reps.
--
-- Two new ones. Full Body 3-Day is the on-ramp the catalogue had no answer
-- for -- every programme here assumed an intermediate. Strength &
-- Conditioning alternates lifting with cardio days, which is what the
-- catalogue offered nothing of: a member who runs or rows had to choose
-- between a programme and their conditioning.
--
-- Cardio days carry 1 x 1 because `program_day_exercises` counts sets and
-- reps and a run has neither. The logging screen already draws duration
-- and distance fields for a cardio movement, so the pair is ignored where
-- it is meaningless; the app reads `exercises.type` and shows those days as
-- a duration rather than as "1 x 1".

-- ---------------------------------------------------------------------------
-- Programmes: refreshed copy on the existing three, two added
-- ---------------------------------------------------------------------------

-- Updated by slug rather than deleted and reinserted. `program_enrollments`
-- has a foreign key to `programs` with on delete cascade, so replacing a row
-- would silently un-enrol everyone following it.
update public.programs set
  name = 'Strength 5x5',
  description = 'Two alternating full-body sessions on the big lifts. Add weight when every set is completed.'
where slug = 'strength-5x5';

update public.programs set
  name = 'Push / Pull / Legs',
  description = 'Three sessions split by movement pattern, each covering its whole pattern. The standard intermediate split.'
where slug = 'push-pull-legs';

update public.programs set
  name = 'Upper / Lower',
  description = 'Four sessions alternating upper and lower body, with the volume for a hypertrophy block.'
where slug = 'upper-lower';

insert into public.programs (slug, name, description) values
  ('full-body-3', 'Full Body 3-Day',
   'Three full-body sessions a week. The place to start if a split would spread you too thin.'),
  ('strength-conditioning', 'Strength & Conditioning',
   'Lifting and cardio in one cycle: two strength days, two conditioning days, alternating.')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Days
-- ---------------------------------------------------------------------------

-- Cleared and rebuilt. Cascades to program_day_exercises, which is the
-- point: the day names are reused, so the exercises under them have to go
-- with them rather than being matched against a stale set.
delete from public.program_days
where program_id in (
  select id from public.programs
  where slug in ('strength-5x5', 'push-pull-legs', 'upper-lower', 'full-body-3', 'strength-conditioning')
);

insert into public.program_days (program_id, position, name)
select p.id, v.position, v.name
from (values
  ('strength-5x5', 1, 'Session A'),
  ('strength-5x5', 2, 'Session B'),
  ('push-pull-legs', 1, 'Push'),
  ('push-pull-legs', 2, 'Pull'),
  ('push-pull-legs', 3, 'Legs'),
  ('upper-lower', 1, 'Upper A'),
  ('upper-lower', 2, 'Lower A'),
  ('upper-lower', 3, 'Upper B'),
  ('upper-lower', 4, 'Lower B'),
  ('full-body-3', 1, 'Day A'),
  ('full-body-3', 2, 'Day B'),
  ('full-body-3', 3, 'Day C'),
  ('strength-conditioning', 1, 'Upper Strength'),
  ('strength-conditioning', 2, 'Intervals'),
  ('strength-conditioning', 3, 'Lower Strength'),
  ('strength-conditioning', 4, 'Steady State')
) as v(slug, position, name)
join public.programs p on p.slug = v.slug;

-- ---------------------------------------------------------------------------
-- Exercises per day
-- ---------------------------------------------------------------------------

-- Joined on name, so a movement the catalogue does not have is skipped
-- rather than failing the whole migration on a foreign key. A programme
-- missing one accessory is recoverable; a migration that will not apply is
-- not. Same reasoning the original seed recorded.
insert into public.program_day_exercises (program_day_id, exercise_id, position, target_sets, target_reps)
select d.id, e.id, v.position, v.sets, v.reps
from (values
  -- Strength 5x5 -----------------------------------------------------------
  ('strength-5x5', 'Session A', 'Squat', 1, 5, 5),
  ('strength-5x5', 'Session A', 'Bench Press', 2, 5, 5),
  ('strength-5x5', 'Session A', 'Barbell Row', 3, 5, 5),
  ('strength-5x5', 'Session A', 'Hanging Knee Raise', 4, 3, 12),
  -- Overhead Press, where this used to press on an incline. A 5x5 with no
  -- overhead press in either session is missing a whole movement pattern.
  ('strength-5x5', 'Session B', 'Squat', 1, 5, 5),
  ('strength-5x5', 'Session B', 'Overhead Press', 2, 5, 5),
  ('strength-5x5', 'Session B', 'Deadlift', 3, 1, 5),
  ('strength-5x5', 'Session B', 'Chin-Up', 4, 3, 8),

  -- Push / Pull / Legs -----------------------------------------------------
  ('push-pull-legs', 'Push', 'Bench Press', 1, 4, 6),
  ('push-pull-legs', 'Push', 'Overhead Press', 2, 3, 8),
  ('push-pull-legs', 'Push', 'Incline Dumbbell Press', 3, 3, 10),
  ('push-pull-legs', 'Push', 'Lateral Raise', 4, 3, 15),
  ('push-pull-legs', 'Push', 'Triceps Pushdown', 5, 3, 12),
  ('push-pull-legs', 'Pull', 'Barbell Row', 1, 4, 6),
  ('push-pull-legs', 'Pull', 'Pull-Up', 2, 3, 8),
  ('push-pull-legs', 'Pull', 'Seated Cable Row', 3, 3, 10),
  ('push-pull-legs', 'Pull', 'Face Pull', 4, 3, 15),
  ('push-pull-legs', 'Pull', 'Barbell Curl', 5, 3, 12),
  ('push-pull-legs', 'Legs', 'Squat', 1, 4, 6),
  ('push-pull-legs', 'Legs', 'Romanian Deadlift', 2, 3, 8),
  ('push-pull-legs', 'Legs', 'Leg Press', 3, 3, 12),
  ('push-pull-legs', 'Legs', 'Seated Leg Curl', 4, 3, 12),
  ('push-pull-legs', 'Legs', 'Standing Calf Raise', 5, 4, 15),

  -- Upper / Lower ----------------------------------------------------------
  ('upper-lower', 'Upper A', 'Bench Press', 1, 4, 8),
  ('upper-lower', 'Upper A', 'Barbell Row', 2, 4, 8),
  ('upper-lower', 'Upper A', 'Seated Dumbbell Shoulder Press', 3, 3, 10),
  ('upper-lower', 'Upper A', 'Lat Pulldown', 4, 3, 10),
  ('upper-lower', 'Upper A', 'Lateral Raise', 5, 3, 15),
  ('upper-lower', 'Lower A', 'Squat', 1, 4, 8),
  ('upper-lower', 'Lower A', 'Romanian Deadlift', 2, 3, 10),
  ('upper-lower', 'Lower A', 'Leg Press', 3, 3, 12),
  ('upper-lower', 'Lower A', 'Leg Curl', 4, 3, 12),
  ('upper-lower', 'Lower A', 'Standing Calf Raise', 5, 4, 15),
  ('upper-lower', 'Upper B', 'Incline Barbell Press', 1, 4, 8),
  ('upper-lower', 'Upper B', 'Seated Cable Row', 2, 4, 8),
  ('upper-lower', 'Upper B', 'Arnold Press', 3, 3, 10),
  ('upper-lower', 'Upper B', 'Face Pull', 4, 3, 15),
  ('upper-lower', 'Upper B', 'Dumbbell Curl', 5, 3, 12),
  ('upper-lower', 'Upper B', 'Triceps Pushdown', 6, 3, 12),
  ('upper-lower', 'Lower B', 'Deadlift', 1, 3, 5),
  ('upper-lower', 'Lower B', 'Front Squat', 2, 3, 8),
  ('upper-lower', 'Lower B', 'Bulgarian Split Squat', 3, 3, 10),
  ('upper-lower', 'Lower B', 'Seated Leg Curl', 4, 3, 12),
  ('upper-lower', 'Lower B', 'Seated Calf Raise', 5, 4, 15),

  -- Full Body 3-Day --------------------------------------------------------
  ('full-body-3', 'Day A', 'Squat', 1, 3, 8),
  ('full-body-3', 'Day A', 'Bench Press', 2, 3, 8),
  ('full-body-3', 'Day A', 'Barbell Row', 3, 3, 8),
  ('full-body-3', 'Day A', 'Hanging Knee Raise', 4, 3, 12),
  ('full-body-3', 'Day B', 'Deadlift', 1, 3, 5),
  ('full-body-3', 'Day B', 'Overhead Press', 2, 3, 8),
  ('full-body-3', 'Day B', 'Lat Pulldown', 3, 3, 10),
  ('full-body-3', 'Day B', 'Lunges', 4, 3, 10),
  ('full-body-3', 'Day C', 'Front Squat', 1, 3, 8),
  ('full-body-3', 'Day C', 'Incline Dumbbell Press', 2, 3, 10),
  ('full-body-3', 'Day C', 'Seated Cable Row', 3, 3, 10),
  ('full-body-3', 'Day C', 'Dumbbell Curl', 4, 3, 12),

  -- Strength & Conditioning ------------------------------------------------
  ('strength-conditioning', 'Upper Strength', 'Bench Press', 1, 4, 6),
  ('strength-conditioning', 'Upper Strength', 'Barbell Row', 2, 4, 6),
  ('strength-conditioning', 'Upper Strength', 'Overhead Press', 3, 3, 8),
  ('strength-conditioning', 'Upper Strength', 'Lat Pulldown', 4, 3, 10),
  ('strength-conditioning', 'Intervals', 'Rowing Intervals', 1, 1, 1),
  ('strength-conditioning', 'Intervals', 'Skipping (Jump Rope)', 2, 1, 1),
  ('strength-conditioning', 'Lower Strength', 'Squat', 1, 4, 6),
  ('strength-conditioning', 'Lower Strength', 'Romanian Deadlift', 2, 3, 8),
  ('strength-conditioning', 'Lower Strength', 'Leg Press', 3, 3, 12),
  ('strength-conditioning', 'Lower Strength', 'Standing Calf Raise', 4, 3, 15),
  ('strength-conditioning', 'Steady State', 'Incline Treadmill Walk', 1, 1, 1),
  ('strength-conditioning', 'Steady State', 'Ab Wheel Rollout', 2, 3, 10)
) as v(slug, day_name, exercise_name, position, sets, reps)
join public.programs p on p.slug = v.slug
join public.program_days d on d.program_id = p.id and d.name = v.day_name
join public.exercises e on e.name = v.exercise_name;

-- ---------------------------------------------------------------------------
-- Enrolments that now point past the end of their cycle
-- ---------------------------------------------------------------------------

-- Day counts did not change for the three that existed, so in practice this
-- clamps nothing today. It is here because the rebuild above makes the day
-- count a thing that *can* change, and a `next_position` past the end would
-- otherwise silently fall back to day one on every read without ever being
-- corrected -- the cycle would look stuck rather than wrapped.
update public.program_enrollments e
set next_position = 1
where e.next_position > (
  select count(*) from public.program_days d where d.program_id = e.program_id
);
