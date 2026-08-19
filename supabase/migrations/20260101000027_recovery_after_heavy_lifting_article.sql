-- Citadel Fitness — new "Recovery" newsletter article
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query).
--
-- Adds one new article to the existing 'recovery' category (already a valid
-- value per articles_category_check — no constraint change needed here,
-- unlike migration_026). Complements the existing "Rest days are training
-- days" recovery article with more tactical, technique-level guidance
-- (sauna/heat, cold exposure caution) for recovering after a heavy lifting
-- session, rather than duplicating the sleep/deload-cycle framing already
-- covered there.

insert into public.articles (title, summary, body, category, read_minutes, published_at) values
(
  'What actually helps when you''re sore from a heavy session',
  'Sauna heat genuinely speeds recovery — ice right after lifting might blunt it. Here''s what the evidence says.',
  E'Soreness after a heavy session (DOMS) is muscle micro-damage and the inflammation that follows it — not something going wrong. It typically peaks 24–72 hours post-workout and fades on its own. The real question is what shortens that window without blunting the adaptation you just trained for.\n\n**Heat is genuinely useful.** A 15–20 minute sauna session, ideally later the same day or the day after, increases blood flow to fatigued muscle, which helps clear metabolic byproducts and eases stiffness. Regular sauna use is also associated with modestly better long-term strength and endurance adaptations, likely through the heat-shock protein response — a real physiological mechanism, not just a feel-good ritual.\n\n**Cold is trickier.** An ice bath immediately after a heavy strength or hypertrophy session can blunt some of the same inflammatory signaling that drives muscle growth. The evidence is still developing, but the safer default is to save cold plunges for a separate day, or for genuine joint pain, rather than routinely icing right after your heaviest lifts.\n\n**The unglamorous basics still do most of the work:** protein within a few hours of training, water, a short walk or light activity the next day rather than total rest, and sleep — see "Rest days are training days" for why sleep is the single biggest lever you have.\n\n**One distinction worth making:** normal DOMS fades within 2–3 days and doesn''t get worse week over week. If soreness is climbing, performance is dropping, and motivation is tanking at the same time, that is not a sauna problem — that is the deload signal.',
  'recovery', 3, now()
)
on conflict do nothing;
