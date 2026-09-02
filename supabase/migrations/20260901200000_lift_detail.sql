-- Everything the app knows about one lift, in one place.
--
-- Goal forecasting, the personal records vault and the strength progression
-- list are three descriptions of the same exercise, built on the same logged
-- sets, with no route between them. A goal on Bench Press could not reach
-- the Bench Press record, and neither could reach its progression line --
-- which is what makes the tier feel like ten features rather than one
-- product.
--
-- This is the query behind the screen that joins them. One call rather than
-- three, because all three answers come from the same rows and pulling them
-- separately would read the member's history three times to say one thing.
create or replace function public.get_lift_detail(
  p_exercise_id uuid,
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
  v_today date := current_date;
  v_exercise jsonb;
  v_record jsonb;
  v_goal jsonb;
  v_series jsonb;
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

  select jsonb_build_object('id', e.id, 'name', e.name, 'category', e.category::text, 'type', e.type::text)
    into v_exercise
  from public.exercises e
  where e.id = p_exercise_id;

  if v_exercise is null then
    raise exception 'No such exercise';
  end if;

  -- Every set for this lift, converted once into the display unit.
  with mine as (
    select
      w.date as d,
      case
        when se.weight is null then 0
        when se.weight_unit::text = p_weight_unit then se.weight
        when se.weight_unit::text = 'kg' then se.weight * 2.2046226218
        else se.weight / 2.2046226218
      end as weight,
      coalesce(se.reps, 0) as reps
    from public.workouts w
    join public.logged_exercises le on le.workout_id = w.id
    join public.set_entries se on se.logged_exercise_id = le.id
    where w.user_id = v_uid and le.exercise_id = p_exercise_id
  ),
  heaviest as (
    select weight, reps, d
    from mine
    where weight > 0
    -- Ties go to the earliest date: a record belongs to the session that
    -- first achieved it, not the most recent one to equal it. Same rule
    -- computePersonalRecords applies, so the two cannot disagree.
    order by weight desc, d asc
    limit 1
  ),
  -- Epley, capped at 12 reps, matching estimateOneRepMax in
  -- lib/personalRecords.ts. Above that the estimate stops meaning anything
  -- and an absent record reads better than a false one.
  estimates as (
    select d, weight * (1 + reps::numeric / 30) as e1rm
    from mine
    where weight > 0 and reps > 0 and reps <= 12
  ),
  best_estimate as (
    select e1rm, d from estimates order by e1rm desc, d asc limit 1
  ),
  per_day as (
    select d, max(e1rm) as e1rm from estimates group by d order by d
  )
  select
    jsonb_build_object(
      'totalSets', (select count(*) from mine),
      'lastPerformed', (select max(d) from mine),
      'heaviestWeight', (select round(weight, 1) from heaviest),
      'heaviestReps', (select reps from heaviest),
      'heaviestDate', (select d from heaviest),
      'bestEstimate', (select round(e1rm, 1) from best_estimate),
      'bestEstimateDate', (select d from best_estimate)
    ),
    coalesce(
      (select jsonb_agg(jsonb_build_object('date', d, 'value', round(e1rm, 1)) order by d)
       from per_day),
      '[]'::jsonb
    )
    into v_record, v_series;

  -- The goal, if this lift has one. Includes past-date goals here, unlike
  -- the home summary: on the lift's own screen an overdue target is
  -- information, not noise.
  select jsonb_build_object(
           'id', g.id,
           'target', round(g.target_weight, 1),
           'unit', g.target_unit,
           'targetDate', g.target_date,
           'daysLeft', (g.target_date - v_today)
         )
    into v_goal
  from public.lift_goals g
  where g.user_id = v_uid and g.exercise_id = p_exercise_id;

  return jsonb_build_object(
    'exercise', v_exercise,
    'record', v_record,
    'goal', v_goal,
    'series', v_series
  );
end;
$$;

revoke all on function public.get_lift_detail(uuid, text) from public;
revoke all on function public.get_lift_detail(uuid, text) from anon;
grant execute on function public.get_lift_detail(uuid, text) to authenticated;
