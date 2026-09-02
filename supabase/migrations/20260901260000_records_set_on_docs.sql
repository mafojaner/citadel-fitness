-- Documentation fix for get_records_set_on. Body unchanged.
--
-- The original header said "which personal records were set on a given day",
-- which is not what it computes and would have misled the next caller. A
-- probe made the difference visible: log 100kg, then 100kg again, then
-- 105kg, and ask about the first day -- it returns nothing, because by then
-- the 100kg no longer stands.
--
-- That is the correct behaviour for the only thing calling it. The workout
-- save path asks about today, immediately after writing, so a set that is
-- the all-time best right now is exactly the set worth celebrating. The
-- alternative -- "was this a record on the day it happened" -- would
-- announce records that have since been beaten, which is a worse thing to
-- tell someone than nothing.
--
-- Replaced rather than left with a wrong comment, so the repository and the
-- database say the same thing about it.
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
  -- Returns the exercises whose CURRENT all-time heaviest set was first
  -- achieved on p_date. Not "records as of that day": a lift beaten since is
  -- deliberately absent.
  --
  -- Ties go to the earliest date, so re-logging the same weight later is not
  -- a new record. That matches computePersonalRecords on the client and the
  -- weekly count in fortress_summary_for, so no two places in this app can
  -- disagree about what counts as a personal record.
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
