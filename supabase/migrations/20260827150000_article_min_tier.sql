-- Expert guides: somewhere to actually put one.
--
-- The plan has said for a week that this feature "reuses the articles
-- infrastructure already shipped, so it is writing rather than
-- engineering". That was not true. `articles` had no tier column and one
-- read policy returning every published row to any signed-in user, so a
-- Valhalla-only guide could be written and there was nowhere to put it that
-- Valhalla members alone could read. Publishing one would have handed it to
-- everybody.
--
-- A guide is an article with a minimum tier, not a separate table and not a
-- separate category. A nutrition guide is still nutrition: it belongs in
-- the nutrition list for someone entitled to it rather than in a walled
-- section that has to be found. It also means search, favourites, category
-- counts and the notification opt-ins keep working on it for free, where a
-- parallel table would need every one of those written again and would
-- drift out of step.

alter table public.articles
  add column if not exists min_tier text not null default 'free';

alter table public.articles drop constraint if exists articles_min_tier_check;
alter table public.articles
  add constraint articles_min_tier_check check (min_tier in ('free', 'fortress', 'valhalla'));

comment on column public.articles.min_tier is
  'Lowest tier that may read this article. Default free; a Valhalla expert guide sets valhalla.';

-- Only the gated ones need finding quickly; the rest is already covered by
-- the published_at and category indexes.
create index if not exists articles_min_tier_idx
  on public.articles (min_tier)
  where min_tier <> 'free';

-- The gate itself.
--
-- Compared by rank rather than equality, for the reason set out in
-- 20260820090000: a Valhalla member must be able to read a Fortress-tier
-- article, and `=` would lock the top tier out of the middle one's content.
drop policy if exists "Authenticated users can read articles" on public.articles;
drop policy if exists "Members can read articles for their tier" on public.articles;
create policy "Members can read articles for their tier"
  on public.articles for select
  to authenticated
  using (
    published_at <= now()
    and public.tier_rank(auth.uid()) >= case min_tier
      when 'valhalla' then 2
      when 'fortress' then 1
      else 0
    end
  );

-- Still no insert, update or delete policy. Publishing happens with the
-- service role and never from the client, which is what stops a member
-- setting min_tier on somebody else's article -- or on their own.

-- ---------------------------------------------------------------------------
-- Why this migration writes no articles, not even to test itself
-- ---------------------------------------------------------------------------
--
-- `on_article_created` fires `notify_newsletter_email()` AFTER INSERT, which
-- calls net.http_post to the send-newsletter-email function. Inserting a
-- test article here and deleting it again would still commit the pg_net
-- queue row, so the delete would remove the article and the email would go
-- out anyway -- a "SELF TEST GUIDE" newsletter to every opted-in user.
--
-- 20260101000026 checked for exactly this trigger before seeding articles
-- and found none. It exists now, so that check has to be repeated by anyone
-- writing to this table rather than assumed from the last migration that
-- looked. The behavioural test for this gate was run as a rolled-back probe
-- instead, where the queue row rolls back with everything else.
--
-- What is asserted here is the shape of the policy, which needs no writes.
do $$
declare v_using text;
begin
  select pg_get_expr(pol.polqual, pol.polrelid)
  into v_using
  from pg_policy pol
  where pol.polrelid = 'public.articles'::regclass
    and pol.polname = 'Members can read articles for their tier';

  if v_using is null then
    raise exception 'article tier gate: the read policy was not created';
  end if;
  if position('tier_rank' in v_using) = 0 then
    raise exception 'article tier gate: the policy does not consult tier_rank -- % ', v_using;
  end if;
  if position('min_tier' in v_using) = 0 then
    raise exception 'article tier gate: the policy does not consult min_tier -- %', v_using;
  end if;

  -- And nothing else may still be handing out every row.
  if exists (
    select 1 from pg_policy
    where polrelid = 'public.articles'::regclass
      and polname = 'Authenticated users can read articles'
  ) then
    raise exception 'article tier gate: the old ungated read policy is still present';
  end if;
end $$;
