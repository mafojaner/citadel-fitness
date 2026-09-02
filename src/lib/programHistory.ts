import { supabase } from './supabase';

export interface ProgramSession {
  date: string;
  exercises: number;
  sets: number;
}

/**
 * What has actually been trained since enrolling.
 *
 * Derived from logged workouts rather than stored. A separate "sessions
 * completed" table would be a second record of something the workouts table
 * already knows, and the two would drift the first time a workout was edited
 * or deleted.
 */
export async function fetchProgramHistory(limit = 8): Promise<ProgramSession[]> {
  const { data, error } = await supabase.rpc('get_program_history', { p_limit: limit });
  if (error) throw error;
  return (data as ProgramSession[]) ?? [];
}

/**
 * Move the cycle deliberately.
 *
 * Separate from the automatic advance on purpose: that is bookkeeping the
 * app does for you and is guarded on the position it read, while this is a
 * person saying where they are, and should simply be believed.
 */
export async function setProgramPosition(position: number): Promise<void> {
  const { error } = await supabase.rpc('set_program_position', { p_position: position });
  if (error) throw error;
}
