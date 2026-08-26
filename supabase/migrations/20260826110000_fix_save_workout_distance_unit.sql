-- Restore p_distance_unit to save_workout's insert. Logging has been broken
-- since 20260820020000 for every account on every tier.
--
-- That migration added `rpe` to the set_entries insert. It added the column
-- to the target list but not a value to the VALUES list, so the two fell out
-- of step: nine targets, eight expressions, with rpe's expression sitting in
-- distance_unit's position. Postgres refuses the whole statement with
--
--   42601 INSERT has more target columns than expressions
--
-- which aborts save_workout, which fails every save. Confirmed against
-- production by calling the deployed function as a free account inside a
-- transaction that then rolled back: 0 sets written, that exact SQLSTATE.
--
-- Two things let it reach production and both are worth naming, because the
-- fix for the next one is not this file.
--
-- Postgres does not catch it at CREATE FUNCTION time. plpgsql validates
-- syntax and expressions, not the shape of an INSERT against its target
-- table, so `db push` reported success on a function that could not run. A
-- green migration is not a working migration.
--
-- Nothing else covered it either. The 236 tests are all pure functions --
-- buildSaveWorkoutParams is tested and correct, and it was never the
-- problem. The Aug 25 feature walk recorded RPE as verified, but what was
-- checked was that the input renders in the logging flow, not that a save
-- carrying one succeeds. A field can render perfectly and still be
-- unsaveable.
--
-- The column list is left exactly as it was and only the values list is
-- corrected, so the diff shows the one line that was missing rather than
-- a rewrite that hides it.
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
        p_distance_unit,
        (v_set->>'rpe')::numeric
      );
    end loop;
  end loop;

  return v_workout_id;
end;
$$;

grant execute on function public.save_workout(date, jsonb, text, text, boolean) to authenticated;

-- Prove it in the same transaction that creates it, so a broken definition
-- can never again report success. This is the check Postgres does not do:
-- run the function for real, confirm the row lands with every column
-- populated, then undo it.
do $$
declare
  v_uid uuid; v_ex uuid; v_wid uuid; v_se public.set_entries;
begin
  select id into v_uid from auth.users order by created_at limit 1;
  select id into v_ex from public.exercises where type = 'strength' limit 1;
  if v_uid is null or v_ex is null then
    raise notice 'save_workout self-test skipped: no users or no exercises';
    return;
  end if;

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  v_wid := public.save_workout(
    date '1900-01-01',
    jsonb_build_array(jsonb_build_object(
      'exercise_id', v_ex,
      'sets', jsonb_build_array(jsonb_build_object(
        'set_number', 1, 'reps', 5, 'weight', 100, 'distance', 2.5, 'rpe', 8)))),
    'kg', 'km', true);

  select se.* into v_se
  from public.set_entries se
  join public.logged_exercises le on le.id = se.logged_exercise_id
  where le.workout_id = v_wid;

  if v_se.weight_unit <> 'kg' or v_se.distance_unit <> 'km' then
    raise exception 'save_workout self-test: units landed wrong (weight=%, distance=%)',
      v_se.weight_unit, v_se.distance_unit;
  end if;
  if v_se.distance <> 2.5 or v_se.reps <> 5 then
    raise exception 'save_workout self-test: values landed wrong (distance=%, reps=%)',
      v_se.distance, v_se.reps;
  end if;

  -- The sentinel date is never a real workout, but leaving it behind would
  -- still be this migration writing a row nobody logged.
  delete from public.workouts where id = v_wid;
  perform set_config('request.jwt.claims', '', true);
end $$;
