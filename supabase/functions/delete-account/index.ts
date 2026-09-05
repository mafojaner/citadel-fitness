// Citadel Fitness — account deletion
// Deploy with: supabase functions deploy delete-account
//
// Deleting an auth.users row requires the service-role key, which must
// never reach the client, so this has to run server-side. SUPABASE_URL,
// SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are auto-injected into
// every Edge Function's environment — no manual secret setup needed.
//
// Every table that stores user data has "on delete cascade" back to
// auth.users -- checked across every migration, not assumed from this
// comment, which listed five tables when there are now more than twenty.
//
// Storage is the exception and always will be: objects are not FK-linked,
// so nothing cascades to them and every bucket has to be cleared by name.
// There are two. Missing one is not a tidiness problem -- form-checks holds
// video of someone training at home, and leaving those files behind after
// an account is deleted makes the privacy policy and the Play data-deletion
// declaration untrue. Add to BUCKETS when a bucket is added.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Missing Authorization header' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Identity comes from verifying the caller's own JWT — never from a
  // client-supplied id — so there's no way to delete someone else's account.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser();

  if (userError || !user) {
    return json({ error: 'Invalid or expired session' }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Both buckets store objects under "{bucket}/{user_id}/...", so one loop
  // covers them. Cleared before the auth row, deliberately: if deleting the
  // user succeeded and this failed, the caller would be logged out of an
  // account that no longer exists and could never retry, leaving the files
  // stranded with nothing left to identify their owner.
  const BUCKETS = ['avatars', 'form-checks'];
  for (const bucket of BUCKETS) {
    const { data: files } = await adminClient.storage.from(bucket).list(user.id);
    if (files && files.length > 0) {
      const { error: removeError } = await adminClient.storage
        .from(bucket)
        .remove(files.map((f) => `${user.id}/${f.name}`));
      // Fail rather than continue. A partial delete that reports success is
      // how someone ends up believing their video is gone when it is not.
      if (removeError) {
        return json({ error: `Could not remove ${bucket}: ${removeError.message}` }, 500);
      }
    }
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return json({ error: deleteError.message }, 500);
  }

  return json({ success: true }, 200);
});
