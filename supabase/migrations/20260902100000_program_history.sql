-- Let a member move their program cycle deliberately, and see what they have
-- actually done against it.
--
-- The cycle now advances only when a session saves, which fixed the silent
-- skipping. What is still missing is the other direction: a member who trains
-- out of order, or misses a week, has no way to tell the program so. The only
-- control is "leave", which throws the whole enrolment away.
--
-- `set_program_position` is the deliberate move. It is not the same thing as
-- the automatic advance and is kept separate on purpose: that one is
-- bookkeeping the app does for you and is guarded on the position it read,
-- while this one is a person saying where they are and should simply be
-- believed.
create or replace function public.set_program_position(p_position int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_program uuid;
  v_days int;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if public.tier_rank(v_uid) < 1 then
    raise exception 'Structured programs are a Fortress feature';
  end if;

  select en.program_id into v_program
  from public.program_enrollments en
  where en.user_id = v_uid;

  if v_program is null then
    raise exception 'Not enrolled in a program';
  end if;

  select count(*) into v_days from public.program_days d where d.program_id = v_program;

  -- Range-checked against the enrolled program rather than trusted. A
  -- position past the end of the cycle would leave currentDay resolving to
  -- nothing, and the screen would show an enrolment with no next session --
  -- which reads as the feature being broken rather than as bad input.
  if p_position < 1 or p_position > v_days then
    raise exception 'Day % is outside this program (1-%)', p_position, v_days;
  end if;

  update public.program_enrollments
  set next_position = p_position
  where user_id = v_uid;
end;
$$;

revoke all on function public.set_program_position(int) from public;
revoke all on function public.set_program_position(int) from anon;
grant execute on function public.set_program_position(int) to authenticated;

-- ---------------------------------------------------------------------
-- What has actually been trained against the program.
--
-- Derived from logged workouts since enrolment rather than stored. A
-- separate "sessions completed" table would be a second record of something
-- the workouts table already knows, and the two would drift the first time a
-- workout was edited or deleted.
create or replace function public.get_program_history(p_limit int default 8)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_started date;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if public.tier_rank(v_uid) < 1 then
    raise exception 'Structured programs are a Fortress feature';
  end if;

  select en.started_on into v_started
  from public.program_enrollments en
  where en.user_id = v_uid;

  if v_started is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(h order by h.date desc)
    from (
      select
        w.date,
        count(distinct le.exercise_id) as exercises,
        count(se.id) as sets
      from public.workouts w
      join public.logged_exercises le on le.workout_id = w.id
      left join public.set_entries se on se.logged_exercise_id = le.id
      where w.user_id = v_uid
        and w.date >= v_started
      group by w.date
      order by w.date desc
      limit greatest(p_limit, 1)
    ) h
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.get_program_history(int) from public;
revoke all on function public.get_program_history(int) from anon;
grant execute on function public.get_program_history(int) to authenticated;
