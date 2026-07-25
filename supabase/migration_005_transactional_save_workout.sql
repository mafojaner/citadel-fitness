-- Citadel Fitness — make saving a workout atomic
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).
--
-- Why: the client previously saved an edited day by deleting that day's
-- logged_exercises and then inserting the new ones as separate requests.
-- If the insert failed after the delete committed (dropped connection, bad
-- value), the original workout was destroyed and the replacement was never
-- written — silent data loss. The Supabase JS client can't run
-- multi-statement transactions, so the whole operation moves into this
-- plpgsql function, which runs in a single implicit transaction: if any
-- statement raises, everything rolls back and the existing day is untouched.
--
-- security invoker (the default) is deliberate: the function runs as the
-- calling user, so the existing RLS policies on workouts / logged_exercises /
-- set_entries still apply. The user id comes from auth.uid() rather than a
-- parameter so a caller can't write into someone else's account.

create or replace function public.save_workout(
  p_date date,
  p_exercises jsonb
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
        duration_minutes,
        distance
      )
      values (
        v_logged_id,
        coalesce((v_set->>'set_number')::int, 1),
        coalesce((v_set->>'reps')::int, 0),
        coalesce((v_set->>'weight')::numeric, 0),
        (v_set->>'duration_minutes')::numeric,
        (v_set->>'distance')::numeric
      );
    end loop;
  end loop;

  return v_workout_id;
end;
$$;

grant execute on function public.save_workout(date, jsonb) to authenticated;
