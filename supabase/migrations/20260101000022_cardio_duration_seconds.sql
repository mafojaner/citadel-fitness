-- Citadel Fitness — cardio duration in seconds, with hours/minutes/seconds entry
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).
--
-- Why: duration was stored as a single "minutes" number, and the Add Workout
-- screen only exposed one plain-minutes field for it — there was no way to
-- log a 1h 23m session or a 45-second sprint without doing the math yourself
-- and typing a decimal into a field labelled "min". The app is switching to
-- separate Hours / Minutes / Seconds inputs, which need an exact underlying
-- unit to compose into — seconds, stored as an integer, has none of the
-- rounding error a fractional "83.75 minutes" built from parts can have.
--
-- Existing values are preserved: duration_minutes is backfilled into the
-- new duration_seconds column (rounded to the nearest second) before the
-- old column is dropped, so no historical cardio session loses its logged
-- duration.

alter table public.set_entries add column if not exists duration_seconds int;

update public.set_entries
  set duration_seconds = round(duration_minutes * 60)
  where duration_minutes is not null and duration_seconds is null;

alter table public.set_entries drop constraint if exists set_entries_duration_check;
alter table public.set_entries drop constraint if exists set_entries_duration_seconds_check;
alter table public.set_entries add constraint set_entries_duration_seconds_check
  check (duration_seconds is null or duration_seconds >= 0);

alter table public.set_entries drop column if exists duration_minutes;

-- Replaces migration_009's save_workout with one that stores
-- duration_seconds instead of duration_minutes. Signature is unchanged
-- (date, jsonb, text, text), so create-or-replace is enough — no need to
-- drop an overload first.
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

grant execute on function public.save_workout(date, jsonb, text, text) to authenticated;
