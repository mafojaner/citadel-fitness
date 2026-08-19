-- Citadel Fitness — newsletter / articles
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).
--
-- Backs the Newsletter tab: editorial content (workout splits, exercise
-- guides, nutrition, recovery) that you publish from the dashboard without
-- shipping an app release.
--
-- To publish a new article, insert a row. `published_at` controls both the
-- ordering in the app and which articles count as "new" for notifications,
-- so you can back-date or schedule by setting it explicitly.

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  body text not null,
  category text not null check (category in ('splits', 'exercise', 'nutrition', 'recovery')),
  read_minutes int not null default 3,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists articles_published_at_idx on public.articles (published_at desc);
create index if not exists articles_category_idx on public.articles (category);

alter table public.articles enable row level security;

-- Shared editorial content: readable by any signed-in user. There is no
-- insert/update/delete policy on purpose — publishing happens from the
-- dashboard (service role), never from the client.
drop policy if exists "Authenticated users can read articles" on public.articles;
create policy "Authenticated users can read articles"
  on public.articles for select
  to authenticated
  using (published_at <= now());

-- Seed content ---------------------------------------------------------
insert into public.articles (title, summary, body, category, read_minutes, published_at) values
(
  'Push / Pull / Legs: the 6-day split',
  'The classic high-frequency split — how to structure it and who it suits.',
  E'Push / Pull / Legs (PPL) divides training by movement pattern rather than muscle group.\n\n**Push** — chest, shoulders, triceps. Bench press, overhead press, dips, lateral raises.\n\n**Pull** — back, biceps, rear delts. Pull-ups, rows, face pulls, curls.\n\n**Legs** — quads, hamstrings, glutes, calves. Squats, deadlifts, lunges, calf raises.\n\nRun twice through for a 6-day week, or once for a 3-day week. The 6-day version hits each muscle twice weekly, which research consistently favours over once-weekly frequency for hypertrophy.\n\n**Who it suits:** intermediates who can recover from 5–6 sessions a week and want clear session focus.\n\n**Who should skip it:** beginners. A 3-day full-body routine builds the same base with far less scheduling pressure.',
  'splits', 4, now() - interval '6 days'
),
(
  'Upper / Lower: four days, balanced',
  'Less demanding than PPL, still twice-weekly frequency per muscle.',
  E'Upper / Lower alternates between upper-body and lower-body days, typically four days a week.\n\n**Monday** — Upper (heavy)\n**Tuesday** — Lower (heavy)\n**Thursday** — Upper (volume)\n**Friday** — Lower (volume)\n\nThe heavy days centre on compound lifts in the 4–6 rep range. Volume days move to 8–15 reps with more isolation work.\n\nThis is arguably the best strength-to-time ratio available. You still hit everything twice a week, but with three rest days instead of one.\n\n**Progression:** add weight on heavy days, add reps on volume days. When you hit the top of a rep range on all sets, increase the load and drop back down.',
  'splits', 3, now() - interval '4 days'
),
(
  'The deadlift: bracing before the bar moves',
  'Most deadlift problems are set-up problems.',
  E'The deadlift punishes a poor set-up more than almost any other lift. Before the bar leaves the floor:\n\n**1. Bar over midfoot.** Not over your toes. Roughly an inch from your shins.\n\n**2. Grip, then drop the hips.** Reach down and take your grip with straight legs, then bend the knees until your shins touch the bar. If you squat down first, the bar drifts forward.\n\n**3. Take the slack out.** Pull up gently until you hear the plates settle against the collars. You should feel tension through your lats and hamstrings before anything moves.\n\n**4. Brace.** Big breath into the belly, not the chest. Brace as if about to be punched, then hold it for the whole rep.\n\n**5. Push the floor away.** Thinking "push" rather than "pull" keeps your hips from shooting up first.\n\nIf your lower back rounds, the weight is too heavy or the brace failed. Neither is fixed by pulling harder.',
  'exercise', 5, now() - interval '2 days'
),
(
  'Protein: how much actually matters',
  'The number is lower than most people think, and the timing matters less.',
  E'For building muscle, the evidence converges on roughly **1.6–2.2g of protein per kg of bodyweight per day**. Above that, benefits flatten out sharply.\n\nFor an 80kg lifter that is about 130–175g daily.\n\n**Timing is mostly overrated.** The "anabolic window" turns out to be several hours wide, not thirty minutes. Total daily intake is what moves the needle. Spreading it across 3–4 meals is marginally better than 1–2, mostly because it is easier to actually eat that much.\n\n**Practical sources:** chicken breast (~31g/100g), Greek yoghurt (~10g/100g), eggs (~6g each), lentils (~9g/100g cooked), whey (~24g/scoop).\n\nIf you are in a calorie deficit, push toward the upper end — higher protein preserves lean mass when energy is scarce.',
  'nutrition', 4, now() - interval '1 day'
),
(
  'Rest days are training days',
  'Adaptation happens between sessions, not during them.',
  E'Training is the stimulus. Adaptation is the response, and it happens while you rest.\n\n**Sleep is the single biggest lever.** Under 7 hours measurably reduces strength, increases perceived exertion, and blunts recovery. No supplement compensates for it.\n\n**Active recovery beats total rest** for most people — a walk, easy cycling, or light mobility work increases blood flow without adding fatigue.\n\n**Signs you need more rest:** performance dropping across sessions, resting heart rate creeping up, sleep getting worse, motivation falling off. One or two is noise. All four together is a deload signal.\n\n**Deloading:** every 6–10 weeks, cut volume roughly in half for a week while keeping intensity. You will usually come back stronger than you left.',
  'recovery', 3, now()
)
on conflict do nothing;
