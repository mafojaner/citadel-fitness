-- What the member's Fortress tier has to say today, in one round trip.
--
-- The Home screen is the one that opens on launch, and not one of the ten
-- built Fortress features appeared on it -- the only paid card there was a
-- Valhalla teaser for nutrition coaching, which is not built. Someone paying
-- for Fortress could open the app every day for a week and see nothing they
-- bought.
--
-- Composed server-side rather than by calling the four existing hooks from
-- Home. Those would be four round trips and, between them, the member's
-- entire set history pulled down to compute a headline -- on the screen that
-- has to be fastest. This returns four small numbers.
--
-- Everything here is derivable from what the other Fortress screens already
-- show. Nothing new is stored.
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
  v_today date := current_date;
  v_program jsonb := null;
  v_goal jsonb := null;
  v_new_prs int := 0;
  v_group jsonb := null;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  -- Rank-compared, never equality: a Valhalla member must not be refused a
  -- Fortress summary.
  if public.tier_rank(v_uid) < 1 then
    raise exception 'Fortress feature';
  end if;
  if p_weight_unit not in ('kg','lb') then
    raise exception 'Unknown unit';
  end if;

  -- ---------------------------------------------------------------
  -- The next program session. Null when not enrolled, which is the
  -- common case and must not read as an error.
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
  where en.user_id = v_uid;

  -- ---------------------------------------------------------------
  -- The goal running out of road soonest.
  --
  -- Ordered by target date rather than by how close the weight is: the one
  -- worth surfacing on a home screen is the one with a deadline coming, not
  -- the one nearest completion. Past-date goals are excluded -- they are not
  -- news, and the goal screen already shows them as overdue.
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
    where w.user_id = v_uid and le.exercise_id = g.exercise_id
  ) best on true
  where g.user_id = v_uid
    and g.target_date >= v_today
  order by g.target_date
  limit 1;

  -- ---------------------------------------------------------------
  -- Personal records set in the last seven days.
  --
  -- A record counts when the heaviest set ever logged for that exercise
  -- happened inside the window -- the same rule isRecentRecord applies on
  -- the records screen, so the two cannot disagree about what is new.
  select count(*)
    into v_new_prs
  from (
    select le.exercise_id,
           max(w.date) filter (
             where se.weight = mx.top
           ) as achieved_on
    from public.workouts w
    join public.logged_exercises le on le.workout_id = w.id
    join public.set_entries se on se.logged_exercise_id = le.id
    join lateral (
      select max(se2.weight) as top
      from public.workouts w2
      join public.logged_exercises le2 on le2.workout_id = w2.id
      join public.set_entries se2 on se2.logged_exercise_id = le2.id
      where w2.user_id = v_uid and le2.exercise_id = le.exercise_id
    ) mx on true
    where w.user_id = v_uid
      and mx.top is not null
      and mx.top > 0
    group by le.exercise_id
  ) per_exercise
  where achieved_on > v_today - 7
    and achieved_on <= v_today;

  -- ---------------------------------------------------------------
  -- Standing in the first group, over the same seven days.
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
          and other.user_id <> v_uid
          and (
            select count(distinct w.date) from public.workouts w
            where w.user_id = other.user_id and w.date > v_today - 7
          ) > (
            select count(distinct w.date) from public.workouts w
            where w.user_id = v_uid and w.date > v_today - 7
          )
      ) as rank
  ) ranked on true
  where me.user_id = v_uid
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

revoke all on function public.get_fortress_today(text) from public;
revoke all on function public.get_fortress_today(text) from anon;
grant execute on function public.get_fortress_today(text) to authenticated;

-- ---------------------------------------------------------------------
-- The self test lives in a separate, rolled-back probe rather than here.
--
-- Verifying the tier gate means impersonating a role, and `set local role`
-- left this connection unable to write supabase_migrations at the end of
-- the transaction -- so the migration ran, passed its own test, and then
-- failed to record, rolling the whole thing back. A committing migration
-- and a role-switching test do not belong in the same transaction.
