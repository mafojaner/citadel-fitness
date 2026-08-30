-- Nutrition coaching — the app's side of it.
--
-- The catalogue sells this as "macro targets set with a coach around your
-- training load, and revisited as your program changes". A coach sets the
-- targets; that is not code. What the app owes is somewhere to say what a
-- coach needs to know, a queue for them to work through, and somewhere for
-- the answer to come back and stay.
--
-- The shape is deliberately NOT the same as form check, even though the
-- dashboard has been calling them the same shape all week. A form check is
-- a repeated transaction -- film a set, get notes, film another -- and it
-- is capped per month because each one costs a review. A nutrition plan is
-- a relationship: one intake, one plan, then revisions when training
-- changes. Capping it monthly would be charging per question, and letting
-- someone open five intakes at once would put five half-answered
-- conversations in front of one coach.
--
-- So the constraint here is one open intake at a time. That is what makes
-- "revisited as your program changes" true rather than aspirational: you
-- come back and open another when something changes, and you cannot stack
-- them up while one is unanswered.

create table if not exists public.nutrition_intakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- What the coach actually needs. Free text rather than a rigid schema on
  -- purpose: a first version that forces someone to pick from a dropdown of
  -- goals gets the goal wrong, and a coach reading "I want to stop gassing
  -- out on the last set" learns more than "goal: endurance".
  goal text not null,
  -- Optional throughout. Someone who does not want to give a weight should
  -- still be able to ask a question, and a required field here is a wall in
  -- front of the feature rather than a form.
  body_weight_kg numeric,
  height_cm numeric,
  activity_level text,
  restrictions text,
  typical_day text,

  status text not null default 'submitted'
    check (status in ('submitted', 'in_review', 'answered', 'withdrawn')),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  coach_plan text,

  constraint nutrition_goal_not_blank check (length(trim(goal)) > 0)
);

create index if not exists nutrition_intakes_user_idx
  on public.nutrition_intakes (user_id, created_at desc);

-- The reviewer's working set, which stays small as answered plans build up.
create index if not exists nutrition_intakes_open_idx
  on public.nutrition_intakes (created_at)
  where status in ('submitted', 'in_review');

-- One open intake per person, enforced by the database rather than by the
-- screen. A partial unique index is the right tool: it constrains only the
-- rows that are actually open, so a member can have any number of answered
-- plans in their history and exactly one conversation in flight.
create unique index if not exists nutrition_intakes_one_open_idx
  on public.nutrition_intakes (user_id)
  where status in ('submitted', 'in_review');

alter table public.nutrition_intakes enable row level security;

drop policy if exists "Members can view their own intakes" on public.nutrition_intakes;
create policy "Members can view their own intakes"
  on public.nutrition_intakes for select
  to authenticated
  using (auth.uid() = user_id);

-- Withdrawing is the member's own call and frees the one open slot. Not
-- gated on tier: someone whose membership lapses must still be able to
-- close their own conversation, the same reasoning as every other delete
-- and withdraw path since 20260820090000.
drop policy if exists "Members can withdraw their own intakes" on public.nutrition_intakes;
create policy "Members can withdraw their own intakes"
  on public.nutrition_intakes for update
  to authenticated
  using (auth.uid() = user_id and status = 'submitted')
  with check (auth.uid() = user_id and status = 'withdrawn');

-- No insert policy. Submitting goes through the function below, where the
-- tier is checked; and no general update policy, so a member cannot write
-- their own coach_plan or mark their own intake answered.

create or replace function public.submit_nutrition_intake(
  p_goal text,
  p_body_weight_kg numeric default null,
  p_height_cm numeric default null,
  p_activity_level text default null,
  p_restrictions text default null,
  p_typical_day text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if public.tier_rank(v_uid) < 2 then
    raise exception 'Nutrition coaching is a Valhalla feature';
  end if;

  if coalesce(trim(p_goal), '') = '' then
    raise exception 'Tell the coach what you are after';
  end if;

  -- Checked here as well as by the unique index, so the person gets a
  -- sentence rather than a constraint-violation error string.
  if exists (
    select 1 from public.nutrition_intakes
    where user_id = v_uid and status in ('submitted', 'in_review')
  ) then
    raise exception 'You already have a plan being written. Withdraw it first if you want to start over.'
      using errcode = 'check_violation';
  end if;

  insert into public.nutrition_intakes (
    user_id, goal, body_weight_kg, height_cm, activity_level, restrictions, typical_day
  )
  values (
    v_uid,
    trim(p_goal),
    p_body_weight_kg,
    p_height_cm,
    nullif(trim(p_activity_level), ''),
    nullif(trim(p_restrictions), ''),
    nullif(trim(p_typical_day), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_nutrition_intake(text, numeric, numeric, text, text, text) from public, anon;
grant execute on function public.submit_nutrition_intake(text, numeric, numeric, text, text, text) to authenticated;

create or replace function public.admin_nutrition_queue(p_limit int default 50)
returns table (
  id uuid,
  email text,
  goal text,
  body_weight_kg numeric,
  height_cm numeric,
  activity_level text,
  restrictions text,
  typical_day text,
  status text,
  created_at timestamptz,
  answered_at timestamptz,
  coach_plan text,
  waiting_hours numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    i.id, u.email, i.goal, i.body_weight_kg, i.height_cm, i.activity_level,
    i.restrictions, i.typical_day, i.status, i.created_at, i.answered_at, i.coach_plan,
    round(extract(epoch from (coalesce(i.answered_at, now()) - i.created_at)) / 3600, 1)
  from public.nutrition_intakes i
  join auth.users u on u.id = i.user_id
  where i.status <> 'withdrawn'
  order by
    (i.status in ('submitted', 'in_review')) desc,
    i.created_at asc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;

revoke all on function public.admin_nutrition_queue(int) from public;
revoke all on function public.admin_nutrition_queue(int) from anon;
revoke all on function public.admin_nutrition_queue(int) from authenticated;
grant execute on function public.admin_nutrition_queue(int) to service_role;

-- Asserted, not assumed. This returns other people's email addresses and
-- what they eat; anon or authenticated holding execute would be a
-- cross-user leak reachable with the key that ships in the app. And
-- revoke-from-public alone does not remove anon's direct grant --
-- 20260827100000 found that the hard way.
do $$
begin
  if has_function_privilege('anon', 'public.admin_nutrition_queue(int)', 'execute') then
    raise exception 'admin_nutrition_queue is executable by anon -- it must not be';
  end if;
  if has_function_privilege('authenticated', 'public.admin_nutrition_queue(int)', 'execute') then
    raise exception 'admin_nutrition_queue is executable by authenticated -- it must not be';
  end if;
  if not has_function_privilege('service_role', 'public.admin_nutrition_queue(int)', 'execute') then
    raise exception 'admin_nutrition_queue is not executable by service_role';
  end if;
  if not has_function_privilege(
       'authenticated',
       'public.submit_nutrition_intake(text, numeric, numeric, text, text, text)',
       'execute') then
    raise exception 'submit_nutrition_intake is not callable by authenticated -- members cannot submit';
  end if;
  if has_function_privilege(
       'anon',
       'public.submit_nutrition_intake(text, numeric, numeric, text, text, text)',
       'execute') then
    raise exception 'submit_nutrition_intake is executable by anon -- it must not be';
  end if;
end $$;
