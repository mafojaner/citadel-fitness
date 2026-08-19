-- Citadel Fitness — let users fix or leave their Fortress waitlist entry
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).
--
-- Why: migration_013 only granted SELECT + INSERT, so a mistyped email
-- could never be corrected and there was no self-service way to leave the
-- waitlist short of deleting the whole account.

create policy "Users can update their own waitlist entry"
  on public.fortress_waitlist for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can leave their own waitlist entry"
  on public.fortress_waitlist for delete
  using (auth.uid() = user_id);
