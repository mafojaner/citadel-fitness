-- Three tiers: free, fortress, keep.
--
-- "Keep" is the innermost tower of a fortification — above Fortress rather
-- than beside it. The line between the two is not difficulty but marginal
-- cost per member per month: Fortress is everything software serves for
-- effectively nothing extra per person, Keep is where a human is on the
-- other end and every member costs real hours.
--
-- A single ordered column rather than one timestamp per tier. Membership is
-- one state, not a set of independent flags, and "which tier are you"
-- should have exactly one answer that can't contradict itself.
--
-- fortress_since is kept and still means what it did: when this account
-- first joined a paid tier. It stops being the entitlement itself.

alter table public.profiles
  add column if not exists membership_tier text not null default 'free'
  check (membership_tier in ('free', 'fortress', 'keep'));

-- Existing members keep exactly what they had.
update public.profiles
set membership_tier = 'fortress'
where fortress_since is not null
  and membership_tier = 'free';

comment on column public.profiles.membership_tier is
  'free | fortress | keep, in ascending order. Server-written only: the column privileges from 20260817120000 grant authenticated UPDATE on name, preferences and avatar_url alone, so a new column like this one is read-only to clients by construction rather than by remembering to lock it.';

-- Deliberately no new grant. 20260817120000 replaced the blanket UPDATE
-- privilege with an explicit three-column allowlist, so this column is
-- already unwritable by `authenticated` without another line being added.
-- That is the payoff of an allowlist over a denylist: the safe default
-- applies to columns that didn't exist when the rule was written.
