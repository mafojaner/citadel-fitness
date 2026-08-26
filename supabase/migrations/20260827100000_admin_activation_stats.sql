-- Aggregates the developer dashboard needs that cannot be counted in the client.
--
-- The dashboard's Edge Function already reads with the service role, so it
-- could select these rows and count them in TypeScript. It should not. A
-- PostgREST select caps at 1000 rows by default, so "how many people have
-- ever logged a workout" would quietly stop being true somewhere around the
-- thousandth workout and report a number that only ever looks plausible --
-- the same trap the listUsers() pagination comment in that function already
-- warns about, and a wrong number on a dashboard is worse than a missing one
-- because nobody goes back to check it.
--
-- Counting in the database also means the answer is a distinct count rather
-- than a deduplicated page of rows.

-- security definer so it can see every user's rows regardless of RLS, and
-- granted to service_role only: the Edge Function has already checked the
-- caller against ADMIN_EMAIL before it gets here. `authenticated` is
-- deliberately not granted, so no signed-in account can call this from the
-- app with the shipped anon key.
create or replace function public.admin_activation_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with logged as (
    select distinct user_id from public.workouts
  ),
  recent as (
    select distinct w.user_id, max(le.created_at) as last_seen
    from public.logged_exercises le
    join public.workouts w on w.id = le.workout_id
    group by w.user_id
  )
  select jsonb_build_object(
    'everLogged', (select count(*) from logged),
    'activeLast7d', (select count(*) from recent where last_seen >= now() - interval '7 days'),
    'activeLast30d', (select count(*) from recent where last_seen >= now() - interval '30 days'),
    -- Workouts per active person, over the window. The blunt "how much does
    -- someone who uses this actually use it" number, and the one a signup
    -- count cannot answer.
    'workoutsLast30d', (
      select count(*) from public.workouts where created_at >= now() - interval '30 days'
    ),
    'setsLast30d', (
      select count(*)
      from public.set_entries se
      join public.logged_exercises le on le.id = se.logged_exercise_id
      where le.created_at >= now() - interval '30 days'
    )
  );
$$;

comment on function public.admin_activation_stats() is
  'Aggregate activation counts for the developer dashboard. service_role only; the Edge Function gates on ADMIN_EMAIL before calling it.';

-- `anon` and `authenticated` are revoked by name, not just via PUBLIC.
-- Supabase's default privileges grant execute on new functions to both roles
-- directly, and a direct grant survives `revoke ... from public` untouched --
-- so the PUBLIC revoke alone leaves the function callable with the anon key
-- that ships inside the app. The assertion below caught exactly that.
revoke all on function public.admin_activation_stats() from public;
revoke all on function public.admin_activation_stats() from anon;
revoke all on function public.admin_activation_stats() from authenticated;
grant execute on function public.admin_activation_stats() to service_role;

-- Prove the grant is actually restrictive, rather than assuming it. A wrong
-- answer here means the anon key in the shipped app can read cross-user
-- aggregates.
do $$
begin
  if has_function_privilege('authenticated', 'public.admin_activation_stats()', 'execute') then
    raise exception 'admin_activation_stats is executable by authenticated -- it must not be';
  end if;
  if has_function_privilege('anon', 'public.admin_activation_stats()', 'execute') then
    raise exception 'admin_activation_stats is executable by anon -- it must not be';
  end if;
  if not has_function_privilege('service_role', 'public.admin_activation_stats()', 'execute') then
    raise exception 'admin_activation_stats is not executable by service_role -- the dashboard cannot read it';
  end if;
end $$;
