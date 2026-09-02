-- Give "Private groups & challenges" its challenge.
--
-- The plans page sells challenges. What shipped was a rolling 7/30/90-day
-- window that resets every day and never concludes -- lib/groups.ts said as
-- much, arguing the window doubles as the challenge and needs no table or
-- lifecycle. That reasoning holds for a first version and stops holding the
-- moment the marketing copy promises otherwise. Nothing was ever won, so
-- there was never a reason to come back on a particular day.
--
-- A challenge has the three things the window lacks: a name, an end, and a
-- result.

create table public.group_challenges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  -- Days trained, or volume moved. Days is the default because it is the
  -- metric the group standings already use and the one that does not punish
  -- a member for training a different lift.
  metric text not null default 'days' check (metric in ('days', 'volume')),
  starts_on date not null,
  ends_on date not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create index group_challenges_group_idx on public.group_challenges (group_id, ends_on desc);

-- One running at a time per group. Two live challenges would give the group
-- two answers to "who is winning", and the screen would have to invent a
-- rule for which one it means -- the same reasoning that keeps a member to
-- one program enrollment and one goal per lift.
--
-- A trigger rather than a partial unique index: the predicate would have to
-- be "ends_on >= current_date", and Postgres refuses a non-immutable
-- function in an index predicate, since the set of indexed rows would change
-- underneath it every midnight. The check has to run at write time, which is
-- also where it can say something useful.
create or replace function public.one_live_challenge_per_group()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.group_challenges c
    where c.group_id = new.group_id
      and c.ends_on >= current_date
      and c.id <> new.id
  ) then
    raise exception 'This group already has a challenge running';
  end if;
  return new;
end;
$$;

create trigger group_challenges_one_live
  before insert or update on public.group_challenges
  for each row
  execute function public.one_live_challenge_per_group();

alter table public.group_challenges enable row level security;

create policy "Members can view their group's challenges"
  on public.group_challenges for select to authenticated
  using (public.is_group_member(group_id));

-- Any member can start one, not only the owner. A crew challenge that only
-- one person is allowed to propose is a crew challenge nobody proposes.
create policy "Members can start a challenge"
  on public.group_challenges for insert to authenticated
  with check (public.is_group_member(group_id) and created_by = auth.uid());

-- Only whoever started it can call it off, and only while it is running.
-- Deleting a finished challenge would erase a result other members are
-- entitled to keep seeing.
create policy "The starter can cancel a running challenge"
  on public.group_challenges for delete to authenticated
  using (created_by = auth.uid() and ends_on >= current_date);

-- ---------------------------------------------------------------------
-- The challenge and its standings, in one call.
--
-- Returns the live challenge if there is one, otherwise the most recently
-- finished, so a group that just concluded one still sees who won rather
-- than an empty panel the day after.
create or replace function public.get_group_challenge(p_group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_ch public.group_challenges;
  v_standings jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if not public.is_group_member(p_group_id) then
    raise exception 'Not a member of this group';
  end if;

  select * into v_ch
  from public.group_challenges c
  where c.group_id = p_group_id
  -- Live first, then the newest finished one.
  order by (c.ends_on >= current_date) desc, c.ends_on desc
  limit 1;

  if v_ch.id is null then
    return null;
  end if;

  -- Scored over the challenge's own window, clamped to today so a running
  -- challenge reports what has happened rather than counting an unfinished
  -- future as zero.
  select coalesce(jsonb_agg(row_to_json(s) order by s.score desc, s.name), '[]'::jsonb)
    into v_standings
  from (
    select
      m.user_id,
      coalesce(nullif(p.name, ''), 'Member') as name,
      p.avatar_url,
      case v_ch.metric
        when 'days' then (
          select count(distinct w.date)
          from public.workouts w
          where w.user_id = m.user_id
            and w.date between v_ch.starts_on and least(v_ch.ends_on, current_date)
        )
        else (
          select coalesce(round(sum(
            se.reps * case
              when se.weight_unit::text = 'lb' then se.weight / 2.2046226218
              else se.weight
            end
          )), 0)
          from public.workouts w
          join public.logged_exercises le on le.workout_id = w.id
          join public.set_entries se on se.logged_exercise_id = le.id
          where w.user_id = m.user_id
            and w.date between v_ch.starts_on and least(v_ch.ends_on, current_date)
        )
      end::numeric as score
    from public.group_members m
    join public.profiles p on p.id = m.user_id
    where m.group_id = p_group_id
  ) s;

  return jsonb_build_object(
    'id', v_ch.id,
    'name', v_ch.name,
    'metric', v_ch.metric,
    'startsOn', v_ch.starts_on,
    'endsOn', v_ch.ends_on,
    'daysLeft', (v_ch.ends_on - current_date),
    'finished', (v_ch.ends_on < current_date),
    'startedByMe', (v_ch.created_by = v_uid),
    'standings', v_standings
  );
end;
$$;

revoke all on function public.get_group_challenge(uuid) from public;
revoke all on function public.get_group_challenge(uuid) from anon;
grant execute on function public.get_group_challenge(uuid) to authenticated;

grant select, insert, delete on public.group_challenges to authenticated;
