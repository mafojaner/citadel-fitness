-- Citadel Fitness — activity leaderboard
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query).
--
-- Backs the ranking card/screen on the merged Activity page. Ranks users by
-- distinct days logged in the last 7, same-day-logged only (matches the
-- existing rewards-eligibility rule — see migration_024) so nobody can climb
-- the board by backdating entries through the Workouts calendar.
--
-- SECURITY DEFINER is required: workouts' own RLS policy scopes every
-- client-side read to auth.uid(), so a leaderboard (inherently cross-user)
-- can't be computed from the client at all. Same pattern as
-- get_email_newsletter_recipients() in migration_018 — the function reads
-- across users internally, but only ever returns the minimal, non-sensitive
-- fields a leaderboard actually needs (no email, no id beyond what's needed
-- to detect "is this me").

create or replace function public.get_activity_leaderboard()
returns table(
  user_id uuid,
  display_name text,
  avatar_url text,
  days_logged int
)
language sql
security definer
set search_path to 'public'
as $$
  select
    p.id as user_id,
    coalesce(nullif(trim(p.name), ''), 'Member') as display_name,
    p.avatar_url,
    count(distinct w.date)::int as days_logged
  from public.profiles p
  join public.workouts w
    on w.user_id = p.id
    and w.logged_same_day = true
    and w.date >= (current_date - interval '6 days')
    and w.date <= current_date
  group by p.id, p.name, p.avatar_url
  having count(distinct w.date) > 0
  order by days_logged desc, p.id
  limit 50;
$$;

-- Any signed-in user can call this — it's a leaderboard, meant to be seen.
-- The function body itself already limits the columns returned.
grant execute on function public.get_activity_leaderboard() to authenticated;
