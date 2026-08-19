-- Citadel Fitness — record which unit each set was actually logged in
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).
--
-- Why: set_entries.weight/distance were bare numbers with no record of
-- which unit they were entered in. Switching your lb/kg preference didn't
-- convert historical numbers — it just relabelled them, so a set logged as
-- 225 lb would display as "225 kg" after switching, silently wrong.
--
-- Fix (chosen over converting historical data or auto-converting on every
-- toggle): tag every set with the unit it was actually entered in, and
-- always display it in that unit — never silently rewrite a number the
-- user actually typed. Existing rows can't have their real original unit
-- recovered, so they're backfilled to the app's long-standing default
-- (lb / mi) via the column DEFAULT below, which is a labelled assumption,
-- not a claim of certainty.
--
-- Aggregates (weekly volume, the progress chart) are a different case —
-- they're computed, not user-entered, so summing mixed units would just be
-- mathematically wrong. save_workout is unaffected by this file, but see
-- the accompanying application code, which normalizes to a common unit
-- before summing and only converts for that computed total, never for an
-- individual set's stored value.

alter table public.set_entries
  add column if not exists weight_unit text not null default 'lb'
    check (weight_unit in ('lb', 'kg')),
  add column if not exists distance_unit text not null default 'mi'
    check (distance_unit in ('mi', 'km'));

-- Replaces migration_005's save_workout with one that also stores which
-- unit the sets in this save were entered in. Old 2-argument signature is
-- dropped first so there's exactly one version of this function, not an
-- ambiguous overload.
drop function if exists public.save_workout(date, jsonb);

create or replace function public.save_workout(
  p_date date,
  p_exercises jsonb,
  p_weight_unit text default 'lb',
  p_distance_unit text default 'mi'
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
    insert into public.workouts (user_id, date)
    values (v_user_id, p_date)
    returning id into v_workout_id;
  else
    -- Replace the day's contents. Cascades to set_entries.
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
        duration_minutes,
        distance,
        distance_unit
      )
      values (
        v_logged_id,
        coalesce((v_set->>'set_number')::int, 1),
        coalesce((v_set->>'reps')::int, 0),
        coalesce((v_set->>'weight')::numeric, 0),
        p_weight_unit,
        (v_set->>'duration_minutes')::numeric,
        (v_set->>'distance')::numeric,
        p_distance_unit
      );
    end loop;
  end loop;

  return v_workout_id;
end;
$$;

grant execute on function public.save_workout(date, jsonb, text, text) to authenticated;
