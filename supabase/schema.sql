-- Citadel Fitness — initial schema
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).

-- Profiles: one row per auth user, backs the app's UserProfile type.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Exercises: shared catalogue, readable by any signed-in user.
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  created_at timestamptz not null default now()
);

alter table public.exercises enable row level security;

create policy "Authenticated users can read exercises"
  on public.exercises for select
  to authenticated
  using (true);

-- Workouts: one per logged day per user.
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now()
);

create index workouts_user_date_idx on public.workouts (user_id, date);

alter table public.workouts enable row level security;

create policy "Users can manage their own workouts"
  on public.workouts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Logged exercises: an exercise performed within a workout.
create table public.logged_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  created_at timestamptz not null default now()
);

alter table public.logged_exercises enable row level security;

create policy "Users can manage logged exercises on their own workouts"
  on public.logged_exercises for all
  using (exists (
    select 1 from public.workouts w
    where w.id = workout_id and w.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.workouts w
    where w.id = workout_id and w.user_id = auth.uid()
  ));

-- Set entries: individual sets (reps/weight) within a logged exercise.
create table public.set_entries (
  id uuid primary key default gen_random_uuid(),
  logged_exercise_id uuid not null references public.logged_exercises(id) on delete cascade,
  set_number int not null,
  reps int not null default 0,
  weight numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.set_entries enable row level security;

create policy "Users can manage sets on their own logged exercises"
  on public.set_entries for all
  using (exists (
    select 1 from public.logged_exercises le
    join public.workouts w on w.id = le.workout_id
    where le.id = logged_exercise_id and w.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.logged_exercises le
    join public.workouts w on w.id = le.workout_id
    where le.id = logged_exercise_id and w.user_id = auth.uid()
  ));

-- Seed the exercise catalogue.
insert into public.exercises (name, category) values
  ('Bench Press', 'chest'),
  ('Incline Dumbbell Press', 'chest'),
  ('Push-Up', 'chest'),
  ('Pull-Up', 'back'),
  ('Barbell Row', 'back'),
  ('Lat Pulldown', 'back'),
  ('Squat', 'legs'),
  ('Deadlift', 'legs'),
  ('Lunges', 'legs'),
  ('Running', 'cardio'),
  ('Cycling', 'cardio'),
  ('Rowing', 'cardio');
