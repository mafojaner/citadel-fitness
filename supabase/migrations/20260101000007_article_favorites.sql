-- Citadel Fitness — favorite newsletters
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).
--
-- Lets a user favorite an article and later filter the Newsletter tab down
-- to just their favorites. A join table rather than an array column on
-- profiles so RLS can be scoped per-row and a favorite disappears cleanly
-- if the article itself is ever deleted (on delete cascade).

create table if not exists public.article_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

create index if not exists article_favorites_user_id_idx on public.article_favorites (user_id);

alter table public.article_favorites enable row level security;

drop policy if exists "Users manage their own favorites" on public.article_favorites;
create policy "Users manage their own favorites"
  on public.article_favorites for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
