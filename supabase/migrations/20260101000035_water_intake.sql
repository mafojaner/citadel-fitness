-- Citadel Fitness — water intake tracking (free feature)
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).
--
-- Backs the Home screen's water card. Each tap logs a separate row rather
-- than the app maintaining a single running total per day, for the same
-- reason logged_exercises is append-only: a row-per-entry table makes
-- "undo my last tap" a plain delete instead of needing to remember and
-- reverse whatever the previous total was, and it keeps the door open to
-- a real history view later without a schema change.
--
-- amount_ml is canonical storage regardless of the display unit the entry
-- was logged in (oz or ml) — converting at write time means every reader
-- (today's total, a future weekly chart) sums one consistent unit instead
-- of each having to know and convert mixed-unit rows itself.

create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_date date not null default current_date,
  amount_ml integer not null check (amount_ml > 0),
  created_at timestamptz not null default now()
);

create index water_logs_user_date_idx on public.water_logs (user_id, logged_date);

alter table public.water_logs enable row level security;

create policy "Users can log their own water intake"
  on public.water_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own water intake"
  on public.water_logs for select
  using (auth.uid() = user_id);

create policy "Users can remove their own water intake"
  on public.water_logs for delete
  using (auth.uid() = user_id);
