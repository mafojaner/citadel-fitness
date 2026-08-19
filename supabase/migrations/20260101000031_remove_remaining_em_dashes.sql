-- Citadel Fitness — catch two em dashes missed by migration_030
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query).

update public.articles
set body = replace(body, 'makes sense — running, cycling', 'makes sense: running, cycling')
where id = '2f9e7bb3-bff3-4fc5-aab4-71cc148fe2ce';

update public.articles
set body = replace(body, 'catalogue does — search', 'catalogue does: search')
where id = 'c60704c6-21c1-4f64-86a3-81f473f39661';
