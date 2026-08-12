-- Citadel Fitness — Fortress membership flag
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).
--
-- Until now Fortress was purely a waitlist: fortress_waitlist recorded who
-- wanted it, but nothing in the schema said who *has* it, so no feature
-- could be gated. This adds that.
--
-- A nullable timestamp rather than a boolean: "when did they join" answers
-- "are they a member" (not null) and is worth having for its own sake, at
-- no extra cost. Deliberately not a subscriptions table — no payment
-- provider has been chosen, and inventing plan/status/period columns now
-- would be guessing at a shape billing may not match. Whatever provider
-- lands later sets this same column from its webhook.
--
-- Granted by hand for now:
--   update public.profiles set fortress_since = now() where id = '<user-id>';
--
-- No policy changes needed: profiles already restricts every row to its
-- owner, and the existing update policy is what a future service-role
-- webhook would bypass anyway.

alter table public.profiles add column if not exists fortress_since timestamptz;

comment on column public.profiles.fortress_since is
  'When this account became a Fortress member. Null means free tier. Set by hand today; a billing webhook will set it later.';
