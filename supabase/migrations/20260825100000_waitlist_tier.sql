-- Record which plan someone is waiting for.
--
-- The waitlist predates the tiers: it stored a user and an email, from when
-- Fortress was the only thing to buy. With three plans and a button on each,
-- a signup that doesn't say which plan is a signup that answers the one
-- question worth asking — how many people want the coached tier, which is
-- the tier with a capacity cap and therefore the one whose demand has to be
-- known before it goes on sale.
--
-- Nullable rather than defaulted, and deliberately so: existing rows joined
-- before there was a choice to make. Backfilling them to 'fortress' would
-- invent a preference nobody expressed, and they would be indistinguishable
-- from people who actually chose it. Null means "joined before tiers", which
-- is the truth and is separable in a query.
alter table public.fortress_waitlist
  add column if not exists tier text;

alter table public.fortress_waitlist
  drop constraint if exists fortress_waitlist_tier_check;

-- 'free' is not a valid answer: there is nothing to wait for on the tier you
-- already have. Mirrors the check on profiles.membership_tier, which is the
-- other place a tier name is written to the database.
alter table public.fortress_waitlist
  add constraint fortress_waitlist_tier_check
  check (tier is null or tier in ('fortress', 'valhalla'));

comment on column public.fortress_waitlist.tier is
  'Which plan this person is waiting for. Null for rows created before the tiers existed — not a preference, an absence of one.';
