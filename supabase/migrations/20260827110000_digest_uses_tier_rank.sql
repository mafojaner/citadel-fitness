-- The weekly digest was the last access decision still reading
-- fortress_since instead of tier_rank.
--
-- 20260820030000 was written six days before subscriptions existed, and
-- `fortress_since is not null` was then a complete description of "is a
-- member". It stopped being one on 26 August: tier_rank now takes the
-- greater of the hand-granted membership_tier column and any live paid
-- subscription, so an account that pays through the store is Fortress to
-- every RLS policy and every gated RPC -- and was invisible to this one.
--
-- The failure mode is the worst kind: silent, and only affecting people who
-- have paid. They would be entitled to the digest, the app would tell them
-- they are on Fortress, and the email would simply never arrive, with
-- nothing anywhere reporting an error. Confirmed against production before
-- the fix by giving a free account a live fortress subscription inside a
-- rolled-back transaction: tier_rank returned 1, this function returned no
-- row for them.
--
-- 20260826100001 made exactly this argument when it introduced my_tier():
-- two expressions of "what does this account get" drift, and the one people
-- see eventually disagrees with the one that decides access. This is that
-- drift, caught in the other direction -- a decision that never migrated.
--
-- fortress_since itself is not being removed. It still means what it always
-- meant, the date this account first joined a paid tier, and the app shows
-- it as "member since". It is just not an entitlement check.
create or replace function public.get_weekly_digest_recipients()
returns table (
  user_id uuid,
  email text,
  name text,
  weight_unit text,
  days_logged int,
  total_sets int,
  total_volume_kg numeric,
  top_category text
)
language sql
security definer
set search_path = public
as $$
  with members as (
    select
      p.id,
      u.email,
      nullif(p.name, '') as name,
      coalesce(p.preferences->>'units', 'lb') as weight_unit
    from public.profiles p
    join auth.users u on u.id = p.id
    where public.tier_rank(p.id) >= 1
      and coalesce((p.preferences->>'weeklyDigest')::boolean, false) = true
      and u.email is not null
  ),
  week as (
    select
      w.user_id,
      w.date,
      ex.category,
      se.reps,
      -- Normalised to kg so a mixed-unit week sums correctly; the caller
      -- converts once for display. Summing raw stored numbers would add
      -- pounds to kilos, the same trap migration 009 created elsewhere.
      se.reps * case
        when se.weight_unit = 'lb' then se.weight / 2.2046226218
        else se.weight
      end as volume_kg
    from public.workouts w
    join public.logged_exercises le on le.workout_id = w.id
    join public.exercises ex on ex.id = le.exercise_id
    join public.set_entries se on se.logged_exercise_id = le.id
    where w.date > (current_date - interval '7 days')
      and w.date <= current_date
  )
  select
    m.id,
    m.email,
    m.name,
    m.weight_unit,
    coalesce((select count(distinct wk.date) from week wk where wk.user_id = m.id), 0)::int,
    coalesce((select count(*) from week wk where wk.user_id = m.id), 0)::int,
    coalesce((select sum(wk.volume_kg) from week wk where wk.user_id = m.id), 0),
    (
      select wk.category
      from week wk
      where wk.user_id = m.id
      group by wk.category
      order by count(*) desc, wk.category
      limit 1
    )
  from members m;
$$;

revoke all on function public.get_weekly_digest_recipients() from public, anon, authenticated;
grant execute on function public.get_weekly_digest_recipients() to service_role;

-- Prove the fix in the transaction that makes it, and prove the arithmetic
-- while we are here. Postgres will not tell us either of these things.
do $$
declare
  v_user uuid; v_ex uuid; v_w uuid; v_le uuid;
  v_days int; v_sets int; v_vol numeric;
  v_before int; v_after int;
  v_prefs jsonb;
begin
  -- Someone with no workouts in the last seven days, so the seeded figures
  -- below are the whole of what this function should see. The earlier probe
  -- of this migration used an account that already had a real workout this
  -- week and reported numbers that looked wrong when they were simply not
  -- isolated -- worth not repeating inside an assertion.
  select p.id into v_user
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.email is not null
    and not exists (
      select 1 from public.workouts w
      where w.user_id = p.id and w.date > current_date - interval '7 days'
    )
  order by p.id
  limit 1;

  select id into v_ex from public.exercises where type = 'strength' limit 1;
  if v_user is null or v_ex is null then
    raise notice 'digest self-test skipped: no isolated account or no exercises';
    return;
  end if;

  -- Captured verbatim so the restore below puts back exactly what was
  -- there, including an existing weeklyDigest choice. Removing the key
  -- would silently unsubscribe a real person as a side effect of a test.
  select preferences into v_prefs from public.profiles where id = v_user;

  update public.profiles
     set preferences = coalesce(preferences, '{}'::jsonb)
                       || jsonb_build_object('weeklyDigest', true, 'units', 'kg')
   where id = v_user;

  -- A paid subscription and no fortress_since: the exact shape that was
  -- being dropped.
  select count(*) into v_before
    from public.get_weekly_digest_recipients() where user_id = v_user;

  insert into public.subscriptions (user_id, provider, product_id, tier, status, current_period_end, event_at)
  values (v_user, 'revenuecat', 'fortress_monthly', 'fortress', 'active', now() + interval '30 days', now())
  on conflict (user_id) do update
    set tier = 'fortress', status = 'active',
        current_period_end = now() + interval '30 days', event_at = now();

  -- Two days, three sets, mixed units:
  --   5 reps x 100 kg  x2 sets            = 1000 kg
  --   10 reps x 220.46226218 lb (=100 kg) = 1000 kg
  --   => days 2, sets 3, volume 2000 kg
  insert into public.workouts (user_id, date) values (v_user, current_date - 1) returning id into v_w;
  insert into public.logged_exercises (workout_id, exercise_id) values (v_w, v_ex) returning id into v_le;
  insert into public.set_entries (logged_exercise_id, set_number, reps, weight, weight_unit)
    values (v_le, 1, 5, 100, 'kg'), (v_le, 2, 5, 100, 'kg');

  insert into public.workouts (user_id, date) values (v_user, current_date - 2) returning id into v_w;
  insert into public.logged_exercises (workout_id, exercise_id) values (v_w, v_ex) returning id into v_le;
  insert into public.set_entries (logged_exercise_id, set_number, reps, weight, weight_unit)
    values (v_le, 1, 10, 220.46226218, 'lb');

  select count(*) into v_after
    from public.get_weekly_digest_recipients() where user_id = v_user;

  select days_logged, total_sets, round(total_volume_kg, 2)
    into v_days, v_sets, v_vol
  from public.get_weekly_digest_recipients() where user_id = v_user;

  if v_before <> 0 then
    raise exception 'digest self-test: account was already a recipient before the subscription (%), so this proves nothing', v_before;
  end if;
  if v_after <> 1 then
    raise exception 'digest self-test: a paid subscriber is still not a recipient (% rows)', v_after;
  end if;
  if v_days <> 2 or v_sets <> 3 or v_vol <> 2000.00 then
    raise exception 'digest self-test: figures wrong -- days % (want 2), sets % (want 3), volume % (want 2000.00)',
      v_days, v_sets, v_vol;
  end if;

  -- Undo everything the self-test wrote. It runs against real data, so
  -- leaving a fake subscription or two invented workouts behind would be
  -- this migration quietly making someone a paying member.
  delete from public.workouts where user_id = v_user and date in (current_date - 1, current_date - 2);
  delete from public.subscriptions where user_id = v_user;
  update public.profiles set preferences = v_prefs where id = v_user;

  -- And prove the undo worked, rather than trusting three delete statements.
  if exists (select 1 from public.subscriptions where user_id = v_user)
     or exists (select 1 from public.workouts
                where user_id = v_user and date > current_date - interval '7 days')
     or (select preferences from public.profiles where id = v_user) is distinct from v_prefs then
    raise exception 'digest self-test: cleanup did not fully restore the account it borrowed';
  end if;
end $$;
