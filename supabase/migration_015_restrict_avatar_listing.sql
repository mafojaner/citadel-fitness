-- Citadel Fitness — restrict avatar bucket listing to signed-in users
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).
--
-- Why: the original SELECT policy on storage.objects had no `to authenticated`
-- clause, so anyone holding only the public anon key could call
-- storage.from('avatars').list(...) and enumerate every user_id folder that
-- has uploaded a photo — no sign-in required.
--
-- Individual avatar images are still fetchable via their public URL — the
-- bucket itself is `public: true` (set in migration_004), which serves known
-- paths directly through a separate endpoint that doesn't consult this
-- policy at all. This change only closes off anonymous *listing* of who has
-- uploaded what; it does not affect the app's own avatar display, which
-- always goes through getPublicUrl().

drop policy if exists "Avatar images are publicly readable" on storage.objects;

create policy "Signed-in users can list avatar objects"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars');
