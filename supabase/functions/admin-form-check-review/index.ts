// Citadel Fitness — form check review queue (read + reply)
// Deploy with: supabase functions deploy admin-form-check-review
//
// The reviewer's end of form check. Same two-step auth as
// admin-dashboard-stats: verify the caller's own JWT with an anon-key
// client first, and only if their verified email matches ADMIN_EMAIL open a
// service-role client. Nothing about the page URL matters.
//
// Split from admin-dashboard-stats rather than folded into it because this
// one writes. The stats function is read-only and safe to call on every
// dashboard load; a function that can mark someone's submission reviewed
// should not share that path.

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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const adminEmail = Deno.env.get('ADMIN_EMAIL');

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await callerClient.auth.getUser();

  if (userError || !user) return json({ error: 'Invalid or expired session' }, 401);
  if (!adminEmail || user.email?.toLowerCase() !== adminEmail.toLowerCase()) {
    return json({ error: 'Not authorized' }, 403);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  // ---- Read the queue -----------------------------------------------------
  if (req.method === 'GET') {
    const { data, error } = await admin.rpc('admin_form_check_queue', { p_limit: 50 });
    if (error) return json({ error: error.message }, 500);

    type Row = { id: string; video_path: string; status: string };
    const rows = (data ?? []) as Row[];

    // A signed URL per row, issued here rather than stored on the row.
    // The bucket is private because these are videos of someone training in
    // their home; a URL that worked forever would be the same as a public
    // bucket the moment it is pasted into a ticket or a log.
    const withUrls = await Promise.all(
      rows.map(async (row) => {
        const { data: signed } = await admin.storage
          .from('form-checks')
          .createSignedUrl(row.video_path, 60 * 30);
        return { ...row, videoUrl: signed?.signedUrl ?? null };
      })
    );

    return json({ queue: withUrls, generatedAt: new Date().toISOString() }, 200);
  }

  // ---- Write a review -----------------------------------------------------
  if (req.method === 'POST') {
    let body: { id?: string; notes?: string; claim?: boolean };
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Malformed body' }, 400);
    }

    const id = String(body.id ?? '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Unusable submission id' }, 400);

    // Claiming is a separate, smaller action than replying: it tells the
    // member someone is actually watching, which is most of what they want
    // to know while waiting. Without it a submission sits on "waiting for a
    // coach" right up until the reply lands.
    if (body.claim) {
      const { error } = await admin
        .from('form_check_submissions')
        .update({ status: 'in_review' })
        .eq('id', id)
        .eq('status', 'submitted');
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, status: 'in_review' }, 200);
    }

    const notes = String(body.notes ?? '').trim();
    if (notes.length === 0) {
      // A review with no words is not a review. Marking one done without
      // saying anything would close the loop for the reviewer and leave the
      // member with nothing, which is worse than it still being open.
      return json({ error: 'A review needs notes' }, 400);
    }

    const { error } = await admin
      .from('form_check_submissions')
      .update({ status: 'reviewed', reviewer_notes: notes, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      // Not already reviewed, and not withdrawn. Replying to a submission
      // the member pulled would be answering something they took back.
      .in('status', ['submitted', 'in_review']);

    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, status: 'reviewed' }, 200);
  }

  return json({ error: 'Method not allowed' }, 405);
});
