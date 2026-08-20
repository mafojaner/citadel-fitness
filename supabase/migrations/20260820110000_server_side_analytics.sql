-- The other two halves of the analytics gap: muscle balance / lift
-- progressions, and goal projections. Same reasoning as
-- 20260820100000_server_side_records — the derivation moves behind
-- tier_rank() so a free caller is refused by Postgres rather than by an if
-- statement it could patch out.
--
-- Both return jsonb rather than a table. The shapes are nested (a
-- progression owns a list of points; the analytics object owns two lists),
-- and jsonb maps onto the existing TypeScript interfaces without inventing
-- a flattened wire format that the client would only have to reassemble.

-- ---------------------------------------------------------------------------
-- Advanced analytics
-- ---------------------------------------------------------------------------

create or replace function public.get_advanced_analytics(
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
  v_balance jsonb;
  v_progressions jsonb;
  v_total numeric;
  v_total_sets bigint;
  v_active_days bigint;
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

  -- null period means everything ever logged, matching fetchAdvancedAnalytics.
  v_since := case when p_period_days is null then null
                  else current_date - p_period_days end;

  -- One statement rather than a scratch table: this function is `stable`, and
  -- Postgres forbids CREATE TABLE AS in anything non-volatile. Marking it
  -- volatile to get a temp table would be the wrong trade — it would stop the
  -- planner caching the call within a query, to materialise something read
  -- three times in the same statement.
  with sets as (
  select
    w.date as d,
    le.exercise_id as ex_id,
    e.name as ex_name,
    e.category::text as ex_category,
    e.type::text as ex_type,
    case
      when se.weight is null then 0
      when se.weight_unit::text = p_weight_unit then se.weight
      when se.weight_unit::text = 'kg' then se.weight * 2.2046226218
      else se.weight / 2.2046226218
    end as weight,
    coalesce(se.reps, 0) as reps,
    coalesce(se.duration_seconds, 0) as duration_seconds
  from public.workouts w
  join public.logged_exercises le on le.workout_id = w.id
  join public.exercises e on e.id = le.exercise_id
  join public.set_entries se on se.logged_exercise_id = le.id
  where w.user_id = v_uid
    and (v_since is null or w.date >= v_since)
  ),
  -- Strength contributes reps x weight, cardio contributes minutes. They are
  -- summed in different units on purpose, which is why this reports a share
  -- rather than a headline total: the useful read is "am I neglecting legs",
  -- not "how many kilo-minutes". Dropping cardio instead would erase every
  -- run from the picture, since reps x weight is zero for all of them.
  per_cat as (
    select ex_category,
           sum(case when ex_type = 'cardio' then duration_seconds / 60.0 else weight * reps end) as value,
           count(*) as sets
    from sets group by ex_category
  ),
  tot as (select coalesce(sum(value), 0) as total from per_cat),
  balance as (
    select
      coalesce(jsonb_agg(jsonb_build_object(
        'category', ex_category,
        'value', round(value, 1),
        -- Guarded: a period of only zero-value sets would divide by zero and
        -- report NaN to the UI.
        'share', case when (select total from tot) > 0 then value / (select total from tot) else 0 end,
        'sets', sets
      ) order by value desc), '[]'::jsonb) as js,
      -- Sum of the ROUNDED values, because the client sums rounded balance
      -- values too. Summing first and rounding after would disagree with the
      -- rows shown beside it.
      coalesce(sum(round(value, 1)), 0) as total_value
    from per_cat
  ),
  totals as (select count(*) as total_sets, count(distinct d) as active_days from sets),
  -- Best estimate per day rather than per set, so a back-off set after a
  -- heavy single doesn't read as a decline inside one session. Epley keeps
  -- the same 12-rep cap as estimateOneRepMax and get_personal_records.
  best_per_day as (
    select ex_id, min(ex_name) as ex_name, d,
           max(case when weight > 0 and reps > 0 and reps <= 12
                    then weight * (1 + reps::numeric / 30) else 0 end) as e1rm
    from sets where ex_type <> 'cardio'
    group by ex_id, d
  ),
  qualified as (
    select * from best_per_day where e1rm > 0
  ),
  agg as (
    select ex_id, min(ex_name) as ex_name,
           jsonb_agg(jsonb_build_object('date', d, 'estimatedOneRepMax', round(e1rm, 1)) order by d) as points,
           -- first/latest read off the ROUNDED points, as the client does,
           -- so the percentage always agrees with the two numbers shown.
           round((array_agg(e1rm order by d))[1], 1) as first_v,
           round((array_agg(e1rm order by d desc))[1], 1) as latest_v,
           count(*) as day_count
    from qualified group by ex_id
  ),
  progressions as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'exerciseId', ex_id,
      'exerciseName', ex_name,
      'points', points,
      'first', first_v,
      'latest', latest_v,
      'changePct', case when first_v > 0 then round((latest_v - first_v) / first_v * 100) else 0 end
    ) order by case when first_v > 0 then round((latest_v - first_v) / first_v * 100) else 0 end desc), '[]'::jsonb) as js
    -- A lift needs two separate days before a trend means anything.
    from agg where day_count >= 2
  )
  select b.js, b.total_value, p.js, t.total_sets, t.active_days
  into v_balance, v_total, v_progressions, v_total_sets, v_active_days
  from balance b, progressions p, totals t;

  return jsonb_build_object(
    'balance', v_balance,
    'progressions', v_progressions,
    'totalValue', v_total,
    'totalSets', v_total_sets,
    'activeDays', v_active_days
  );
end;
$$;

comment on function public.get_advanced_analytics(text, text, int) is
  'Muscle balance and lift progressions for the calling member. Fortress and above; raises for free accounts.';

revoke all on function public.get_advanced_analytics(text, text, int) from public;
grant execute on function public.get_advanced_analytics(text, text, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Goal projections
-- ---------------------------------------------------------------------------

create or replace function public.get_goal_projections()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_out jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if public.tier_rank(v_uid) < 1 then
    raise exception 'Goal forecasting is a Fortress feature';
  end if;

  -- Everything is computed in the GOAL's stored unit, never the display
  -- preference, so switching lb/kg re-labels the numbers without moving the
  -- goalposts. projectGoals() does this by converting history into the goal's
  -- unit; here the conversion goes straight from the set's own weight_unit.
  with goal_sets as (
    select g.id as goal_id, g.exercise_id, g.target_weight, g.target_unit, g.target_date,
           e.name as exercise_name, w.date as d,
           case
             when se.weight is null then 0
             when se.weight_unit::text = g.target_unit then se.weight
             when se.weight_unit::text = 'kg' then se.weight * 2.2046226218
             else se.weight / 2.2046226218
           end as weight,
           coalesce(se.reps, 0) as reps
    from public.lift_goals g
    join public.exercises e on e.id = g.exercise_id
    left join public.logged_exercises le on le.exercise_id = g.exercise_id
    left join public.workouts w on w.id = le.workout_id and w.user_id = v_uid
    left join public.set_entries se on se.logged_exercise_id = le.id
    where g.user_id = v_uid
  ), best_per_day as (
    select goal_id, exercise_id, target_weight, target_unit, target_date, exercise_name, d,
           max(case when weight > 0 and reps > 0 and reps <= 12
                    then weight * (1 + reps::numeric / 30) else 0 end) as e1rm
    from goal_sets where d is not null
    group by goal_id, exercise_id, target_weight, target_unit, target_date, exercise_name, d
    having max(case when weight > 0 and reps > 0 and reps <= 12
                    then weight * (1 + reps::numeric / 30) else 0 end) > 0
  ), first_dates as (
    select goal_id, min(d) as first_date from best_per_day group by goal_id
  ), with_day as (
    -- The day offset gets its own step because an aggregate cannot contain a
    -- window function, and regr_* below is an aggregate over exactly this.
    -- fitTrend measures days from the first session rather than from an epoch
    -- for the same reason: the intercept then means "estimate on day one",
    -- which is a number a person can check against their own log.
    select b.*, f.first_date, (b.d - f.first_date) as day_offset
    from best_per_day b join first_dates f on f.goal_id = b.goal_id
  ), fitted as (
    select b.goal_id, min(b.exercise_name) as exercise_name,
           min(b.target_weight) as target_weight, min(b.target_unit) as target_unit,
           min(b.target_date) as target_date,
           min(b.first_date) as first_date,
           round(max(b.e1rm), 1) as current_v,
           count(*) as sessions,
           -- regr_slope/regr_intercept ARE the least-squares fit fitTrend
           -- computes by hand, and return null on the same degenerate cases:
           -- fewer than two points, or every point on one day (zero variance
           -- in x, which would divide by zero).
           regr_slope(b.e1rm, b.day_offset) as slope,
           regr_intercept(b.e1rm, b.day_offset) as intercept
    from with_day b
    group by b.goal_id
  ), projected as (
    select f.*,
      round(f.target_weight, 1) as target_v,
      (f.target_date - current_date) as days_remaining,
      case when f.slope is not null
        then round((f.intercept + f.slope * (f.target_date - f.first_date))::numeric, 1)
      end as projected_v,
      case when f.slope is not null then round((f.slope * 7)::numeric, 1) else 0 end as weekly_rate
    from fitted f
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'goalId', goal_id,
    'exerciseName', exercise_name,
    'target', target_v,
    'current', current_v,
    'sessions', sessions,
    'daysRemaining', days_remaining,
    'status', case
       when current_v >= target_v then 'achieved'
       when slope is null then 'no-trend'
       when slope <= 0 then 'declining'
       when projected_v >= target_v then 'on-track'
       else 'behind' end,
    'projected', case when current_v >= target_v or slope is null then null else projected_v end,
    'weeklyRate', case when current_v >= target_v or slope is null then 0 else weekly_rate end,
    -- The day the line crosses the target, back as a date. Only meaningful
    -- while the line is actually rising.
    'projectedDate', case
       when current_v < target_v and slope is not null and slope > 0
       then (first_date + ceil((target_v - intercept) / slope)::int)::text
       end
  ) order by target_date), '[]'::jsonb)
  into v_out
  from projected;

  return v_out;
end;
$$;

comment on function public.get_goal_projections() is
  'Goal projections for the calling member, computed in each goal''s stored unit. Fortress and above; raises for free accounts.';

revoke all on function public.get_goal_projections() from public;
grant execute on function public.get_goal_projections() to authenticated;
