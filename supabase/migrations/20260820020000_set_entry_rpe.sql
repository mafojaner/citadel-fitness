-- Per-set effort (RPE), plus the save_workout change to persist it.
--
-- RPE is "rate of perceived exertion" on the standard 1–10 scale, where 10
-- is a set with nothing left and 8 leaves roughly two reps in reserve. Half
-- points are conventional, so numeric rather than int.
--
-- Nullable with no default: every set logged before this, and every set from
-- a free account, genuinely has no RPE. A default of any number would invent
-- an effort level nobody reported, and would then feed straight into
-- averages as though it were real.

alter table public.set_entries add column if not exists rpe numeric;

alter table public.set_entries drop constraint if exists set_entries_rpe_check;
alter table public.set_entries
  add constraint set_entries_rpe_check check (rpe is null or (rpe >= 1 and rpe <= 10));

-- Deliberately NOT a new parameter: rpe travels inside the existing
-- p_exercises payload, per set, so the function keeps its 5-arg signature.
-- That matters because changing the signature would mean dropping and
-- re-granting the function (see 20260101000024), and because a client that
-- doesn't send rpe — an older build mid-rollout — keeps saving correctly,
-- with the coalesce below leaving it null rather than failing.
create or replace function public.save_workout(
  p_date date,
  p_exercises jsonb,
  p_weight_unit text default 'lb',
  p_distance_unit text default 'mi',
  p_logged_same_day boolean default true
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_workout_id uuid;
  v_exercise jsonb;
  v_logged_id uuid;
  v_set jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if jsonb_typeof(p_exercises) <> 'array' then
    raise exception 'p_exercises must be a JSON array';
  end if;

  if p_weight_unit not in ('lb', 'kg') then
    raise exception 'p_weight_unit must be lb or kg';
  end if;

  if p_distance_unit not in ('mi', 'km') then
    raise exception 'p_distance_unit must be mi or km';
  end if;

  select id into v_workout_id
  from public.workouts
  where user_id = v_user_id and date = p_date;

  if v_workout_id is null then
    insert into public.workouts (user_id, date, logged_same_day)
    values (v_user_id, p_date, p_logged_same_day)
    returning id into v_workout_id;
  else
    -- Replace the day's contents. Cascades to set_entries. Deliberately
    -- does not touch logged_same_day — an edit to an already-existing day
    -- never changes whether it originally counted.
    delete from public.logged_exercises where workout_id = v_workout_id;
  end if;

  for v_exercise in select * from jsonb_array_elements(p_exercises)
  loop
    insert into public.logged_exercises (workout_id, exercise_id)
    values (v_workout_id, (v_exercise->>'exercise_id')::uuid)
    returning id into v_logged_id;

    for v_set in
      select * from jsonb_array_elements(coalesce(v_exercise->'sets', '[]'::jsonb))
    loop
      insert into public.set_entries (
        logged_exercise_id,
        set_number,
        reps,
        weight,
        weight_unit,
        duration_seconds,
        distance,
        distance_unit,
        rpe
      )
      values (
        v_logged_id,
        coalesce((v_set->>'set_number')::int, 1),
        coalesce((v_set->>'reps')::int, 0),
        coalesce((v_set->>'weight')::numeric, 0),
        p_weight_unit,
        (v_set->>'duration_seconds')::int,
        (v_set->>'distance')::numeric,
        (v_set->>'rpe')::numeric
      );
    end loop;
  end loop;

  return v_workout_id;
end;
$$;

grant execute on function public.save_workout(date, jsonb, text, text, boolean) to authenticated;
