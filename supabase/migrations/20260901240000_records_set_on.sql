-- Which personal records were set on a given day.
--
-- Setting a record is the most motivating thing that happens in the app, and
-- it was discoverable only by leaving the workout you just saved, opening a
-- separate screen, and reading six dates. The moment that matters is the
-- moment the set is saved.
--
-- Same rule as everywhere else records are counted: a record belongs to the
-- day the heaviest set for that exercise was first achieved. Re-logging the
-- same weight later is not a new record, because ties go to the earliest
-- date -- which is what computePersonalRecords does on the client and what
-- fortress_summary_for counts for the week.
create or replace function public.get_records_set_on(
  p_date date,
  p_weight_unit text default 'kg'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if public.tier_rank(v_uid) < 1 then
    raise exception 'Fortress feature';
  end if;
  if p_weight_unit not in ('kg','lb') then
    raise exception 'Unknown unit';
  end if;

  return coalesce((
    select jsonb_agg(
             jsonb_build_object(
               'exerciseName', r.name,
               'weight', round(r.top, 1),
               'reps', r.reps
             )
             order by r.top desc
           )
    from (
      select
        e.name,
        mx.top,
        -- The reps on the heaviest set, so the announcement can say what was
        -- actually done rather than just a number.
        (
          select se3.reps
          from public.workouts w3
          join public.logged_exercises le3 on le3.workout_id = w3.id
          join public.set_entries se3 on se3.logged_exercise_id = le3.id
          where w3.user_id = v_uid
            and le3.exercise_id = le.exercise_id
            and se3.weight is not null
            and (case
                   when se3.weight_unit::text = p_weight_unit then se3.weight
                   when se3.weight_unit::text = 'kg' then se3.weight * 2.2046226218
                   else se3.weight / 2.2046226218
                 end) = mx.top
          order by w3.date, se3.reps desc
          limit 1
        ) as reps
      from public.logged_exercises le
      join public.workouts w on w.id = le.workout_id
      join public.exercises e on e.id = le.exercise_id
      join lateral (
        select max(
                 case
                   when se2.weight_unit::text = p_weight_unit then se2.weight
                   when se2.weight_unit::text = 'kg' then se2.weight * 2.2046226218
                   else se2.weight / 2.2046226218
                 end
               ) as top
        from public.workouts w2
        join public.logged_exercises le2 on le2.workout_id = w2.id
        join public.set_entries se2 on se2.logged_exercise_id = le2.id
        where w2.user_id = v_uid
          and le2.exercise_id = le.exercise_id
          and se2.weight is not null
      ) mx on true
      where w.user_id = v_uid
        and w.date = p_date
        and mx.top > 0
        -- The all-time best for this lift was first achieved on this date.
        and (
          select min(w4.date)
          from public.workouts w4
          join public.logged_exercises le4 on le4.workout_id = w4.id
          join public.set_entries se4 on se4.logged_exercise_id = le4.id
          where w4.user_id = v_uid
            and le4.exercise_id = le.exercise_id
            and (case
                   when se4.weight_unit::text = p_weight_unit then se4.weight
                   when se4.weight_unit::text = 'kg' then se4.weight * 2.2046226218
                   else se4.weight / 2.2046226218
                 end) = mx.top
        ) = p_date
      group by e.name, mx.top, le.exercise_id
    ) r
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.get_records_set_on(date, text) from public;
revoke all on function public.get_records_set_on(date, text) from anon;
grant execute on function public.get_records_set_on(date, text) to authenticated;
