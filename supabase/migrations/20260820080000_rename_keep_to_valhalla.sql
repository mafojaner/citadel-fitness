-- Renames the top tier from 'keep' to 'valhalla'.
--
-- Constraint first, then data, then the old constraint away: dropping the
-- check before rewriting the rows means neither step is ever fighting a
-- rule the other hasn't caught up with. Doing it in the other order would
-- reject every update as it went.

alter table public.profiles drop constraint if exists profiles_membership_tier_check;

update public.profiles
set membership_tier = 'valhalla'
where membership_tier = 'keep';

alter table public.profiles
  add constraint profiles_membership_tier_check
  check (membership_tier in ('free', 'fortress', 'valhalla'));

comment on column public.profiles.membership_tier is
  'free | fortress | valhalla, in ascending order. Server-written only: the column privileges from 20260817120000 grant authenticated UPDATE on name, preferences and avatar_url alone, so this column is read-only to clients by construction.';
