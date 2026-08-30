// Citadel Fitness — nutrition coaching queue (read + reply)
// Deploy with: supabase functions deploy admin-nutrition-review
//
// The coach's end of nutrition coaching. Auth is the shared admin gate; see
// _shared/admin-auth.ts for why it lives there rather than being copied a
// third time.
//
// Separate from admin-dashboard-stats because this one writes, and separate
// from admin-form-check-review because they answer different tables with
// different rules -- a form check is capped monthly, a plan is one
// conversation at a time.

import { corsHeaders, json, requireAdmin } from '../_shared/admin-auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const gate = await requireAdmin(req);
  if ('refusal' in gate) return gate.refusal;
  const { admin } = gate;

  if (req.method === 'GET') {
    const { data, error } = await admin.rpc('admin_nutrition_queue', { p_limit: 50 });
    if (error) return json({ error: error.message }, 500);
    return json({ queue: data ?? [], generatedAt: new Date().toISOString() }, 200);
  }

  if (req.method === 'POST') {
    let body: { id?: string; plan?: string; claim?: boolean };
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Malformed body' }, 400);
    }

    const id = String(body.id ?? '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: 'Unusable intake id' }, 400);

    // Claiming says somebody has started, which is most of what a member
    // wants to know while waiting. Without it an intake reads as "waiting
    // for a coach" right up until the plan lands.
    if (body.claim) {
      const { error } = await admin
        .from('nutrition_intakes')
        .update({ status: 'in_review' })
        .eq('id', id)
        .eq('status', 'submitted');
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, status: 'in_review' }, 200);
    }

    const plan = String(body.plan ?? '').trim();
    if (plan.length === 0) {
      // Marking a plan answered with nothing written closes the loop for the
      // coach and leaves the member with an empty answer, which is worse
      // than it still being open.
      return json({ error: 'A plan needs to say something' }, 400);
    }

    const { error } = await admin
      .from('nutrition_intakes')
      .update({ status: 'answered', coach_plan: plan, answered_at: new Date().toISOString() })
      .eq('id', id)
      // Not one the member already withdrew, and not one already answered.
      .in('status', ['submitted', 'in_review']);

    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, status: 'answered' }, 200);
  }

  return json({ error: 'Method not allowed' }, 405);
});
