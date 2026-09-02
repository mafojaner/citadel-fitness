-- Delete a group once its last member leaves.
--
-- leaveGroup only ever deleted the row in group_members. The group itself
-- survived with nobody in it: unreachable, since every read policy is scoped
-- to membership, and undeletable, for the same reason. It kept its unique
-- invite_code forever, so the code space leaks alongside the rows -- and a
-- group created by mistake is permanent litter with no way for the person
-- who made it to clean it up.
--
-- Done as a trigger rather than a second client call because it has to hold
-- for every path that removes a membership, including a user deleting their
-- account (group_members cascades from auth.users, and that cascade never
-- goes anywhere near the app's code).

-- ---------------------------------------------------------------------
-- 1. The reaper.
--
-- security definer because the deleting member has, by this point in the
-- statement, already lost the membership their RLS policy on groups depends
-- on -- an invoker-rights trigger would match no row and silently do
-- nothing, which is the bug it is here to fix.
--
-- search_path pinned to empty per this project's convention, so the function
-- cannot be redirected by a caller's search_path.
create or replace function public.reap_empty_group()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only when the row just removed was the last one. The `not exists` runs
  -- inside the same statement, after the delete, so it sees the post-delete
  -- state.
  if not exists (
    select 1 from public.group_members where group_id = old.group_id
  ) then
    delete from public.groups where id = old.group_id;
  end if;
  return old;
end;
$$;

drop trigger if exists reap_empty_group_after_delete on public.group_members;
create trigger reap_empty_group_after_delete
  after delete on public.group_members
  for each row
  execute function public.reap_empty_group();

-- ---------------------------------------------------------------------
-- 2. The groups already orphaned, including any left behind before this.
delete from public.groups g
where not exists (
  select 1 from public.group_members m where m.group_id = g.id
);

-- ---------------------------------------------------------------------
-- 3. Prove both halves before committing.
do $$
declare
  v_orphans integer;
  v_trigger integer;
begin
  select count(*) into v_orphans
  from public.groups g
  where not exists (select 1 from public.group_members m where m.group_id = g.id);

  if v_orphans <> 0 then
    raise exception 'REAP FAILED: % member-less groups still present', v_orphans;
  end if;

  select count(*) into v_trigger
  from pg_trigger
  where tgname = 'reap_empty_group_after_delete'
    and tgrelid = 'public.group_members'::regclass
    and not tgisinternal;

  if v_trigger <> 1 then
    raise exception 'REAP FAILED: trigger not installed (found %)', v_trigger;
  end if;

  raise notice 'reap_empty_group installed; orphaned groups cleared';
end $$;
