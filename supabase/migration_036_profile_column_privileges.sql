-- Citadel Fitness — lock down which profile columns a user can write
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).
--
-- The update policy from schema.sql only ever said `using (auth.uid() = id)`.
-- With no `with check`, Postgres reuses the `using` expression as the check,
-- so the policy answered "is this your row?" and nothing else — every column
-- on that row was writable by its owner. That was harmless while profiles
-- held name/preferences/avatar_url, and stopped being harmless the moment
-- migration_034 added fortress_since: any signed-in user could grant
-- themselves Fortress with a single PostgREST call against their own row,
--
--   PATCH /rest/v1/profiles?id=eq.<their-own-id>   {"fortress_since": "..."}
--
-- which the policy happily accepts, because it is their row.
--
-- RLS can't express "every column except this one": a `with check` sees only
-- the new row, never the old, so no policy can tell whether fortress_since
-- changed. Column-level privileges are the mechanism Postgres provides for
-- this, and they compose with RLS — the grant decides which columns may be
-- written at all, the policy decides which rows.
--
-- Written as an allowlist rather than a denylist of the sensitive columns:
-- any column added to profiles later is then read-only to clients until
-- someone deliberately opens it, which is the safer default for a table
-- billing is going to write to.

-- 1. Column privileges -------------------------------------------------
-- Supabase's defaults grant UPDATE on every column of every public table to
-- anon and authenticated. Revoke wholesale, then hand back only the three
-- columns the app actually writes as the signed-in user (see profile.ts:
-- updateName, updatePreferences, and the avatar upload/remove pair).

revoke update on public.profiles from anon, authenticated;

grant update (name, preferences, avatar_url) on public.profiles to authenticated;

-- service_role writes welcome_email_sent_at from send-welcome-email and
-- backfill-welcome-emails, and is what a billing webhook will use to set
-- fortress_since. It needs this granted explicitly: the bypassrls attribute
-- skips policies, not column privileges.
grant update on public.profiles to service_role;

-- 2. Make the policy's intent explicit ---------------------------------
-- Behaviourally this is what the implicit fallback already did; it's spelled
-- out because the fallback being invisible is precisely what hid the gap
-- above for two migrations.

drop policy if exists "Users can update their own profile" on public.profiles;

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 3. Backstop -----------------------------------------------------------
-- The grants in step 1 are the actual fix; this trigger exists so the
-- invariant survives someone later re-running a broad `grant all on all
-- tables in schema public to authenticated`, which would silently reopen the
-- hole. PostgREST executes requests as anon/authenticated via SET ROLE,
-- while service_role and SQL Editor sessions do not — so current_user is
-- enough to tell a client request from a trusted one, with no JWT parsing.
--
-- Security invoker (the default) is deliberate: a security definer function
-- would report its owner as current_user and never fire.

create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if new.fortress_since is distinct from old.fortress_since then
      raise exception 'fortress_since is not user-writable'
        using errcode = '42501';
    end if;
    if new.welcome_email_sent_at is distinct from old.welcome_email_sent_at then
      raise exception 'welcome_email_sent_at is not user-writable'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged_columns on public.profiles;

create trigger profiles_guard_privileged_columns
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();

-- Verify — should return exactly: avatar_url, name, preferences
--
--   select column_name
--   from information_schema.column_privileges
--   where grantee = 'authenticated'
--     and table_schema = 'public'
--     and table_name = 'profiles'
--     and privilege_type = 'UPDATE'
--   order by column_name;
