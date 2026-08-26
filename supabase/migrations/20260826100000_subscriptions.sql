-- Billing: where a paid entitlement actually comes from.
--
-- 20260101000034 deliberately did not create this table, because no payment
-- provider had been chosen and inventing plan/status/period columns would
-- have been guessing at a shape billing might not match. RevenueCat is the
-- choice now — one integration covering both Play Billing and StoreKit — so
-- the shape can be real.
--
-- Nothing here is writable by a client. The rows are written by the webhook
-- Edge Function using the service key, which bypasses RLS; `authenticated`
-- gets select on its own row and nothing else. An app that can write its own
-- entitlement is not a paywall.

create table if not exists public.subscriptions (
  -- One row per person. Someone can only hold one plan at a time, and a
  -- history table would invite reading entitlement from the wrong row.
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null check (provider in ('revenuecat')),
  product_id text not null,
  tier text not null check (tier in ('fortress', 'valhalla')),
  -- 'grace' is a real state, not a synonym for expired: a failed renewal
  -- gives the store days to retry the card, and revoking during that window
  -- takes the app away from someone who is still paying.
  status text not null check (status in ('active', 'grace', 'paused', 'expired', 'refunded')),
  current_period_end timestamptz,
  /**
   * When the provider says the event happened, not when we received it.
   *
   * Webhook delivery is not ordered and is retried. Without this, a
   * cancellation emitted before a renewal but delivered after it would
   * revoke a subscription that had just been renewed. The function refuses
   * to apply an event older than the one already stored.
   */
  event_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "Users can view their own subscription" on public.subscriptions;
create policy "Users can view their own subscription"
  on public.subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

-- No insert, update or delete policy at all, deliberately. Absent policies
-- deny; writing them as `using (false)` would only invite someone to loosen
-- them later. The webhook holds the service key and does not consult RLS.
revoke insert, update, delete on public.subscriptions from authenticated, anon;

-- ---------------------------------------------------------------------------
-- Entitlement
-- ---------------------------------------------------------------------------

/**
 * What a paid subscription currently entitles this account to.
 *
 * Status and expiry are both checked. A row saying 'active' with a period
 * end in the past is a subscription whose renewal event never arrived, and
 * trusting the status alone would grant a paid tier indefinitely to someone
 * who stopped paying. 'paused', 'expired' and 'refunded' grant nothing
 * whatever the dates say.
 */
create or replace function public.subscription_rank(p_uid uuid default auth.uid())
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select case s.tier when 'valhalla' then 2 when 'fortress' then 1 else 0 end
      from public.subscriptions s
      where s.user_id = p_uid
        and s.status in ('active', 'grace')
        and (s.current_period_end is null or s.current_period_end > now())
    ),
    0
  );
$$;

revoke all on function public.subscription_rank(uuid) from public;
grant execute on function public.subscription_rank(uuid) to authenticated;

/**
 * The account's rank: the better of what it pays for and what it was given.
 *
 * Deliberately the greater of the two rather than a switch to subscriptions
 * alone. profiles.membership_tier stays meaningful as a hand-grant, which is
 * how staff, comps and the owner's own account work — replacing it outright
 * would have revoked every one of those the moment this shipped, including
 * the account this was tested from.
 *
 * membership_tier is not a hole in the paywall: 20260817120000 revoked
 * client updates to it by column privilege, so only something holding the
 * service key can set it.
 */
create or replace function public.tier_rank(p_uid uuid default auth.uid())
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(
    public.subscription_rank(p_uid),
    case (select p.membership_tier from public.profiles p where p.id = p_uid)
      when 'valhalla' then 2
      when 'fortress' then 1
      else 0
    end
  );
$$;

comment on function public.tier_rank(uuid) is
  'Membership rank: free 0, fortress 1, valhalla 2. The greater of a live subscription and a hand-granted membership_tier.';
