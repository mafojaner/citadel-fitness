import { supabase } from './supabase';

/** Postgres unique-violation code — a double-submit racing past the client-side guard. */
const UNIQUE_VIOLATION = '23505';

export async function fetchFortressWaitlistStatus(
  userId: string,
): Promise<{ joined: boolean; email: string | undefined }> {
  const { data, error } = await supabase
    .from('fortress_waitlist')
    .select('email')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return { joined: !!data, email: data?.email };
}

export async function joinFortressWaitlist(userId: string, email: string): Promise<void> {
  const { error } = await supabase.from('fortress_waitlist').insert({ user_id: userId, email });
  // Already on the list is a success, not a failure to surface.
  if (error && error.code !== UNIQUE_VIOLATION) throw error;
}

/** Lets someone leave the waitlist, e.g. to correct a mistyped email by rejoining. */
export async function leaveFortressWaitlist(userId: string): Promise<void> {
  // Without a DELETE policy, RLS filters the row out of the delete entirely
  // rather than raising an error — Postgres reports that as success with
  // nothing affected. Requesting the deleted row back lets a genuine no-op
  // be told apart from an actual deletion.
  const { data, error } = await supabase
    .from('fortress_waitlist')
    .delete()
    .eq('user_id', userId)
    .select('user_id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("Couldn't leave the waitlist right now. Please try again.");
  }
}
