// Citadel Fitness — account deletion
// Deploy with: supabase functions deploy delete-account
//
// Deleting an auth.users row requires the service-role key, which must
// never reach the client, so this has to run server-side. SUPABASE_URL,
// SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY are auto-injected into
// every Edge Function's environment — no manual secret setup needed.
//
// Every table that stores user data (profiles, workouts, logged_exercises,
// set_entries, article_favorites) already has "on delete cascade" back to
// auth.users, so deleting the user cleans up everything except their
// avatar file in storage, which isn't FK-linked and is removed explicitly
// below.

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

  const { data: files } = await adminClient.storage.from('avatars').list(user.id);
  if (files && files.length > 0) {
    await adminClient.storage.from('avatars').remove(files.map((f) => `${user.id}/${f.name}`));
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return json({ error: deleteError.message }, 500);
  }

  return json({ success: true }, 200);
});
