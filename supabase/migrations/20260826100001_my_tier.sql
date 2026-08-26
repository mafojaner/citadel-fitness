-- The tier the app should show, from the same place the policies read.
--
-- Until now the client took its tier from profiles.membership_tier, which
-- was the only source there was. With subscriptions contributing to
-- tier_rank, that reading is now wrong in the one case that matters most:
-- someone who has just paid would be gated correctly by every policy and
-- still be told they were on the free plan by every screen.
--
-- Deriving it from tier_rank rather than re-implementing the comparison is
-- the point. Two expressions of "what does this account get" drift, and the
-- one people see would eventually disagree with the one that decides access
-- -- which reads as being charged for something the app says you do not have.
create or replace function public.my_tier()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case public.tier_rank(auth.uid())
    when 2 then 'valhalla'
    when 1 then 'fortress'
    else 'free'
  end;
$$;

comment on function public.my_tier() is
  'The calling account''s tier as a string, derived from tier_rank so the UI and the policies can never disagree.';

revoke all on function public.my_tier() from public;
grant execute on function public.my_tier() to authenticated;
