-- AI progressive overload — the Valhalla feature that needs no human.
--
-- "AI" is what the catalogue calls it and what it is sold as. What it
-- actually is, deliberately, is double progression with an RPE brake and a
-- stall deload: rules a person can read, disagree with, and predict. That is
-- a feature rather than a compromise. A model that says "squat 82.5 kg" and
-- cannot say why is not something anyone should load onto a bar, and a
-- suggestion that surprises you is one you stop trusting after the first bad
-- session. Every row this returns carries the sentence explaining it.
--
-- Computed here rather than in the app for the reason set out in
-- 20260820090000: the paid feature is a computation over rows the member
-- already owns, so there is no policy that withholds it without breaking
-- free logging. Moving the computation behind a definer function is the only
-- gate that actually holds, and it is the same shape as advanced analytics
-- and goal forecasting.
--
-- One implementation, in one language, on purpose. Two expressions of the
-- same rule drift -- which is exactly how the weekly digest ended up
-- entitling a different set of people than every other feature. The app
-- renders what this returns and computes nothing.

create or replace function public.get_overload_suggestions(p_weight_unit text default 'kg')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_unit text := case when lower(coalesce(p_weight_unit, 'kg')) = 'lb' then 'lb' else 'kg' end;
  -- The smallest jump most gyms can actually make: a pair of 1.25 kg or
  -- 2.5 lb plates. Suggesting 1.8 kg would be arithmetically defensible and
  -- impossible to load.
  v_step numeric := case when v_unit = 'lb' then 5 else 2.5 end;
  v_out jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if public.tier_rank(v_uid) < 2 then
    raise exception 'Progressive overload is a Valhalla feature';
  end if;

  with sets_in_unit as (
    select
      w.date,
      le.exercise_id,
      se.reps,
      se.rpe,
      -- Converted once, here, so every comparison below is in the unit the
      -- suggestion will be shown in. Rounding a kg answer into pounds at the
      -- end produces numbers like 47.3 that no one can load.
      case
        when se.weight_unit = v_unit then se.weight
        when v_unit = 'lb' then se.weight * 2.2046226218
        else se.weight / 2.2046226218
      end as weight
    from public.workouts w
    join public.logged_exercises le on le.workout_id = w.id
    join public.set_entries se on se.logged_exercise_id = le.id
    where w.user_id = v_uid
      and w.date >= current_date - 90
      and se.reps > 0
      and se.weight > 0
  ),
  -- One set per exercise per day: the heaviest, breaking ties on reps. The
  -- top set is what progression is actually decided on; warm-ups would drag
  -- every average down and make a good session look like a bad one.
  top_set as (
    select distinct on (exercise_id, date)
      exercise_id, date, weight, reps, rpe
    from sets_in_unit
    order by exercise_id, date, weight desc, reps desc
  ),
  ranked as (
    select *, row_number() over (partition by exercise_id order by date desc) as rn
    from top_set
  ),
  recent as (
    select * from ranked where rn <= 3
  ),
  agg as (
    select
      exercise_id,
      count(*) as sessions,
      max(date) filter (where rn = 1) as last_date,
      max(weight) filter (where rn = 1) as last_weight,
      max(reps) filter (where rn = 1) as last_reps,
      max(rpe) filter (where rn = 1) as last_rpe,
      max(weight) filter (where rn = 2) as prev_weight,
      max(reps) filter (where rn = 2) as prev_reps,
      min(reps) as rep_low_raw,
      max(reps) as rep_high
    from recent
    group by exercise_id
  ),
  shaped as (
    select
      a.*,
      -- The rep window this lifter has actually worked in. When all three
      -- sessions sat on the same number there is no window to read, so one
      -- is assumed rather than dividing by nothing.
      case when a.rep_low_raw = a.rep_high
           then greatest(1, a.rep_high - 2)
           else a.rep_low_raw end as rep_low,
      -- Same weight as last time and no extra reps for it. One flat session
      -- is noise; two is a stall, and adding load to a stall is how people
      -- get hurt.
      (a.prev_weight is not null
        and a.prev_weight = a.last_weight
        and a.last_reps <= a.prev_reps) as stalled
    from agg a
    where a.sessions >= 2
  ),
  decided as (
    select
      s.*,
      case
        when s.stalled then 'deload'
        when s.last_rpe is not null and s.last_rpe >= 9 then 'hold'
        when s.last_reps >= s.rep_high then 'add_weight'
        else 'add_rep'
      end as action
    from shaped s
  )
  select coalesce(jsonb_agg(row order by exercise_name), '[]'::jsonb)
  into v_out
  from (
    select
      jsonb_build_object(
        'exerciseId', d.exercise_id,
        'exerciseName', e.name,
        'unit', v_unit,
        'lastDate', d.last_date,
        'lastWeight', round(d.last_weight, 1),
        'lastReps', d.last_reps,
        'lastRpe', d.last_rpe,
        'sessions', d.sessions,
        'action', d.action,
        'suggestedWeight', round(
          case d.action
            -- Rounded to a loadable number, then floored at one step so a
            -- light lift cannot be deloaded to zero.
            when 'deload' then greatest(v_step, round(d.last_weight * 0.9 / v_step) * v_step)
            when 'add_weight' then d.last_weight + v_step
            else d.last_weight
          end, 1),
        'suggestedReps',
          case d.action
            when 'deload' then d.rep_high
            when 'add_weight' then d.rep_low
            when 'hold' then d.last_reps
            else d.last_reps + 1
          end,
        'rationale',
          case d.action
            when 'deload' then
              format('Two sessions at %s %s without an extra rep. Drop to %s %s and build back up.',
                round(d.last_weight, 1), v_unit,
                round(greatest(v_step, round(d.last_weight * 0.9 / v_step) * v_step), 1), v_unit)
            when 'hold' then
              format('Last top set was RPE %s, close to failure. Repeat %s %s before adding load.',
                d.last_rpe, round(d.last_weight, 1), v_unit)
            when 'add_weight' then
              format('You hit %s reps, your best of the last %s sessions. Add %s %s and start again at %s reps.',
                d.last_reps, d.sessions, v_step, v_unit, d.rep_low)
            else
              format('One more rep at %s %s, then the weight goes up.',
                round(d.last_weight, 1), v_unit)
          end,
        -- Said out loud rather than implied, because two sessions is thin
        -- evidence and the interface should not present it as though it
        -- were not.
        'confidence',
          case
            when d.sessions >= 3 and d.last_rpe is not null then 'high'
            when d.sessions >= 3 then 'medium'
            else 'low'
          end
      ) as row,
      e.name as exercise_name
    from decided d
    join public.exercises e on e.id = d.exercise_id
  ) rows;

  return v_out;
end;
$$;

comment on function public.get_overload_suggestions(text) is
  'Next-session weight and rep suggestions from the caller''s own logged history. Valhalla only; every row carries the sentence explaining it.';

revoke all on function public.get_overload_suggestions(text) from public, anon;
grant execute on function public.get_overload_suggestions(text) to authenticated;

-- The gate is the whole feature, so it is asserted rather than assumed.
do $$
begin
  if not has_function_privilege('authenticated', 'public.get_overload_suggestions(text)', 'execute') then
    raise exception 'get_overload_suggestions is not callable by authenticated -- the app cannot use it';
  end if;
  if has_function_privilege('anon', 'public.get_overload_suggestions(text)', 'execute') then
    raise exception 'get_overload_suggestions is callable by anon -- it must not be';
  end if;
end $$;
