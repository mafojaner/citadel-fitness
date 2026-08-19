-- Citadel Fitness — user feedback
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).
--
-- Backs the "Help & Feedback" screen. Every submission is saved here as
-- the durable record, and send-feedback-email additionally emails it
-- immediately — so a Resend hiccup never loses feedback, it just delays
-- the developer seeing it in their inbox.

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index feedback_user_id_idx on public.feedback (user_id);

alter table public.feedback enable row level security;

create policy "Users can submit their own feedback"
  on public.feedback for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own feedback"
  on public.feedback for select
  using (auth.uid() = user_id);
