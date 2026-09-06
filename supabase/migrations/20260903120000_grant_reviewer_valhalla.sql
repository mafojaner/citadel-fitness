-- Puts the Play reviewer account on the top tier.
--
-- Google's sign-in declaration asks whether the credentials give "full access
-- to all the features and content within this app, including premium or paid
-- content". Today they cannot: the tier gate is live, billing is not, and a
-- reviewer has no way to buy past it. Every Fortress and Valhalla screen
-- would be unreachable, which is a rejection with a vague reason attached.
--
-- Same by-email lookup as 20260820070001, with one difference that matters.
-- That migration used a bare `update ... where id = (select id from
-- auth.users where email = ...)`. If the address does not match, that updates
-- zero rows and reports success, so a typo grants nothing and says nothing.
-- Granting a tier to the wrong account, or to no account, is exactly the kind
-- of thing that should not pass quietly.
do $$
declare
  uid uuid;
  before_tier text;
  after_tier text;
begin
  select id into uid
  from auth.users
  where email = 'exampleuser@gmail.com';

  if uid is null then
    raise exception
      'No auth.users row for exampleuser@gmail.com. Create the reviewer account in the app first, then re-run.';
  end if;

  select membership_tier into before_tier
  from public.profiles
  where id = uid;

  if before_tier is null then
    raise exception
      'auth.users row exists for % but no profiles row. Sign in once to create the profile, then re-run.', uid;
  end if;

  -- Unconditional on the current tier, for the same reason the owner grant
  -- was: this must move the account up rather than skip because it found
  -- something already set.
  update public.profiles
  set membership_tier = 'valhalla',
      fortress_since = coalesce(fortress_since, now())
  where id = uid;

  select membership_tier into after_tier
  from public.profiles
  where id = uid;

  -- Read back rather than trust the update. tier_rank() takes the greater of
  -- this column and any live subscription, so this column alone is what opens
  -- the gated screens while billing is off.
  if after_tier is distinct from 'valhalla' then
    raise exception 'Grant did not stick: tier is % after update', after_tier;
  end if;

  raise notice 'Reviewer account % moved from % to %', uid, before_tier, after_tier;
end $$;
