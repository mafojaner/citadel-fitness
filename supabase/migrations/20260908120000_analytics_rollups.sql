-- Per-day rollups behind the Fortress gate, for the rebuilt Advanced
-- analytics screen.
--
-- Deliberately NOT an extension of get_advanced_analytics. That function
-- returns nested shapes three screens depend on, and the same reasoning
-- get_period_comparison recorded applies here: adding something only one
-- screen needs to a function several rely on buys a shared blast radius for
-- nothing. This is a separate call with its own gate.
--
-- Also deliberately flat. Every column below is a sum, a count or a bucketed
-- count over one row per day per exercise, so it can be read and checked at
-- a glance; the derivations with real edge cases -- weekly grouping, streaks
-- across month boundaries, averaging RPE over only the sets that carried one
-- -- live in src/lib/analyticsDeep.ts, where they are unit tested. Nothing
-- about that weakens the gate: a free caller is refused here and so has
-- nothing to derive from.

create or replace function public.get_analytics_rollups(
  p_weight_unit text default 'kg',
  p_distance_unit text default 'km',
  p_period_days int default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_since date;
  v_rollups jsonb;
  v_top jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if public.tier_rank(v_uid) < 1 then
    raise exception 'Advanced analytics are a Fortress feature';
  end if;
  if p_weight_unit not in ('kg','lb') or p_distance_unit not in ('km','mi') then
    raise exception 'Unknown unit';
  end if;

  -- null period means everything ever logged, matching the sibling calls.
  v_since := case when p_period_days is null then null
                  else current_date - p_period_days end;

  with sets as (
    select
      w.date as d,
      le.exercise_id as ex_id,
      e.name as ex_name,
      e.category::text as ex_category,
      e.type::text as ex_type,
      -- Same conversion the other analytics functions use, so a member who
      -- logs in pounds and reads in kilos sees one set of numbers.
      case
        when se.weight is null then 0
        when se.weight_unit::text = p_weight_unit then se.weight
        when se.weight_unit::text = 'kg' then se.weight * 2.2046226218
        else se.weight / 2.2046226218
      end as weight,
      coalesce(se.reps, 0) as reps,
      se.rpe as rpe,
      coalesce(se.duration_seconds, 0) as duration_seconds,
      case
        when se.distance is null then 0
        when se.distance_unit::text = p_distance_unit then se.distance
        when se.distance_unit::text = 'km' then se.distance / 1.609344
        else se.distance * 1.609344
      end as distance
    from public.workouts w
    join public.logged_exercises le on le.workout_id = w.id
    join public.exercises e on e.id = le.exercise_id
    join public.set_entries se on se.logged_exercise_id = le.id
    where w.user_id = v_uid
      and (v_since is null or w.date >= v_since)
  ),
  rollups as (
    select
      d,
      ex_category,
      ex_type,
      count(*) as sets,
      sum(case when ex_type = 'cardio' then 0 else weight * reps end) as volume,
      -- Bands match the 1-5 / 6-12 / 13+ split the client names, and the
      -- 12-rep ceiling the one-rep-max estimate already stops at. Cardio has
      -- no meaningful rep count and lands in none of them.
      count(*) filter (where ex_type <> 'cardio' and reps between 1 and 5) as sets_low,
      count(*) filter (where ex_type <> 'cardio' and reps between 6 and 12) as sets_mid,
      count(*) filter (where ex_type <> 'cardio' and reps >= 13) as sets_high,
      -- Sum and count kept apart so the client can average across a week
      -- without weighting one day's rating by how many sets that day had.
      coalesce(sum(rpe), 0) as rpe_sum,
      count(rpe) as rpe_count,
      sum(duration_seconds) as duration_seconds,
      sum(distance) as distance,
      -- Epley, capped at 12 reps, matching estimateOneRepMax and
      -- get_personal_records. Zero when nothing that day qualified.
      coalesce(max(case when ex_type <> 'cardio' and weight > 0 and reps > 0 and reps <= 12
                        then weight * (1 + reps::numeric / 30) end), 0) as best_e1rm
    from sets
    group by d, ex_category, ex_type
  ),
  rollup_json as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'date', d,
      'category', ex_category,
      'type', ex_type,
      'sets', sets,
      'volume', round(volume, 1),
      'setsLow', sets_low,
      'setsMid', sets_mid,
      'setsHigh', sets_high,
      'rpeSum', round(rpe_sum, 1),
      'rpeCount', rpe_count,
      'durationSeconds', duration_seconds,
      'distance', round(distance, 1),
      'bestE1rm', round(best_e1rm, 1)
    ) order by d), '[]'::jsonb) as js
    from rollups
  ),
  -- The heaviest estimate each lift reached in the window, and the day it
  -- did. distinct on takes the first row per lift under the same ordering,
  -- which is the best estimate and the earliest day it was hit -- so a lift
  -- that matched its best twice is credited to when it first got there.
  per_lift as (
    select distinct on (ex_id)
      ex_id,
      ex_name,
      ex_category,
      d,
      weight * (1 + reps::numeric / 30) as e1rm
    from sets
    where ex_type <> 'cardio' and weight > 0 and reps > 0 and reps <= 12
    order by ex_id, e1rm desc, d asc
  ),
  top_json as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'exerciseId', ex_id,
      'exerciseName', ex_name,
      'category', ex_category,
      'bestE1rm', round(e1rm, 1),
      'achievedOn', d
    ) order by e1rm desc), '[]'::jsonb) as js
    from per_lift
  )
  select r.js, t.js into v_rollups, v_top
  from rollup_json r, top_json t;

  return jsonb_build_object('rollups', v_rollups, 'topLifts', v_top);
end;
$$;

comment on function public.get_analytics_rollups(text, text, int) is
  'Per-day training rollups and best estimated one-rep max per lift, for the Advanced analytics screen. Fortress and above; raises for free accounts.';

revoke all on function public.get_analytics_rollups(text, text, int) from public;
grant execute on function public.get_analytics_rollups(text, text, int) to authenticated;
