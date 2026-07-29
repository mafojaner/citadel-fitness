import { supabase } from './supabase';

/** Postgres unique-violation code — a double-submit racing past the client-side guard. */
const UNIQUE_VIOLATION = '23505';

export async function fetchFortressWaitlistStatus(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('fortress_waitlist')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export async function joinFortressWaitlist(userId: string, email: string): Promise<void> {
  const { error } = await supabase.from('fortress_waitlist').insert({ user_id: userId, email });
  // Already on the list is a success, not a failure to surface.
  if (error && error.code !== UNIQUE_VIOLATION) throw error;
}
