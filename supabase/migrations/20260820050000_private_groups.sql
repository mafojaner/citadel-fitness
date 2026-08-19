-- Private groups: an invite-only leaderboard for a gym crew.
--
-- This is the first table where one user legitimately sees another user's
-- data, so the policies matter more than usual. Two traps are avoided
-- deliberately, both documented below: RLS recursion on the membership
-- table, and making a group discoverable by anyone who guesses its id.

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 60),
  -- Short, shareable, and unique. Not derived from the id: an invite code
  -- gets pasted into chats, so it should be readable and revocable without
  -- changing the group's identity.
  invite_code text not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create index group_members_user_id_idx on public.group_members (user_id);
create index group_members_group_id_idx on public.group_members (group_id);

-- ---------------------------------------------------------------------
-- Membership test, as a security definer function.
--
-- This exists to break RLS recursion. The natural policy on group_members
-- is "you may see rows for groups you belong to", which queries
-- group_members from inside group_members' own policy — Postgres detects
-- that as infinite recursion and errors on every read. A definer function
-- runs with the owner's rights and so bypasses RLS, letting the policy ask
-- the question without re-entering itself.
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid()
  );
$$;

grant execute on function public.is_group_member(uuid) to authenticated;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

-- Deliberately membership-scoped rather than readable by invite code: a
-- group is only visible once you're in it. Discovery happens through
-- join_group_by_code below, which checks the code without ever exposing a
-- readable list of groups to probe.
create policy "Members can view their groups"
  on public.groups for select to authenticated
  using (public.is_group_member(id));

create policy "Owners can rename their group"
  on public.groups for update to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "Owners can delete their group"
  on public.groups for delete to authenticated
  using (auth.uid() = owner_id);

create policy "Members can view fellow members"
  on public.group_members for select to authenticated
  using (public.is_group_member(group_id));

-- Leaving is self-service; removing someone else is the owner's right.
create policy "Members can leave, owners can remove"
  on public.group_members for delete to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
  );

-- No INSERT policy on either table on purpose. Creating and joining both
-- go through the definer functions below, so membership can never be
-- granted by a client crafting its own insert against a guessed group id.

-- ---------------------------------------------------------------------

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

-- ---------------------------------------------------------------------
-- Group leaderboard over an arbitrary window, which is what makes a
-- "challenge" just a date range rather than another table to maintain.
--
-- Security definer because it reads other members' workouts, which their
-- own RLS rightly forbids. The membership check on the first line is what
-- makes that safe: a caller who isn't in the group gets nothing back, so
-- the elevated rights can't be used to read a stranger's training. Only
-- name, avatar and a day count are exposed — never email, and never what
-- was actually lifted.
create or replace function public.get_group_leaderboard(
  p_group_id uuid,
  p_start date,
  p_end date
)
returns table (user_id uuid, name text, avatar_url text, days_logged int)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_group_member(p_group_id) then
    return;
  end if;

  return query
  select
    m.user_id,
    coalesce(nullif(p.name, ''), 'Member') as name,
    p.avatar_url,
    coalesce((
      select count(distinct w.date)
      from public.workouts w
      where w.user_id = m.user_id
        and w.date between p_start and p_end
    ), 0)::int as days_logged
  from public.group_members m
  join public.profiles p on p.id = m.user_id
  where m.group_id = p_group_id
  order by days_logged desc, name;
end;
$$;

grant execute on function public.get_group_leaderboard(uuid, date, date) to authenticated;
