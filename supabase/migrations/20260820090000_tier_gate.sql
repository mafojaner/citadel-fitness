-- Make the membership gate real.
--
-- Until now membership_tier was a column with a check constraint and nothing
-- else: no policy anywhere referenced it. Every paid feature was gated by
-- useMembershipTier() in the client, which is a display rule. The anon key
-- ships inside the app, so a free account could call PostgREST directly and
-- read what a member reads.
--
-- What can and cannot be gated here is worth stating, because it is not
-- obvious and it shapes the whole approach:
--
--   Gateable — the paid feature IS server-side state. A lift goal, a program
--   enrolment, a private group: none of these exist for a free account, so a
--   policy can simply refuse to create or return them.
--
--   Not gateable — the paid feature is a COMPUTATION over rows the member
--   already owns on the free tier. The PR vault, advanced analytics, the
--   1RM estimates and goal projections are all derived client-side from
--   workouts and set_entries, which a free account must be able to read in
--   order to log at all. There is no policy that withholds those without
--   breaking free logging. Gating them would mean moving the computation
--   server-side into a definer function; that is a real option and a
--   separate piece of work, not something this migration can fake.
--
-- Data export is deliberately left ungated even though it is sold in
-- Fortress. It emits the member's own workout history, and putting a
-- paywall between a person and their own data is the wrong side of both
-- data-portability expectations and app store policy. It stays in the tier
-- as a convenience feature, not as a lock.
--
-- Referrals are deliberately left ungated too: a free account referring
-- someone is how the paid tiers get customers, so gating it works against
-- the thing it exists to do.

-- ---------------------------------------------------------------------------
-- The rank helper
-- ---------------------------------------------------------------------------

-- Mirrors TIER_RANK in src/lib/membership.ts. Ordered rather than a set of
-- booleans for the same reason it is ordered there: a Valhalla member holds
-- everything Fortress does, and `>=` expresses that where `=` would lock the
-- top tier out of the middle one's features.
--
-- security definer so a policy can consult profiles without going through
-- profiles' own RLS and recursing — the trap that already bit group_members
-- in 20260820050000 and had to be broken with is_group_member().
--
-- search_path is pinned to empty and every name below is schema-qualified.
-- A definer function that inherits the caller's search_path can be made to
-- resolve `profiles` to an attacker-controlled table in a schema they can
-- create, which turns this into a privilege escalation rather than a check.
create or replace function public.tier_rank(p_uid uuid default auth.uid())
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select case (select p.membership_tier from public.profiles p where p.id = p_uid)
    when 'valhalla' then 2
    when 'fortress' then 1
    else 0
  end;
$$;

comment on function public.tier_rank(uuid) is
  'Membership rank for a user: free 0, fortress 1, valhalla 2. Unknown or missing profile reads as 0 — an unrecognised tier must never grant more than the least privileged one.';

revoke all on function public.tier_rank(uuid) from public;
grant execute on function public.tier_rank(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Goal forecasting — lift_goals
-- ---------------------------------------------------------------------------

drop policy if exists "Users can view their own lift goals" on public.lift_goals;
drop policy if exists "Users can create their own lift goals" on public.lift_goals;
drop policy if exists "Users can update their own lift goals" on public.lift_goals;

create policy "Members can view their own lift goals"
  on public.lift_goals for select
  to authenticated
  using (auth.uid() = user_id and public.tier_rank() >= 1);

create policy "Members can create their own lift goals"
  on public.lift_goals for insert
  to authenticated
  with check (auth.uid() = user_id and public.tier_rank() >= 1);

create policy "Members can update their own lift goals"
  on public.lift_goals for update
  to authenticated
  using (auth.uid() = user_id and public.tier_rank() >= 1)
  with check (auth.uid() = user_id and public.tier_rank() >= 1);

-- Delete stays ungated on purpose. Someone whose membership lapses keeps the
-- right to remove data they created; a lapsed account that can neither see
-- nor delete its own rows is a support ticket and arguably a data-rights
-- problem.

-- ---------------------------------------------------------------------------
-- Structured programs — program_enrollments
-- ---------------------------------------------------------------------------
--
-- Only the enrolment. programs / program_days / program_day_exercises are a
-- global catalogue with no user_id — reading what "Strength 5x5" contains is
-- not the paid feature, following it day by day is.

drop policy if exists "Users can view their own enrollment" on public.program_enrollments;
drop policy if exists "Users can create their own enrollment" on public.program_enrollments;
drop policy if exists "Users can update their own enrollment" on public.program_enrollments;

create policy "Members can view their own enrollment"
  on public.program_enrollments for select
  to authenticated
  using (auth.uid() = user_id and public.tier_rank() >= 1);

create policy "Members can create their own enrollment"
  on public.program_enrollments for insert
  to authenticated
  with check (auth.uid() = user_id and public.tier_rank() >= 1);

create policy "Members can update their own enrollment"
  on public.program_enrollments for update
  to authenticated
  using (auth.uid() = user_id and public.tier_rank() >= 1)
  with check (auth.uid() = user_id and public.tier_rank() >= 1);

-- Delete stays ungated, same reasoning as lift_goals: a lapsed member must
-- still be able to unenroll.

-- ---------------------------------------------------------------------------
-- Private groups
-- ---------------------------------------------------------------------------
--
-- Groups are created and joined through security definer functions, which
-- bypass RLS entirely. Adding tier to the policies alone would leave both
-- doors wide open, so the check goes inside the functions as well.

drop policy if exists "Members can view their groups" on public.groups;
create policy "Members can view their groups"
  on public.groups for select
  to authenticated
  using (public.is_group_member(id) and public.tier_rank() >= 1);

drop policy if exists "Members can view fellow members" on public.group_members;
create policy "Members can view fellow members"
  on public.group_members for select
  to authenticated
  using (public.is_group_member(group_id) and public.tier_rank() >= 1);

-- Owners renaming/deleting and members leaving stay ungated for the same
-- reason delete stays open above: lapsing must not trap you in a group or
-- strand a group you own.

create or replace function public.create_group(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_group_id uuid;
  v_code text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- This function runs as its owner, so RLS on groups does not apply to the
  -- insert below. Without this line the policy above would be decoration.
  if public.tier_rank(v_user_id) < 1 then
    raise exception 'Private groups are a Fortress feature';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'Group name is required';
  end if;

  -- Retry rather than trusting one draw: the space is large but a
  -- collision would otherwise surface as a constraint error to the user.
  for i in 1..10 loop
    v_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));
    exit when not exists (select 1 from public.groups where invite_code = v_code);
    v_code := null;
  end loop;

  if v_code is null then
    raise exception 'Could not allocate an invite code';
  end if;

  insert into public.groups (name, invite_code, owner_id)
  values (trim(p_name), v_code, v_user_id)
  returning id into v_group_id;

  insert into public.group_members (group_id, user_id)
  values (v_group_id, v_user_id);

  return v_group_id;
end;
$$;

grant execute on function public.create_group(text) to authenticated;

create or replace function public.join_group_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_group_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- The other definer door into group_members. Gating create_group alone
  -- would stop a free account starting a group while still letting it join
  -- every group whose code it was given, which is most of the feature.
  if public.tier_rank(v_user_id) < 1 then
    raise exception 'Private groups are a Fortress feature';
  end if;

  select id into v_group_id
  from public.groups
  where invite_code = upper(trim(p_code));

  if v_group_id is null then
    raise exception 'No group found for that code';
  end if;

  insert into public.group_members (group_id, user_id)
  values (v_group_id, v_user_id)
  on conflict (group_id, user_id) do nothing;

  return v_group_id;
end;
$$;

grant execute on function public.join_group_by_code(text) to authenticated;

-- get_group_leaderboard is deliberately not gated. It already refuses a
-- caller who isn't a member, and membership is now gated at both doors, so
-- the tier check would be redundant there — while adding one would break a
-- lapsed member's group for everyone else still in it.

-- ---------------------------------------------------------------------------
-- RPE — set_entries.rpe
-- ---------------------------------------------------------------------------
--
-- A single nullable column on a table free accounts must be able to write.
-- Column privileges can't express this: they are granted per role, and every
-- signed-in user is `authenticated` regardless of tier. So the check has to
-- be a trigger.
--
-- It nulls the value rather than raising. A free client has no way to send
-- rpe today, so anything arriving here is either a stale build or someone
-- calling the API directly; in both cases dropping one optional field is the
-- proportionate response, where an exception would fail the whole workout
-- save and lose the sets with it.

create or replace function public.strip_rpe_below_fortress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.rpe is not null and public.tier_rank(auth.uid()) < 1 then
    new.rpe := null;
  end if;
  return new;
end;
$$;

drop trigger if exists strip_rpe_below_fortress on public.set_entries;
create trigger strip_rpe_below_fortress
  before insert or update on public.set_entries
  for each row execute function public.strip_rpe_below_fortress();
