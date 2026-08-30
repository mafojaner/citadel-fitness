-- Priority support — the app's half of it.
--
-- The catalogue sells this as "skip the queue with a same-day reply from a
-- real person". A person still writes the reply; that part is not code and
-- never will be. What the app owes the feature is a queue that is actually
-- ordered, and a record of what has been answered -- without those, "skip
-- the queue" is a promise with no queue behind it, and whoever is replying
-- is working from a reverse-chronological list where a paying member's
-- message sinks under newer free-tier ones every day.
--
-- Two things are added and nothing is taken away:
--
--   answered_at   so an outstanding message is distinguishable from a
--                 handled one. Without it the only available sort is "most
--                 recent", which is precisely the wrong one: the message
--                 most at risk of being missed is the oldest unanswered.
--
--   a queue view  ordered by entitlement first, then oldest-first inside
--                 each tier. Newest-first within a tier would let a busy
--                 week bury someone indefinitely, which is the failure this
--                 feature is sold as fixing.

alter table public.feedback add column if not exists answered_at timestamptz;

comment on column public.feedback.answered_at is
  'When a person replied. Null means outstanding. Set by whoever answers, not by the app.';

-- Outstanding messages are what the queue is for, so the index covers only
-- those: a partial index stays small as answered feedback accumulates, and
-- answered rows are never the thing being searched for.
create index if not exists feedback_outstanding_idx
  on public.feedback (created_at)
  where answered_at is null;

/**
 * The support queue, ordered the way the tier promises.
 *
 * service_role only. This reads every user's feedback and their tier, and
 * the Edge Function has already checked the caller against ADMIN_EMAIL
 * before it gets here -- the same arrangement as admin_activation_stats.
 */
create or replace function public.admin_support_queue(p_limit int default 50)
returns table (
  id uuid,
  email text,
  message text,
  created_at timestamptz,
  answered_at timestamptz,
  tier text,
  tier_rank int,
  waiting_hours numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    f.id,
    f.email,
    f.message,
    f.created_at,
    f.answered_at,
    case public.tier_rank(f.user_id)
      when 2 then 'valhalla'
      when 1 then 'fortress'
      else 'free'
    end as tier,
    public.tier_rank(f.user_id) as tier_rank,
    -- Frozen at the moment of reply for answered rows, so the column means
    -- "how long did this person wait" rather than "how long ago was this",
    -- which is what any promise about response time is actually measured on.
    round(extract(epoch from (coalesce(f.answered_at, now()) - f.created_at)) / 3600, 1) as waiting_hours
  from public.feedback f
  order by
    -- Outstanding first: an answered message is history, however recent.
    (f.answered_at is null) desc,
    -- Then entitlement. This is the whole feature.
    public.tier_rank(f.user_id) desc,
    -- Then oldest first inside a tier. Newest-first would let a busy week
    -- bury someone indefinitely, which is the exact failure being sold
    -- against.
    f.created_at asc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

comment on function public.admin_support_queue(int) is
  'Feedback ordered by entitlement then age, outstanding first. service_role only; the dashboard function gates on ADMIN_EMAIL before calling it.';

revoke all on function public.admin_support_queue(int) from public;
revoke all on function public.admin_support_queue(int) from anon;
revoke all on function public.admin_support_queue(int) from authenticated;
grant execute on function public.admin_support_queue(int) to service_role;

-- Asserted, not assumed. This function returns every user's feedback text
-- and email; anon or authenticated holding execute on it would be a
-- cross-user data leak reachable with the key that ships in the app.
-- `revoke ... from public` alone does not do it -- Supabase's default
-- privileges grant execute on new functions to both roles directly, and a
-- direct grant survives the PUBLIC revoke untouched. 20260827100000 found
-- that the hard way.
do $$
begin
  if has_function_privilege('anon', 'public.admin_support_queue(int)', 'execute') then
    raise exception 'admin_support_queue is executable by anon -- it must not be';
  end if;
  if has_function_privilege('authenticated', 'public.admin_support_queue(int)', 'execute') then
    raise exception 'admin_support_queue is executable by authenticated -- it must not be';
  end if;
  if not has_function_privilege('service_role', 'public.admin_support_queue(int)', 'execute') then
    raise exception 'admin_support_queue is not executable by service_role -- the dashboard cannot read it';
  end if;
end $$;

-- And prove the ordering does what the tier promises, rather than trusting
-- an ORDER BY that reads correctly. Runs against real rows, writes nothing.
do $$
declare
  v_first_rank int;
  v_outstanding int;
  v_answered_before_outstanding boolean;
begin
  select count(*) into v_outstanding from public.feedback where answered_at is null;
  if v_outstanding = 0 then
    raise notice 'support queue self-test skipped: no outstanding feedback to order';
    return;
  end if;

  -- The first row must be outstanding, and must be the highest tier that has
  -- anything outstanding.
  select tier_rank into v_first_rank from public.admin_support_queue(200) limit 1;

  if v_first_rank is distinct from (
    select max(public.tier_rank(f.user_id))
    from public.feedback f where f.answered_at is null
  ) then
    raise exception 'support queue self-test: the top row is not the highest-entitled outstanding message';
  end if;

  select bool_or(answered) into v_answered_before_outstanding
  from (
    select
      answered_at is not null as answered,
      bool_or(answered_at is null) over (order by 1 rows between 1 following and unbounded following) as outstanding_later
    from public.admin_support_queue(200)
  ) q
  where answered and outstanding_later;

  if coalesce(v_answered_before_outstanding, false) then
    raise exception 'support queue self-test: an answered message sorted above an outstanding one';
  end if;
end $$;
