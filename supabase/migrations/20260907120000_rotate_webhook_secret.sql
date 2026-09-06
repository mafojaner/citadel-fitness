-- Citadel Fitness — rotate WEBHOOK_SECRET (database half)
--
-- Re-points the two transactional-email trigger functions at a new shared
-- secret. Run this as part of the full procedure in
-- docs/rotate-webhook-secret.md, not on its own: the secret lives in three
-- places and changing one of them alone stops email silently.
--
-- SECRET HANDLING — the `__WEBHOOK` + `_SECRET__` placeholder below is written
-- as one token in the two function bodies, exactly as in migration 028 and
-- for the same reason: this
-- file is committed to a public repository, and a live secret in version
-- history is a leak that outlives any later fix. Substitute it with the new
-- value at apply time and do not commit the substituted copy.
--
-- Only the two function bodies are replaced. The triggers themselves
-- (on_auth_user_email_confirmed, on_article_created) already point at these
-- functions by name and are left untouched, so there is no window in which
-- a trigger does not exist. `create or replace function` swaps the body
-- inside a single transaction.
--
-- Everything else about these functions is unchanged from migration 028.
-- If you are reading this to understand what they do, read that file.

-- ---------------------------------------------------------------------
-- 0. Refuse to run at all if the placeholder was never substituted.
--
--    This is first on purpose. Applying the file unsubstituted would
--    replace two working functions with two that send the placeholder
--    itself as the header value, and every welcome and newsletter email would be
--    dropped with a 401 that surfaces nowhere: pg_net is fire and forget,
--    so nothing raises, nothing retries, and the first sign of trouble
--    would be a member asking why they never got an email.
--
--    A guard placed after the replacement would only be safe if the whole
--    file ran in one transaction, and that depends on how it is applied.
--    Running first depends on nothing.
--
--    The right-hand side is assembled from two pieces so that a global
--    find-and-replace of the placeholder cannot touch it. If the left side
--    is still the placeholder, both sides match and this aborts.
-- ---------------------------------------------------------------------
do $$
begin
  if '__WEBHOOK_SECRET__' = '__WEBHOOK' || '_SECRET__' then
    raise exception
      'WEBHOOK_SECRET placeholder was never substituted. Nothing has been changed. See docs/rotate-webhook-secret.md.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 1. Welcome email
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

-- ---------------------------------------------------------------------
-- 2. Newsletter email
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
