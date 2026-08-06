-- Citadel Fitness — "App Updates" newsletter category
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).
--
-- Adds a 5th article category alongside splits/exercise/nutrition/recovery,
-- for announcing app changes rather than fitness content. category is a
-- hard CHECK constraint (articles_category_check, confirmed via
-- pg_constraint before writing this), so a new value needs the constraint
-- replaced, not just an insert.
--
-- Checked before writing this migration: no Database Webhook is currently
-- live on public.articles (queried pg_trigger directly — zero rows), so
-- these seed rows will NOT trigger any real email to real users. If you set
-- up the send-newsletter-email webhook later, that's fine — this migration
-- doesn't touch triggers, it only affects what's visible going forward.

alter table public.articles drop constraint articles_category_check;
alter table public.articles add constraint articles_category_check
  check (category in ('splits', 'exercise', 'nutrition', 'recovery', 'updates'));

insert into public.articles (title, summary, body, category, read_minutes, published_at) values
(
  'Cardio duration, now with hours and seconds',
  'Duration entry is Hours : Minutes : Seconds, and Distance only shows up where it actually applies.',
  E'Cardio duration used to be a single "minutes" field — fine for a 20-minute run, awkward for a 90-minute ride or a 45-second sprint.\n\nIt is now three fields: **Hours**, **Minutes**, **Seconds**. Type into any of them and the others stay put.\n\n**Distance is smarter too.** It only appears for exercises where covering ground actually makes sense — running, cycling, rowing, swimming. A plank, a skipping session, or a round on the heavy bag no longer asks you for a distance that was never going to mean anything.\n\nEverything you already logged is unaffected — old entries convert automatically.',
  'updates', 2, now() - interval '6 days'
),
(
  'Boxing and Glutes join the exercise catalogue',
  'Two new categories: round-based boxing work, and dedicated glute exercises.',
  E'**Boxing** is now its own category — shadowboxing, heavy bag work, speed bag, sparring, footwork drills, and more. Since boxing is worked in rounds rather than sets, the button reads **"+ Add round"**, and every boxing exercise logs duration only, no distance.\n\n**Glutes** joins the Legs lineup as its own category — hip thrusts, glute bridges, cable kickbacks, and the other dedicated glute-focused lifts that were previously buried under general leg exercises.\n\nBoth show up wherever the exercise catalogue does — search, category filters, and the Add Workout screen.',
  'updates', 2, now() - interval '4 days'
),
(
  'Rewards now live in their own tab',
  'Rewards moved out of Activity and back to a dedicated tab — and only same-day logging counts toward it.',
  E'Rewards has its own tab again, sitting in the middle of the bottom navigation between Workouts and Activity. It had been folded into the Activity screen; it is now a full page of its own.\n\n**One rule worth knowing:** only workouts logged on the actual day they happened count toward your weekly reward streak. If you open the Workouts calendar and fill in a day from last week, it still saves normally and still shows on your calendar — it just will not count toward that week''s reward, since the reward is meant to reflect real day-to-day consistency, not calendar cleanup after the fact.\n\nDays that count show a green ring on the Rewards calendar, so it is always clear at a glance which ones are reward-eligible.',
  'updates', 3, now() - interval '2 days'
),
(
  'Crop your profile picture, right in the app',
  'Pick a photo and frame it yourself before it becomes your avatar.',
  E'Profile pictures can now be cropped and repositioned before upload — drag to reposition, pinch or use the zoom buttons to get the framing right, all inside a circular preview that matches exactly how your avatar will actually look around the app.\n\nOn iOS and Android this uses the same crop step you would expect from your camera roll. On web, where that wasn''t available before, there is now a dedicated crop screen so the feature works the same everywhere.',
  'updates', 2, now()
)
on conflict do nothing;
