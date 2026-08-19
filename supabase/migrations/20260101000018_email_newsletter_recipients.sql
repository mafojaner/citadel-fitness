-- Citadel Fitness — recipient lookup for the new-article email
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).
--
-- Why: emails live in auth.users, but the opt-in preference lives in
-- public.profiles.preferences. Ordinary RLS-scoped client access can't join
-- across schemas like this (nor should it — this is only ever meant to be
-- called by the send-newsletter-email Edge Function with the service role
-- key), so it's a security-definer function restricted to service_role.

create or replace function public.get_email_newsletter_recipients()
returns table (user_id uuid, email text)
language sql
security definer
set search_path = public
as $$
  select p.id, u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where coalesce((p.preferences->>'emailNewsletter')::boolean, false) = true
    and u.email is not null;
$$;

revoke all on function public.get_email_newsletter_recipients() from public, anon, authenticated;
grant execute on function public.get_email_newsletter_recipients() to service_role;
