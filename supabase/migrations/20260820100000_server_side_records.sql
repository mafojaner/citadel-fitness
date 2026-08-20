-- Close the analytics gap: compute the paid product on the server.
--
-- 20260820090000 gated everything that IS server-side state. It could not
-- gate the analytics features, because those are computations over workouts
-- and set_entries — rows a free account must read in order to log at all.
-- Hiding the source would break free logging; leaving it meant a patched
-- client could unlock the whole Fortress analytics suite.
--
-- The fix is to stop shipping the computation. The client sent raw history
-- through computePersonalRecords() locally, so every line of the feature was
-- already in the bundle. Moving the derivation here means a free caller gets
-- an exception instead of records, and unlocking it requires reimplementing
-- the analytics rather than flipping a boolean.
--
-- What this deliberately does NOT claim: a member's own workouts stay
-- readable by them, as they must. Someone determined can always recompute
-- their own numbers. The line drawn here is the one that can be drawn — the
-- product is server-side and gated, not merely hidden behind an if.

create or replace function public.get_personal_records(
  p_weight_unit text default 'kg',
  p_distance_unit text default 'km'
)
returns table (
  exercise_id uuid,
  exercise_name text,
  category text,
  type text,
  heaviest_weight numeric,
  heaviest_weight_reps int,
  heaviest_weight_date date,
  estimated_one_rep_max numeric,
  estimated_one_rep_max_date date,
  longest_duration_seconds int,
  longest_duration_date date,
  farthest_distance numeric,
  farthest_distance_date date,
  best_session_value numeric,
  best_session_date date,
  total_sets bigint,
  last_performed date
)
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

  -- The gate. Everything below reads the caller's own rows, so this is the
  -- only thing standing between a free account and the paid feature.
  if public.tier_rank(v_uid) < 1 then
    raise exception 'Personal records are a Fortress feature';
  end if;

  if p_weight_unit not in ('kg','lb') or p_distance_unit not in ('km','mi') then
    raise exception 'Unknown unit';
  end if;

  return query
  with converted as (
    -- Converted per set, not per exercise: weight_unit is stored on the set
    -- because a person can log in kg one day and lb the next, and comparing
    -- them unconverted is how a record ends up 2.2x wrong.
    -- Constants match LB_PER_KG / MI_PER_KM in src/lib/units.ts exactly; if
    -- one moves the other has to move with it.
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
      coalesce(se.duration_seconds, 0) as duration_seconds,
      case
        when se.distance is null then 0
        when se.distance_unit::text = p_distance_unit then se.distance
        when se.distance_unit::text = 'km' then se.distance * 0.62137119
        else se.distance / 0.62137119
      end as distance
    from public.workouts w
    join public.logged_exercises le on le.workout_id = w.id
    join public.exercises e on e.id = le.exercise_id
    join public.set_entries se on se.logged_exercise_id = le.id
    where w.user_id = v_uid
  ),
  -- Epley, capped at 12 reps exactly as estimateOneRepMax does: past that the
  -- estimate implies a 20-rep set predicts a max two thirds above the weight
  -- lifted, which is not true for most people. Such sets still count toward
  -- heaviest weight and volume, just not toward the max.
  scored as (
    select c.*,
      case when c.weight > 0 and c.reps > 0 and c.reps <= 12
        then c.weight * (1 + c.reps::numeric / 30) else 0 end as e1rm
    from converted c
  ),
  sessions as (
    select ex_id, d,
      sum(case when ex_type = 'cardio' then duration_seconds / 60.0 else weight * reps end) as session_value
    from scored group by ex_id, d
  ),
  best_session as (
    -- distinct on + order by picks one row per exercise; the date tiebreak
    -- makes it the earliest session to reach the best value, matching the
    -- client's "a record belongs to the session that first achieved it".
    select distinct on (ex_id) ex_id, d, session_value
    from sessions order by ex_id, session_value desc, d asc
  ),
  heaviest as (
    select distinct on (ex_id) ex_id, d, weight, reps
    from scored where weight > 0 order by ex_id, weight desc, d asc
  ),
  best_e1rm as (
    select distinct on (ex_id) ex_id, d, e1rm
    from scored where e1rm > 0 order by ex_id, e1rm desc, d asc
  ),
  longest as (
    select distinct on (ex_id) ex_id, d, duration_seconds
    from scored where duration_seconds > 0 order by ex_id, duration_seconds desc, d asc
  ),
  farthest as (
    select distinct on (ex_id) ex_id, d, distance
    from scored where distance > 0 order by ex_id, distance desc, d asc
  ),
  totals as (
    select ex_id, min(ex_name) as ex_name, min(ex_category) as ex_category,
           min(ex_type) as ex_type, count(*) as total_sets, max(d) as last_performed
    from scored group by ex_id
  )
  select
    t.ex_id, t.ex_name, t.ex_category, t.ex_type,
    coalesce(h.weight, 0), coalesce(h.reps, 0)::int, h.d,
    coalesce(o.e1rm, 0), o.d,
    coalesce(l.duration_seconds, 0)::int, l.d,
    coalesce(f.distance, 0), f.d,
    coalesce(b.session_value, 0), b.d,
    t.total_sets, t.last_performed
  from totals t
  left join heaviest h on h.ex_id = t.ex_id
  left join best_e1rm o on o.ex_id = t.ex_id
  left join longest l on l.ex_id = t.ex_id
  left join farthest f on f.ex_id = t.ex_id
  left join best_session b on b.ex_id = t.ex_id
  order by t.last_performed desc, t.ex_name asc;
end;
$$;

comment on function public.get_personal_records(text, text) is
  'Personal records for the calling member, computed server-side. Fortress and above; raises for free accounts.';

revoke all on function public.get_personal_records(text, text) from public;
grant execute on function public.get_personal_records(text, text) to authenticated;
