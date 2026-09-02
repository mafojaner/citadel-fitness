-- Totals for a window, and for the window immediately before it.
--
-- "42 sets in 30 days" means nothing on its own. Against the prior 30 days
-- it becomes a direction, which is the entire promise of an analytics tier
-- and the one thing the screen could not say.
--
-- A separate function rather than a parameter on get_advanced_analytics.
-- That one is working, tested and returns a large object; teaching it to
-- offset its window would mean changing a function three screens depend on
-- to add something only one of them needs.
create or replace function public.get_period_comparison(
  p_days int,
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
  v_current jsonb;
  v_previous jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if public.tier_rank(v_uid) < 1 then
    raise exception 'Advanced analytics are a Fortress feature';
  end if;
  if p_weight_unit not in ('kg','lb') then
    raise exception 'Unknown unit';
  end if;
  -- A window has to be a real length. Zero would make both halves the same
  -- empty range and report a confident 0% change.
  if p_days is null or p_days < 1 then
    raise exception 'A comparison needs a window of at least one day';
  end if;

  with bounds as (
    select
      v_today - (p_days - 1) as cur_from,
      v_today as cur_to,
      -- The previous window ends the day before this one begins, so the two
      -- are adjacent and never overlap. An off-by-one here would count one
      -- day twice and quietly flatter every comparison.
      v_today - (2 * p_days - 1) as prev_from,
      v_today - p_days as prev_to
  ),
  sets as (
    select
      w.date as d,
      se.reps * case
        when se.weight_unit::text = 'lb' then se.weight / 2.2046226218
        else se.weight
      end as volume_kg
    from public.workouts w
    join public.logged_exercises le on le.workout_id = w.id
    join public.set_entries se on se.logged_exercise_id = le.id
    where w.user_id = v_uid
      and w.date >= (select prev_from from bounds)
      and w.date <= (select cur_to from bounds)
  )
  select
    jsonb_build_object(
      'sets', (select count(*) from sets, bounds where sets.d between bounds.cur_from and bounds.cur_to),
      'activeDays', (select count(distinct sets.d) from sets, bounds where sets.d between bounds.cur_from and bounds.cur_to),
      'volume', (
        select round(coalesce(sum(sets.volume_kg), 0) *
          case when p_weight_unit = 'lb' then 2.2046226218 else 1 end)
        from sets, bounds where sets.d between bounds.cur_from and bounds.cur_to
      )
    ),
    jsonb_build_object(
      'sets', (select count(*) from sets, bounds where sets.d between bounds.prev_from and bounds.prev_to),
      'activeDays', (select count(distinct sets.d) from sets, bounds where sets.d between bounds.prev_from and bounds.prev_to),
      'volume', (
        select round(coalesce(sum(sets.volume_kg), 0) *
          case when p_weight_unit = 'lb' then 2.2046226218 else 1 end)
        from sets, bounds where sets.d between bounds.prev_from and bounds.prev_to
      )
    )
    into v_current, v_previous;

  return jsonb_build_object('current', v_current, 'previous', v_previous);
end;
$$;

revoke all on function public.get_period_comparison(int, text) from public;
revoke all on function public.get_period_comparison(int, text) from anon;
grant execute on function public.get_period_comparison(int, text) to authenticated;
