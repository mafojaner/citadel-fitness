-- Run this in the Supabase SQL Editor.
-- The introduction flow only makes sense for brand new sign-ups. Without
-- this backfill, every account that already existed before this shipped
-- would see it once too, since their stored preferences jsonb has no
-- hasSeenOnboarding key yet (the app's default for a missing key is false).

update public.profiles
set preferences = preferences || jsonb_build_object('hasSeenOnboarding', true)
where not (preferences ? 'hasSeenOnboarding');
