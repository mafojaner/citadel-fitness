-- Structured programs: pick a template, and it tells you what today's
-- session is instead of you deciding at the gym door.
--
-- Days are a repeating *cycle* addressed by position, not a calendar. A
-- 5x5 alternates A/B forever; push/pull/legs repeats every three sessions.
-- Modelling weeks and dates instead would mean deciding what happens when
-- someone trains four times in a week, or misses eight days — a cycle just
-- advances when you train, so rest days need no representation at all.

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table public.program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  position int not null check (position > 0),
  name text not null,
  unique (program_id, position)
);

create table public.program_day_exercises (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references public.program_days(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  position int not null check (position > 0),
  target_sets int not null check (target_sets between 1 and 20),
  target_reps int not null check (target_reps between 1 and 100),
  unique (program_day_id, position)
);

create table public.program_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  started_on date not null default current_date,
  -- Where the cycle is up to. Advanced when a session is loaded, so the
  -- program follows training rather than the calendar.
  next_position int not null default 1 check (next_position > 0),
  -- One at a time: following two programs at once has no coherent answer
  -- for "what's my next session", and the UI would have to invent one.
  unique (user_id)
);

-- The three template tables are shared reference data, exactly like
-- exercises: readable by any signed-in user, writable by nobody through
-- the API. New programs are added by migration.
alter table public.programs enable row level security;
alter table public.program_days enable row level security;
alter table public.program_day_exercises enable row level security;

create policy "Authenticated users can read programs"
  on public.programs for select to authenticated using (true);
create policy "Authenticated users can read program days"
  on public.program_days for select to authenticated using (true);
create policy "Authenticated users can read program day exercises"
  on public.program_day_exercises for select to authenticated using (true);

alter table public.program_enrollments enable row level security;

create policy "Users can view their own enrollment"
  on public.program_enrollments for select to authenticated using (auth.uid() = user_id);
create policy "Users can create their own enrollment"
  on public.program_enrollments for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update their own enrollment"
  on public.program_enrollments for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own enrollment"
  on public.program_enrollments for delete to authenticated using (auth.uid() = user_id);

create index program_days_program_id_idx on public.program_days (program_id);
create index program_day_exercises_day_id_idx on public.program_day_exercises (program_day_id);

-- ---------------------------------------------------------------------
-- Seed: three programs covering the common starting points.

insert into public.programs (slug, name, description) values
  ('strength-5x5', 'Strength 5×5',
   'Two alternating full-body sessions built on the big lifts. Add weight when you complete every set.'),
  ('push-pull-legs', 'Push / Pull / Legs',
   'A three-session cycle splitting the week by movement pattern. The most common intermediate split.'),
  ('upper-lower', 'Upper / Lower',
   'Four sessions alternating upper and lower body, with enough volume for a hypertrophy block.')
on conflict (slug) do nothing;

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
  ('upper-lower', 4, 'Lower B')
) as v(slug, position, name)
join public.programs p on p.slug = v.slug
on conflict (program_id, position) do nothing;

-- Joined to exercises by name rather than a pasted uuid: the ids differ
-- between environments, and a join simply skips any exercise this
-- catalogue doesn't have instead of failing the whole migration on a
-- foreign key. A program missing one accessory movement is recoverable;
-- a migration that won't apply is not.
insert into public.program_day_exercises (program_day_id, exercise_id, position, target_sets, target_reps)
select d.id, e.id, v.position, v.sets, v.reps
from (values
  -- Strength 5x5
  ('strength-5x5', 'Session A', 'Squat', 1, 5, 5),
  ('strength-5x5', 'Session A', 'Bench Press', 2, 5, 5),
  ('strength-5x5', 'Session A', 'Barbell Row', 3, 5, 5),
  ('strength-5x5', 'Session B', 'Squat', 1, 5, 5),
  ('strength-5x5', 'Session B', 'Incline Barbell Press', 2, 5, 5),
  ('strength-5x5', 'Session B', 'Deadlift', 3, 1, 5),
  -- Push / Pull / Legs
  ('push-pull-legs', 'Push', 'Bench Press', 1, 4, 8),
  ('push-pull-legs', 'Push', 'Incline Dumbbell Press', 2, 3, 10),
  ('push-pull-legs', 'Push', 'Overhead Triceps Extension', 3, 3, 12),
  ('push-pull-legs', 'Pull', 'Barbell Row', 1, 4, 8),
  ('push-pull-legs', 'Pull', 'Lat Pulldown', 2, 3, 10),
  ('push-pull-legs', 'Pull', 'Barbell Curl', 3, 3, 12),
  ('push-pull-legs', 'Legs', 'Squat', 1, 4, 8),
  ('push-pull-legs', 'Legs', 'Romanian Deadlift', 2, 3, 10),
  ('push-pull-legs', 'Legs', 'Standing Calf Raise', 3, 4, 15),
  -- Upper / Lower
  ('upper-lower', 'Upper A', 'Bench Press', 1, 4, 8),
  ('upper-lower', 'Upper A', 'Barbell Row', 2, 4, 8),
  ('upper-lower', 'Upper A', 'Incline Dumbbell Press', 3, 3, 10),
  ('upper-lower', 'Upper A', 'Lat Pulldown', 4, 3, 10),
  ('upper-lower', 'Lower A', 'Squat', 1, 4, 8),
  ('upper-lower', 'Lower A', 'Romanian Deadlift', 2, 3, 10),
  ('upper-lower', 'Lower A', 'Leg Press', 3, 3, 12),
  ('upper-lower', 'Lower A', 'Standing Calf Raise', 4, 4, 15),
  ('upper-lower', 'Upper B', 'Incline Barbell Press', 1, 4, 8),
  ('upper-lower', 'Upper B', 'Seated Cable Row', 2, 4, 8),
  ('upper-lower', 'Upper B', 'Dumbbell Curl', 3, 3, 12),
  ('upper-lower', 'Upper B', 'Close-Grip Bench Press', 4, 3, 10),
  ('upper-lower', 'Lower B', 'Deadlift', 1, 3, 5),
  ('upper-lower', 'Lower B', 'Front Squat', 2, 3, 8),
  ('upper-lower', 'Lower B', 'Leg Curl', 3, 3, 12),
  ('upper-lower', 'Lower B', 'Seated Calf Raise', 4, 4, 15)
) as v(slug, day_name, exercise_name, position, sets, reps)
join public.programs p on p.slug = v.slug
join public.program_days d on d.program_id = p.id and d.name = v.day_name
join public.exercises e on e.name = v.exercise_name
on conflict (program_day_id, position) do nothing;
