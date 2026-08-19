-- Grants the project owner's own account Fortress, so the member-side of
-- every gated feature can actually be exercised while it's being built.
--
-- By email rather than a pasted uuid: the uuid means nothing to a reader six
-- months from now, and looking it up keeps this re-runnable against a fresh
-- environment (the staging project, say) without editing the file.
--
-- Guarded by `fortress_since is null` so re-running never moves the join
-- date. This is the "granted by hand for now" path migration_034 described;
-- it is not a substitute for billing, and it stays a deliberate, recorded
-- act rather than something the client can do to itself — see
-- 20260817120000, which took fortress_since away from `authenticated`.

update public.profiles
set fortress_since = now()
where fortress_since is null
  and id = (select id from auth.users where email = 'mafojanemafole@gmail.com');
