-- Citadel Fitness — wire the two transactional-email database webhooks
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query),
-- or via `npx supabase db query --linked -f supabase/migration_028_wire_email_webhooks.sql`.
--
-- Both Edge Functions (send-welcome-email, send-newsletter-email) and their
-- WEBHOOK_SECRET/RESEND_API_KEY/EMAIL_FROM secrets are already deployed —
-- this migration is the missing last step: it enables pg_net (Supabase's
-- async HTTP-from-Postgres extension) and wires two triggers that call
-- those functions directly. This achieves exactly what a Dashboard-created
-- "Database Webhook" does, without needing the dashboard UI.
--
-- STATUS: already applied to the live project on 2026-08-08, and verified
-- end to end (pg_net -> Edge Function returned HTTP 200). This file is kept
-- as the record of the change and for re-applying to a fresh project (e.g.
-- the staging project).
--
-- SECRET HANDLING — `__WEBHOOK_SECRET__` below is a placeholder, deliberately
-- NOT the real value: this file is committed to git, and a live secret in
-- version history is a leak that outlives any later fix. To apply this
-- migration, substitute the placeholder with the same value you set as the
-- WEBHOOK_SECRET function secret, and do not commit the substituted copy:
--   npx supabase secrets set WEBHOOK_SECRET=<value> --project-ref <ref>
-- Both Edge Functions read WEBHOOK_SECRET and reject any request whose
-- x-webhook-secret header doesn't match, so the two must agree exactly.
-- (Verified: a wrong or missing header returns 401 on both functions.)

create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------
-- 1. Welcome email — fires once, the moment a new account's email is
--    confirmed for the first time. The WHEN clause means this only queues
--    a request on that specific transition, not on every auth.users
--    update (e.g. last_sign_in_at changes on every login) — a pure
--    efficiency win, since the Edge Function's own `justConfirmed` check
--    already only acts on this exact case.
-- ---------------------------------------------------------------------
create or replace function public.notify_welcome_email()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform net.http_post(
    url := 'https://ulyduorkvikeyxtpshoq.supabase.co/functions/v1/send-welcome-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', '__WEBHOOK_SECRET__'
    ),
    body := jsonb_build_object(
      'type', 'UPDATE',
      'table', 'users',
      'schema', 'auth',
      'record', jsonb_build_object(
        'id', new.id,
        'email', new.email,
        'email_confirmed_at', new.email_confirmed_at,
        'raw_user_meta_data', new.raw_user_meta_data
      ),
      'old_record', jsonb_build_object('email_confirmed_at', old.email_confirmed_at)
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.notify_welcome_email();

-- ---------------------------------------------------------------------
-- 2. Newsletter email — fires whenever a new article is published.
-- ---------------------------------------------------------------------
create or replace function public.notify_newsletter_email()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform net.http_post(
    url := 'https://ulyduorkvikeyxtpshoq.supabase.co/functions/v1/send-newsletter-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', '__WEBHOOK_SECRET__'
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'articles',
      'schema', 'public',
      'record', jsonb_build_object(
        'id', new.id,
        'title', new.title,
        'summary', new.summary,
        'category', new.category
      )
    )
  );
  return new;
end;
$$;

drop trigger if exists on_article_created on public.articles;
create trigger on_article_created
  after insert on public.articles
  for each row
  execute function public.notify_newsletter_email();
