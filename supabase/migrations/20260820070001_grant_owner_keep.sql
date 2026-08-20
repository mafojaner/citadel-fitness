-- Puts the owner's account on the top tier, so every gated feature can be
-- opened and checked against real data. Same reasoning and same by-email
-- lookup as 20260820000000, which granted Fortress.
--
-- Unconditional on the current tier rather than guarded by "is free":
-- that grant already set fortress, and this must move it up rather than
-- skip because it found something already there.

update public.profiles
set membership_tier = 'keep',
    fortress_since = coalesce(fortress_since, now())
where id = (select id from auth.users where email = 'mafojanemafole@gmail.com');
