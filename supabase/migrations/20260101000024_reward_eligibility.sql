-- Citadel Fitness — only same-day logging counts toward rewards
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).
--
-- Why: the weekly reward cycle currently counts a day the moment
-- public.workouts has a row for it, with no way to tell a same-day entry
-- from one backfilled weeks later through the calendar's "Enter a workout"
-- flow. Someone could sit down once a week and backdate four fake days to
-- fabricate a complete week. Backdating itself is legitimate (recording a
-- workout you genuinely did but forgot to log) — it just shouldn't earn a
-- reward meant to track same-day consistency.
--
-- logged_same_day defaults to true, grandfathering in every existing row:
-- there's no reliable way to reconstruct whether a historical entry was
-- backdated, and applying a rule retroactively that didn't exist when
-- those rows were written would unfairly break existing streaks. Only
-- rows inserted from here on carry a real value, set once at creation and
-- never touched again — see save_workout below, which only writes it on
-- the insert branch. Editing an already-logged day later (fixing a typo'd
-- weight, adding a set) can never retroactively disqualify it, the same
-- way created_at is already left untouched by edits.

alter table public.workouts
  add column if not exists logged_same_day boolean not null default true;

-- Replaces migration_022's save_workout with one that also records whether
-- this save's date was actually "today" on the caller's device at the
-- moment of saving. Adding a parameter changes the function's signature
-- identity, so the old 4-arg overload must be dropped first — same
-- reasoning as migration_009.
drop function if exists public.save_workout(date, jsonb, text, text);

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

  -- Find or create the single workout row for this user/day.
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
        distance_unit
      )
      values (
        v_logged_id,
        coalesce((v_set->>'set_number')::int, 1),
        coalesce((v_set->>'reps')::int, 0),
        coalesce((v_set->>'weight')::numeric, 0),
        p_weight_unit,
        (v_set->>'duration_seconds')::int,
        (v_set->>'distance')::numeric,
        p_distance_unit
      );
    end loop;
  end loop;

  return v_workout_id;
end;
$$;

grant execute on function public.save_workout(date, jsonb, text, text, boolean) to authenticated;
