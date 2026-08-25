import { supabase } from './supabase';

/** Postgres unique-violation code — a double-submit racing past the client-side guard. */
const UNIQUE_VIOLATION = '23505';

/** Which plan someone is waiting for. 'free' is not an option — there is nothing to wait for on the tier you already have. */
export type WaitlistTier = 'fortress' | 'valhalla';

export async function fetchFortressWaitlistStatus(
  userId: string,
): Promise<{ joined: boolean; email: string | undefined; tier: WaitlistTier | null }> {
  const { data, error } = await supabase
    .from('fortress_waitlist')
    .select('email, tier')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  // tier is null for anyone who joined before the plans existed. That is an
  // absence of a choice rather than a choice of Fortress, so it is passed
  // through as null instead of being defaulted on the way out.
  return { joined: !!data, email: data?.email, tier: (data?.tier as WaitlistTier | null) ?? null };
}

export async function joinFortressWaitlist(
  userId: string,
  email: string,
  tier: WaitlistTier,
): Promise<void> {
  const { error } = await supabase.from('fortress_waitlist').insert({ user_id: userId, email, tier });
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
