// Citadel Fitness — Fortress weekly digest
// Deploy with: supabase functions deploy send-weekly-digest --no-verify-jwt
//
// --no-verify-jwt is REQUIRED for the same reason as the other email
// functions: this is called by a scheduler, not a signed-in user, so there
// is no JWT to verify. Auth is the x-webhook-secret header below, which
// fails closed — a missing or wrong secret is rejected before any work.
//
// Unlike the welcome and newsletter functions this is time-triggered rather
// than database-triggered. See .github/workflows/weekly-digest.yml for the
// schedule; nothing in the database calls it.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { emailShell } from '../_shared/email-template.ts';
import {
  weeklyDigestBody,
  type FortressSummary,
} from '../_shared/weekly-digest-content.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')!;
const FROM_EMAIL = Deno.env.get('EMAIL_FROM') ?? 'Citadel Fitness <onboarding@resend.dev>';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface Recipient {
  user_id: string;
  email: string;
  name: string | null;
  weight_unit: string;
  days_logged: number;
  total_sets: number;
  total_volume_kg: number;
  top_category: string | null;
  /**
   * The Fortress half of the week, from the same function the Home card
   * reads. Null-tolerant throughout: a member with no program, no goal and
   * no group still gets a digest, it just has less in it.
   */
  fortress: FortressSummary | null;
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await admin.rpc('get_weekly_digest_recipients');

  if (error) {
    return json({ error: error.message }, 500);
  }

  const recipients = (data ?? []) as Recipient[];

  // A digest that says "you trained zero days" every week is how someone
  // who has lapsed decides to unsubscribe, and it isn't a recap of anything.
  // Silence is the kinder and more accurate message for an empty week.
  const active = recipients.filter((r) => r.days_logged > 0);

  let sent = 0;
  const failures: { email: string; error: string }[] = [];

  for (const recipient of active) {
    const html = emailShell(
      weeklyDigestBody({
        name: recipient.name,
        weightUnit: recipient.weight_unit,
        daysLogged: recipient.days_logged,
        totalSets: recipient.total_sets,
        totalVolumeKg: Number(recipient.total_volume_kg),
        topCategory: recipient.top_category,
        fortress: recipient.fortress ?? null,
      })
    );

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: recipient.email,
          subject: `Your week: ${recipient.days_logged} day${recipient.days_logged === 1 ? '' : 's'} trained`,
          html,
        }),
      });

      if (!response.ok) {
        failures.push({ email: recipient.email, error: await response.text() });
      } else {
        sent += 1;
      }
    } catch (err) {
      // One recipient's failure must not abandon the rest of the send.
      failures.push({ email: recipient.email, error: String(err) });
    }
  }

  return json(
    {
      considered: recipients.length,
      skippedInactive: recipients.length - active.length,
      sent,
      failed: failures.length,
      // Returned rather than only logged so a scheduled run's output says
      // what happened without needing to open the function logs.
      failures,
    },
    200
  );
});
