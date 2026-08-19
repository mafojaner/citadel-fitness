-- Referrals: a personal code, and a record of who joined through it.
--
-- The reward this feature advertises is a free month, which cannot be
-- granted while there is nothing to be a month *of* — billing is
-- deliberately deferred to after launch. So this records attribution
-- honestly and leaves every reward pending, rather than pretending to
-- grant something or quietly dropping the claim. When memberships go on
-- sale, the pending rows are the queue to honour.

create table public.referral_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  -- One referral per person, ever. Without this a single account could be
  -- claimed by everyone in turn, and "who referred them" would have no
  -- answer.
  referee_id uuid not null unique references auth.users(id) on delete cascade,
  code text not null,
  reward_status text not null default 'pending' check (reward_status in ('pending', 'granted', 'void')),
  created_at timestamptz not null default now(),
  -- Belt and braces alongside the check in redeem_referral_code: a
  -- constraint keeps the rule true even if some future code path forgets.
  constraint referrals_no_self_referral check (referrer_id <> referee_id)
);

create index referrals_referrer_id_idx on public.referrals (referrer_id);

alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;

create policy "Users can view their own referral code"
  on public.referral_codes for select to authenticated
  using (auth.uid() = user_id);

-- Both sides can see the referral they're part of: the referrer needs to
-- see who joined, and the referee needs to see that their claim landed.
create policy "Users can view referrals they are part of"
  on public.referrals for select to authenticated
  using (auth.uid() = referrer_id or auth.uid() = referee_id);

-- No INSERT policies. Codes are minted and redeemed only through the
-- definer functions below, so nobody can write themselves an attribution
-- row naming an arbitrary referrer.

create or replace function public.get_or_create_referral_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select code into v_code from public.referral_codes where user_id = v_user_id;
  if v_code is not null then
    return v_code;
  end if;

  -- Retried rather than trusting one draw, so a collision surfaces as a
  -- second attempt instead of a constraint error in the user's face.
  for i in 1..10 loop
    v_code := upper(substr(md5(gen_random_uuid()::text), 1, 7));
    exit when not exists (select 1 from public.referral_codes where code = v_code);
    v_code := null;
  end loop;

  if v_code is null then
    raise exception 'Could not allocate a referral code';
  end if;

  insert into public.referral_codes (user_id, code)
  values (v_user_id, v_code)
  -- Two devices asking at once would otherwise race; whichever lands
  -- first wins and the other reads it back below.
  on conflict (user_id) do nothing;

  select code into v_code from public.referral_codes where user_id = v_user_id;
  return v_code;
end;
$$;

grant execute on function public.get_or_create_referral_code() to authenticated;

create or replace function public.redeem_referral_code(p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_referrer uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select user_id into v_referrer
  from public.referral_codes
  where code = upper(trim(p_code));

  if v_referrer is null then
    raise exception 'That code does not exist';
  end if;

  if v_referrer = v_user_id then
    raise exception 'You cannot use your own code';
  end if;

  if exists (select 1 from public.referrals where referee_id = v_user_id) then
    raise exception 'You have already used a referral code';
  end if;

  insert into public.referrals (referrer_id, referee_id, code)
  values (v_referrer, v_user_id, upper(trim(p_code)));
end;
$$;

grant execute on function public.redeem_referral_code(text) to authenticated;
