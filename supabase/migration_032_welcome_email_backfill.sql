-- Citadel Fitness — welcome email tracking + backfill lookup
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).
--
-- Adds a marker so a user is never sent more than one welcome email, and a
-- security-definer lookup (same pattern as get_email_newsletter_recipients
-- in migration_018) that the backfill-welcome-emails Edge Function uses to
-- find confirmed users who haven't been sent one yet. Covers both the
-- one-off backfill for existing users and any future safety-net re-run —
-- send-welcome-email now also sets this column on every successful send,
-- so the two paths can never double-send to the same person.

alter table public.profiles add column if not exists welcome_email_sent_at timestamptz;

create or replace function public.get_users_needing_welcome_email()
returns table (user_id uuid, email text, name text)
language sql
security definer
set search_path = public
as $$
  select p.id, u.email, coalesce(nullif(trim(p.name), ''), split_part(u.email, '@', 1))
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.email_confirmed_at is not null
    and p.welcome_email_sent_at is null
    and u.email is not null;
$$;

revoke all on function public.get_users_needing_welcome_email() from public, anon, authenticated;
grant execute on function public.get_users_needing_welcome_email() to service_role;
