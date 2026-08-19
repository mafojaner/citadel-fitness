-- Run this in the Supabase SQL Editor.
-- Fortress (the premium membership tab) isn't built yet — this just lets a
-- signed-in user register interest with their account email so they can be
-- notified at launch. No payment, no subscription, nothing billed.

create table public.fortress_waitlist (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.fortress_waitlist enable row level security;

create policy "Users can view their own waitlist entry"
  on public.fortress_waitlist for select
  using (auth.uid() = user_id);

create policy "Users can insert their own waitlist entry"
  on public.fortress_waitlist for insert
  with check (auth.uid() = user_id);
