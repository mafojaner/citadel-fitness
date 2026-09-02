import { supabase } from './supabase';

export interface ProgramDayExercise {
  exerciseId: string;
  exerciseName: string;
  position: number;
  targetSets: number;
  targetReps: number;
}

export interface ProgramDay {
  id: string;
  position: number;
  name: string;
  exercises: ProgramDayExercise[];
}

export interface Program {
  id: string;
  slug: string;
  name: string;
  description: string;
  days: ProgramDay[];
}

export interface Enrollment {
  id: string;
  programId: string;
  startedOn: string;
  nextPosition: number;
}

interface DbDayExercise {
  exercise_id: string;
  position: number;
  target_sets: number;
  target_reps: number;
  exercises: { name: string } | null;
}

interface DbDay {
  id: string;
  position: number;
  name: string;
  program_day_exercises: DbDayExercise[];
}

interface DbProgram {
  id: string;
  slug: string;
  name: string;
  description: string;
  program_days: DbDay[];
}

/**
 * Every program with its full day/exercise tree in one request.
 *
 * Nested rather than three round trips because the whole catalogue is a few
 * dozen rows of shared reference data — the same reasoning that keeps
 * exercises a single fetch. Ordering is applied client-side: PostgREST can
 * order a nested relation, but not reliably across two levels of nesting,
 * and sorting a handful of rows here is cheaper than getting that wrong.
 */
export async function fetchPrograms(): Promise<Program[]> {
  const { data, error } = await supabase
    .from('programs')
    .select(
      'id, slug, name, description, program_days ( id, position, name, program_day_exercises ( exercise_id, position, target_sets, target_reps, exercises ( name ) ) )'
    )
    .returns<DbProgram[]>();

  if (error) throw error;

  return (data ?? [])
    .map((program) => ({
      id: program.id,
      slug: program.slug,
      name: program.name,
      description: program.description,
      days: [...program.program_days]
        .sort((a, b) => a.position - b.position)
        .map((day) => ({
          id: day.id,
          position: day.position,
          name: day.name,
          exercises: [...day.program_day_exercises]
            .sort((a, b) => a.position - b.position)
            .map((entry) => ({
              exerciseId: entry.exercise_id,
              exerciseName: entry.exercises?.name ?? 'Unknown exercise',
              position: entry.position,
              targetSets: entry.target_sets,
              targetReps: entry.target_reps,
            })),
        })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchEnrollment(userId: string): Promise<Enrollment | null> {
  const { data, error } = await supabase
    .from('program_enrollments')
    .select('id, program_id, started_on, next_position')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    programId: data.program_id,
    startedOn: data.started_on,
    nextPosition: data.next_position,
  };
}

export async function enrollInProgram(userId: string, programId: string): Promise<void> {
  // Upsert on the unique user_id: switching programs replaces the
  // enrollment and restarts the cycle, rather than failing on the
  // constraint or leaving two programs half-followed.
  const { error } = await supabase.from('program_enrollments').upsert(
    { user_id: userId, program_id: programId, next_position: 1, started_on: new Date().toISOString().slice(0, 10) },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
}

export async function leaveProgram(userId: string): Promise<void> {
  const { error } = await supabase.from('program_enrollments').delete().eq('user_id', userId);
  if (error) throw error;
}

/**
 * Moves to the next day in the cycle, wrapping at the end.
 *
 * Position rather than date arithmetic is what makes a missed week
 * harmless: the cycle is wherever training left it, so returning after a
 * break resumes the next session instead of skipping to whatever a
 * calendar would have prescribed.
 */
export function nextPositionAfter(current: number, cycleLength: number): number {
  if (cycleLength <= 0) return 1;
  return (current % cycleLength) + 1;
}

export async function advanceEnrollment(
  userId: string,
  current: number,
  cycleLength: number
): Promise<void> {
  const { error } = await supabase
    .from('program_enrollments')
    .update({ next_position: nextPositionAfter(current, cycleLength) })
    .eq('user_id', userId)
    // Only advance from where the caller thinks the cycle is.
    //
    // This used to write unconditionally, which was safe while advancing
    // happened in the same breath as reading the position. It is not safe
    // now that the advance waits for the workout to be saved: the draft can
    // sit for days, and if the program is switched or advanced by another
    // device in between, `current` is stale and an unguarded write would
    // move the cycle to a position derived from a program the user is no
    // longer on. With the guard a stale advance matches no row and does
    // nothing, which is the right outcome -- the session was still logged.
    .eq('next_position', current);
  if (error) throw error;
}

/** The day the enrollment currently points at, or null if the program has none. */
export function currentDay(program: Program | undefined, enrollment: Enrollment | null): ProgramDay | null {
  if (!program || !enrollment) return null;
  return program.days.find((d) => d.position === enrollment.nextPosition) ?? program.days[0] ?? null;
}
