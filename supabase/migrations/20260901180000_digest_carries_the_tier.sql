-- Make the weekly digest report the tier, not the free features.
--
-- It sent days trained, sets logged and total volume -- every one of which
-- the free Activity screen already shows. A paying member got an email that
-- proved nothing about what they pay for, and it is the only contact the app
-- makes between sessions.
--
-- The four figures added here are the same four the Home card shows, and
-- they come from the same function, so the email and the app cannot disagree
-- about what happened this week.

-- ---------------------------------------------------------------------
-- 1. The summary, addressable by user id.
--
-- get_fortress_today reads auth.uid(), which is right for a client call and
-- useless to a digest running as service_role over every member. Rather than
-- write the queries twice -- where they would drift, and the email would
-- start contradicting the app -- the body moves here and both callers use it.
--
-- Never granted to authenticated: it takes a user id, so exposing it would
-- let any signed-in member ask for anyone else's summary. The client reaches
-- it only through get_fortress_today, which supplies auth.uid() itself.
create or replace function public.fortress_summary_for(
  p_user uuid,
  p_weight_unit text default 'kg'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_today date := current_date;
  v_program jsonb := null;
  v_goal jsonb := null;
  v_new_prs int := 0;
  v_group jsonb := null;
begin
  if p_user is null then
    return null;
  end if;
  if p_weight_unit not in ('kg','lb') then
    raise exception 'Unknown unit';
  end if;

  select jsonb_build_object(
           'programName', p.name,
           'dayName', d.name,
           'position', d.position,
           'cycleLength', (select count(*) from public.program_days x where x.program_id = p.id)
         )
    into v_program
  from public.program_enrollments en
  join public.programs p on p.id = en.program_id
  join public.program_days d
    on d.program_id = p.id and d.position = en.next_position
  where en.user_id = p_user;

  select jsonb_build_object(
           'exerciseName', e.name,
           'target', round(g.target_weight, 1),
           'unit', g.target_unit,
           'targetDate', g.target_date,
           'daysLeft', (g.target_date - v_today),
           'current', round(coalesce(best.w, 0), 1)
         )
    into v_goal
  from public.lift_goals g
  join public.exercises e on e.id = g.exercise_id
  left join lateral (
    select max(
             case
               when se.weight is null then 0
               when se.weight_unit::text = g.target_unit then se.weight
               when se.weight_unit::text = 'kg' then se.weight * 2.2046226218
               else se.weight / 2.2046226218
             end
           ) as w
    from public.workouts w
    join public.logged_exercises le on le.workout_id = w.id
    join public.set_entries se on se.logged_exercise_id = le.id
    where w.user_id = p_user and le.exercise_id = g.exercise_id
  ) best on true
  where g.user_id = p_user
    and g.target_date >= v_today
  order by g.target_date
  limit 1;

  select count(*)
    into v_new_prs
  from (
    select le.exercise_id,
           max(w.date) filter (where se.weight = mx.top) as achieved_on
    from public.workouts w
    join public.logged_exercises le on le.workout_id = w.id
    join public.set_entries se on se.logged_exercise_id = le.id
    join lateral (
      select max(se2.weight) as top
      from public.workouts w2
      join public.logged_exercises le2 on le2.workout_id = w2.id
      join public.set_entries se2 on se2.logged_exercise_id = le2.id
      where w2.user_id = p_user and le2.exercise_id = le.exercise_id
    ) mx on true
    where w.user_id = p_user
      and mx.top is not null
      and mx.top > 0
    group by le.exercise_id
  ) per_exercise
  where achieved_on > v_today - 7
    and achieved_on <= v_today;

  select jsonb_build_object(
           'groupName', g.name,
           'rank', ranked.rank,
           'memberCount', ranked.total
         )
    into v_group
  from public.group_members me
  join public.groups g on g.id = me.group_id
  join lateral (
    select
      (select count(*) from public.group_members m2 where m2.group_id = g.id) as total,
      (
        select count(*) + 1
        from public.group_members other
        where other.group_id = g.id
          and other.user_id <> p_user
          and (
            select count(distinct w.date) from public.workouts w
            where w.user_id = other.user_id and w.date > v_today - 7
          ) > (
            select count(distinct w.date) from public.workouts w
            where w.user_id = p_user and w.date > v_today - 7
          )
      ) as rank
  ) ranked on true
  where me.user_id = p_user
  order by g.created_at
  limit 1;

  return jsonb_build_object(
    'program', v_program,
    'goal', v_goal,
    'newRecords', v_new_prs,
    'group', v_group
  );
end;
$$;

revoke all on function public.fortress_summary_for(uuid, text) from public;
revoke all on function public.fortress_summary_for(uuid, text) from anon;
revoke all on function public.fortress_summary_for(uuid, text) from authenticated;

-- ---------------------------------------------------------------------
-- 2. The client call becomes a wrapper. Same gate, same shape, one body.
create or replace function public.get_fortress_today(
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
  -- Rank-compared, never equality: a Valhalla member must not be refused a
  -- Fortress summary.
  if public.tier_rank(v_uid) < 1 then
    raise exception 'Fortress feature';
  end if;
  return public.fortress_summary_for(v_uid, p_weight_unit);
end;
$$;

revoke all on function public.get_fortress_today(text) from public;
revoke all on function public.get_fortress_today(text) from anon;
grant execute on function public.get_fortress_today(text) to authenticated;

-- ---------------------------------------------------------------------
-- 3. The digest carries it.
--
-- One extra jsonb column rather than eleven scalar ones: the shape already
-- exists and the sending function already knows how to read it.
--
-- The tier filter is unchanged and still rank-compared, so this adds nothing
-- to a free account's email -- they do not get one.
-- Dropped and recreated rather than replaced: create or replace cannot add
-- a column to a function that returns table. The grant below is reapplied
-- for the same reason -- a drop takes its privileges with it, and a digest
-- that silently loses execute permission looks exactly like one that was
-- never scheduled.
drop function if exists public.get_weekly_digest_recipients();

create function public.get_weekly_digest_recipients()
returns table (
  user_id uuid,
  email text,
  name text,
  weight_unit text,
  days_logged int,
  total_sets int,
  total_volume_kg numeric,
  top_category text,
  fortress jsonb
)
language sql
security definer
set search_path = public
as $$
  with members as (
    select
      p.id,
      u.email,
      nullif(p.name, '') as name,
      coalesce(p.preferences->>'units', 'lb') as weight_unit
    from public.profiles p
    join auth.users u on u.id = p.id
    where public.tier_rank(p.id) >= 1
      and coalesce((p.preferences->>'weeklyDigest')::boolean, false) = true
      and u.email is not null
  ),
  week as (
    select
      w.user_id,
      w.date,
      ex.category,
      se.reps,
      -- Normalised to kg so a mixed-unit week sums correctly; the caller
      -- converts once for display. Summing raw stored numbers would add
      -- pounds to kilos, the same trap migration 009 created elsewhere.
      se.reps * case
        when se.weight_unit = 'lb' then se.weight / 2.2046226218
        else se.weight
      end as volume_kg
    from public.workouts w
    join public.logged_exercises le on le.workout_id = w.id
    join public.exercises ex on ex.id = le.exercise_id
    join public.set_entries se on se.logged_exercise_id = le.id
    where w.date > (current_date - interval '7 days')
      and w.date <= current_date
  )
  select
    m.id,
    m.email,
    m.name,
    m.weight_unit,
    coalesce((select count(distinct wk.date) from week wk where wk.user_id = m.id), 0)::int,
    coalesce((select count(*) from week wk where wk.user_id = m.id), 0)::int,
    coalesce((select sum(wk.volume_kg) from week wk where wk.user_id = m.id), 0),
    (
      select wk.category
      from week wk
      where wk.user_id = m.id
      group by wk.category
      order by count(*) desc, wk.category
      limit 1
    ),
    public.fortress_summary_for(m.id, m.weight_unit)
  from members m;
$$;

revoke all on function public.get_weekly_digest_recipients() from public, anon, authenticated;
grant execute on function public.get_weekly_digest_recipients() to service_role;
