-- Recipients and their week, for the Fortress weekly digest.
--
-- Same shape and reasoning as get_email_newsletter_recipients: emails live
-- in auth.users while the opt-in lives in profiles.preferences, and no
-- RLS-scoped client should be able to join across that. Security definer,
-- revoked from everyone, granted only to service_role.
--
-- Stats are computed here rather than by the Edge Function querying per
-- user: one round trip for the whole send instead of N, and the volume
-- maths stays next to the data it reads.

create or replace function public.get_weekly_digest_recipients()
returns table (
  user_id uuid,
  email text,
  name text,
  weight_unit text,
  days_logged int,
  total_sets int,
  total_volume_kg numeric,
  top_category text
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
    where p.fortress_since is not null
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
    )
  from members m;
$$;

revoke all on function public.get_weekly_digest_recipients() from public, anon, authenticated;
grant execute on function public.get_weekly_digest_recipients() to service_role;
