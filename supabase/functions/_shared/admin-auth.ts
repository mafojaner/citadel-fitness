// Citadel Fitness — the admin gate, in one place.
//
// Three functions now need the same two-step check: verify the caller's own
// JWT with an anon-key client, and only if their verified email matches
// ADMIN_EMAIL open a service-role client. It was copied twice before this
// existed, which is how a security check ends up fixed in one file and not
// the other -- the same drift that let the weekly digest entitle a
// different set of people than every other feature.
//
// Identity comes from verifying the token, never from anything
// client-supplied, and nothing about the page URL matters.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Returns a service-role client if the caller is the admin, or a Response to
 * send back if they are not.
 *
 * Deliberately returns the refusal rather than throwing: a caller that
 * forgets to handle the error path gets a type error, where a thrown
 * exception would be caught by a generic handler somewhere and turned into
 * a 500 that looks like a bug rather than a refusal.
 */
export async function requireAdmin(
  req: Request
): Promise<{ admin: SupabaseClient } | { refusal: Response }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return { refusal: json({ error: 'Missing Authorization header' }, 401) };

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminEmail = Deno.env.get('ADMIN_EMAIL');

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error,
  } = await callerClient.auth.getUser();

  if (error || !user) return { refusal: json({ error: 'Invalid or expired session' }, 401) };

  // Fails closed on an unset secret: without this an environment that has
  // forgotten ADMIN_EMAIL would let the first signed-in caller through.
  if (!adminEmail || user.email?.toLowerCase() !== adminEmail.toLowerCase()) {
    return { refusal: json({ error: 'Not authorized' }, 403) };
  }

  return { admin: createClient(supabaseUrl, serviceRoleKey) };
}
