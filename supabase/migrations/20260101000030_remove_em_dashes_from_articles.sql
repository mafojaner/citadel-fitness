-- Citadel Fitness — remove em dashes from newsletter article content
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query).
--
-- Targeted replace() calls rather than full-text rewrites, so each edit
-- only touches the exact em dash it's aimed at and can't accidentally
-- alter unrelated content. En dashes used for numeric ranges (5-6, 24-72,
-- etc.) are a different character and untouched on purpose.

update public.articles
set summary = replace(summary, ' — how to structure', ': how to structure'),
    body = replace(
      replace(
        replace(body, 'Push** — chest', 'Push**: chest'),
        'Pull** — back', 'Pull**: back'
      ),
      'Legs** — quads', 'Legs**: quads'
    )
where id = 'b817abbb-c3fd-4ba8-99eb-04d77359593d';

update public.articles
set body = replace(
      replace(
        replace(
          replace(body, 'Monday** — Upper', 'Monday**: Upper'),
          'Tuesday** — Lower', 'Tuesday**: Lower'
        ),
        'Thursday** — Upper', 'Thursday**: Upper'
      ),
      'Friday** — Lower', 'Friday**: Lower'
    )
where id = '5d95b275-cca5-453c-8994-9509bc1bc056';

update public.articles
set body = replace(body, 'upper end — higher protein', 'upper end: higher protein')
where id = 'ca01abd7-17a5-476a-a11d-aee06a45da2a';

update public.articles
set body = replace(body, 'most people — a walk', 'most people: a walk')
where id = '2139c492-a47e-4e4f-923c-ce2b7530e912';

update public.articles
set body = replace(
      replace(body, 'field — fine for a 20-minute', 'field: fine for a 20-minute'),
      'unaffected — old entries convert', 'unaffected; old entries convert'
    )
where id = '2f9e7bb3-bff3-4fc5-aab4-71cc148fe2ce';

update public.articles
set body = replace(
      replace(body, 'category — shadowboxing', 'category: shadowboxing'),
      'category — hip thrusts', 'category: hip thrusts'
    )
where id = 'c60704c6-21c1-4f64-86a3-81f473f39661';

update public.articles
set summary = replace(summary, 'dedicated tab — and only', 'dedicated tab, and only'),
    body = replace(body, 'your calendar — it just will not count', 'your calendar, but it just will not count')
where id = '5ca228e8-5220-4ce0-bfaf-1b14a3bfc551';

update public.articles
set body = replace(body, 'before upload — drag to reposition', 'before upload: drag to reposition')
where id = '027b33d1-6027-4378-97a3-13d0e6923ac2';

update public.articles
set summary = replace(summary, 'genuinely speeds recovery — ice right after', 'genuinely speeds recovery, but ice right after'),
    body = replace(
      replace(
        replace(
          replace(body, 'that follows it — not something going wrong', 'that follows it, not something going wrong'),
          'protein response — a real', 'protein response: a real'
        ),
        'and sleep — see "Rest days', 'and sleep. See "Rest days'
      ),
      'sauna problem — that is the deload signal', 'sauna problem. That is the deload signal'
    )
where id = '3059fe38-86b9-4575-9fc3-5963c845e059';
