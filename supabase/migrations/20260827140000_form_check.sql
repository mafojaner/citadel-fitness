-- Form check — the app's side of it.
--
-- A member films a set, submits it, a coach watches it and writes back.
-- The coach is not code and never will be. What the app owes the feature is
-- somewhere to put the video, a queue the reviewer can work through, and a
-- cap that stops the queue growing faster than one person can answer it.
--
-- That last part is the whole risk in this feature. Every other paid thing
-- in this app costs server time, which scales; this one costs a person's
-- afternoon. Without a cap enforced server-side, a tier sold as "form check
-- reviews" is an unbounded promise, and the failure mode is not a slow
-- response -- it is a member who paid, submitted, and never heard back.
--
-- The number is four a month, which is the figure already on the developer
-- dashboard's own Phase 3 reasoning: "at fifteen minutes a review and four
-- a month, ten members is an evening a week and fifty is a job". It is
-- deliberately a single constant in one function so it can be changed by
-- whoever owns that decision without touching anything else.

-- ---------------------------------------------------------------------------
-- Where the video lives
-- ---------------------------------------------------------------------------
--
-- Private, unlike avatars. An avatar is a picture someone chose to show
-- other people; this is a video of them training, often half-dressed, in
-- their home. Public-by-path would mean anyone holding the URL can watch it
-- forever, and URLs leak. Reads go through signed URLs with a short life,
-- issued only to the owner or to the reviewer.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'form-checks',
  'form-checks',
  false,
  -- 200 MB. A minute of phone video is comfortably inside it, and the cap
  -- exists so a bad client cannot fill the bucket rather than to police
  -- quality.
  209715200,
  array['video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Stored at "form-checks/{user_id}/{uuid}.mp4" — the first folder is the
-- owner's auth id, which is what every policy below checks.
drop policy if exists "Members can upload their own form checks" on storage.objects;
create policy "Members can upload their own form checks"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'form-checks'
    and (storage.foldername(name))[1] = auth.uid()::text
    -- Uploading is part of the paid feature, so the tier is checked here as
    -- well as on the row. Without this a free account could fill the bucket
    -- with objects that never get a submission attached to them.
    and public.tier_rank(auth.uid()) >= 2
  );

drop policy if exists "Members can read their own form checks" on storage.objects;
create policy "Members can read their own form checks"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'form-checks'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Deliberately not gated on tier: someone whose membership lapses keeps the
-- right to remove a video of themselves. Same reasoning as the delete
-- policies in 20260820090000.
drop policy if exists "Members can delete their own form checks" on storage.objects;
create policy "Members can delete their own form checks"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'form-checks'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- The submission
-- ---------------------------------------------------------------------------

create table if not exists public.form_check_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Optional: someone may want a look at something not in the catalogue.
  exercise_id uuid references public.exercises(id) on delete set null,
  -- Path within the form-checks bucket. Not a URL: URLs expire, and storing
  -- one would mean the row rots while the object is still there.
  video_path text not null,
  note text,
  status text not null default 'submitted'
    check (status in ('submitted', 'in_review', 'reviewed', 'withdrawn')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_notes text
);

create index if not exists form_check_user_idx
  on public.form_check_submissions (user_id, created_at desc);

-- The reviewer's working set is everything not yet answered, which stays
-- small while the table grows.
create index if not exists form_check_open_idx
  on public.form_check_submissions (created_at)
  where status in ('submitted', 'in_review');

alter table public.form_check_submissions enable row level security;

-- Read your own, always -- including after a membership lapses, so nobody
-- loses access to a review they already paid for.
drop policy if exists "Members can view their own submissions" on public.form_check_submissions;
create policy "Members can view their own submissions"
  on public.form_check_submissions for select
  to authenticated
  using (auth.uid() = user_id);

-- No insert or update policy at all. Submitting goes through
-- submit_form_check below, which is where the tier and the quota are
-- enforced; a direct insert would bypass both. Reviews are written by the
-- service role, which bypasses RLS entirely -- so there is no path by which
-- a member can mark their own submission reviewed or write their own
-- reviewer_notes.

-- Withdrawing is the member's own decision and needs no gate beyond
-- ownership. It is an update rather than a delete so the reviewer's time is
-- not silently erased if they had already started.
drop policy if exists "Members can withdraw their own submissions" on public.form_check_submissions;
create policy "Members can withdraw their own submissions"
  on public.form_check_submissions for update
  to authenticated
  using (auth.uid() = user_id and status = 'submitted')
  with check (auth.uid() = user_id and status = 'withdrawn');

-- ---------------------------------------------------------------------------
-- Submitting
-- ---------------------------------------------------------------------------

/**
 * How many reviews one member may request per calendar month.
 *
 * A function rather than a literal so the number lives in exactly one place
 * and changing it is a one-line migration. Whoever ends up doing the reviews
 * owns this number; four is what the plan assumed when it sized the tier.
 */
create or replace function public.form_check_monthly_allowance()
returns int
language sql
immutable
as $$ select 4 $$;

create or replace function public.submit_form_check(
  p_video_path text,
  p_exercise_id uuid default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_used int;
  v_allowance int := public.form_check_monthly_allowance();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if public.tier_rank(v_uid) < 2 then
    raise exception 'Form check reviews are a Valhalla feature';
  end if;

  if coalesce(trim(p_video_path), '') = '' then
    raise exception 'A video is required';
  end if;

  -- The path must be inside the caller's own folder. This function runs as
  -- its owner, so storage's policies do not apply to what is recorded here:
  -- without this check a member could attach someone else's object path to
  -- their own submission and have a reviewer open it.
  if split_part(p_video_path, '/', 1) <> v_uid::text then
    raise exception 'That video does not belong to this account';
  end if;

  -- Withdrawn submissions do not count. Someone who filmed the wrong lift
  -- and pulled it should not lose a review for it.
  select count(*) into v_used
  from public.form_check_submissions
  where user_id = v_uid
    and status <> 'withdrawn'
    and created_at >= date_trunc('month', now());

  if v_used >= v_allowance then
    raise exception 'You have used all % form check reviews for this month', v_allowance
      using errcode = 'check_violation';
  end if;

  insert into public.form_check_submissions (user_id, exercise_id, video_path, note)
  values (v_uid, p_exercise_id, p_video_path, nullif(trim(p_note), ''))
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_form_check(text, uuid, text) from public, anon;
grant execute on function public.submit_form_check(text, uuid, text) to authenticated;

/**
 * What is left this month, so the screen can say so before someone films
 * rather than after they have uploaded.
 */
create or replace function public.form_check_quota()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_used int;
  v_allowance int := public.form_check_monthly_allowance();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if public.tier_rank(v_uid) < 2 then
    raise exception 'Form check reviews are a Valhalla feature';
  end if;

  select count(*) into v_used
  from public.form_check_submissions
  where user_id = v_uid
    and status <> 'withdrawn'
    and created_at >= date_trunc('month', now());

  return jsonb_build_object(
    'used', v_used,
    'allowance', v_allowance,
    'remaining', greatest(0, v_allowance - v_used),
    'resetsAt', (date_trunc('month', now()) + interval '1 month')
  );
end;
$$;

revoke all on function public.form_check_quota() from public, anon;
grant execute on function public.form_check_quota() to authenticated;

-- ---------------------------------------------------------------------------
-- The review queue
-- ---------------------------------------------------------------------------

create or replace function public.admin_form_check_queue(p_limit int default 50)
returns table (
  id uuid,
  email text,
  exercise_name text,
  note text,
  video_path text,
  status text,
  created_at timestamptz,
  reviewed_at timestamptz,
  waiting_hours numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.id,
    u.email,
    e.name,
    s.note,
    s.video_path,
    s.status,
    s.created_at,
    s.reviewed_at,
    round(extract(epoch from (coalesce(s.reviewed_at, now()) - s.created_at)) / 3600, 1)
  from public.form_check_submissions s
  join auth.users u on u.id = s.user_id
  left join public.exercises e on e.id = s.exercise_id
  where s.status <> 'withdrawn'
  order by
    (s.status in ('submitted', 'in_review')) desc,
    s.created_at asc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

revoke all on function public.admin_form_check_queue(int) from public;
revoke all on function public.admin_form_check_queue(int) from anon;
revoke all on function public.admin_form_check_queue(int) from authenticated;
grant execute on function public.admin_form_check_queue(int) to service_role;

-- Asserted rather than assumed, for the same reason as every other admin
-- function here: revoke-from-public leaves anon's direct grant in place, and
-- this one returns other people's email addresses and video paths.
do $$
begin
  if has_function_privilege('anon', 'public.admin_form_check_queue(int)', 'execute') then
    raise exception 'admin_form_check_queue is executable by anon -- it must not be';
  end if;
  if has_function_privilege('authenticated', 'public.admin_form_check_queue(int)', 'execute') then
    raise exception 'admin_form_check_queue is executable by authenticated -- it must not be';
  end if;
  if not has_function_privilege('service_role', 'public.admin_form_check_queue(int)', 'execute') then
    raise exception 'admin_form_check_queue is not executable by service_role';
  end if;
  -- The member-facing pair must be the other way round.
  if not has_function_privilege('authenticated', 'public.submit_form_check(text, uuid, text)', 'execute') then
    raise exception 'submit_form_check is not callable by authenticated -- members cannot submit';
  end if;
  if has_function_privilege('anon', 'public.submit_form_check(text, uuid, text)', 'execute') then
    raise exception 'submit_form_check is executable by anon -- it must not be';
  end if;
end $$;
