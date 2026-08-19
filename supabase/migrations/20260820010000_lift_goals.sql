-- Target lifts: "squat 140 kg by December", with the projection computed
-- client-side from logged history rather than stored, so a goal never goes
-- stale against corrected workouts.
--
-- target_unit is stored alongside the number for the same reason set_entries
-- carries weight_unit (see 20260101000009): a goal set in kg must keep
-- meaning kg after someone switches their display preference to lb, rather
-- than silently becoming a much easier target.

create table public.lift_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  target_weight numeric not null check (target_weight > 0),
  target_unit text not null check (target_unit in ('kg', 'lb')),
  target_date date not null,
  created_at timestamptz not null default now(),
  -- One live goal per lift. Two competing targets for the same exercise
  -- has no sensible answer for "are you on track", and the UI would have to
  -- invent one.
  unique (user_id, exercise_id)
);

alter table public.lift_goals enable row level security;

create policy "Users can view their own lift goals"
  on public.lift_goals for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own lift goals"
  on public.lift_goals for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own lift goals"
  on public.lift_goals for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own lift goals"
  on public.lift_goals for delete
  to authenticated
  using (auth.uid() = user_id);

-- The only query this table serves is "my goals", and without this it's a
-- sequential scan once the table has more than one user's rows in it.
create index lift_goals_user_id_idx on public.lift_goals (user_id);
