// Citadel Fitness — one-off backfill: welcome email for existing confirmed
// users who signed up before this system worked (email delivery was
// broken until EMAIL_FROM was set correctly).
//
// Deployed normally (JWT verification ON, the default) — unlike
// send-welcome-email, nothing calls this except a direct
// `supabase functions invoke`, which already carries a valid platform JWT
// automatically. No custom webhook secret needed for that reason.
//
// Safe to re-run: get_users_needing_welcome_email() only ever returns
// users whose welcome_email_sent_at is still null, and this function sets
// that column immediately after each successful send — same column
// send-welcome-email itself now sets, so the two paths can never
// double-send to the same person.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { emailShell } from '../_shared/email-template.ts';
import { welcomeEmailBody } from '../_shared/welcome-email-content.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = Deno.env.get('EMAIL_FROM') ?? 'Citadel Fitness <onboarding@resend.dev>';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface Recipient {
  user_id: string;
  email: string;
  name: string;
}

Deno.serve(async (_req) => {
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: recipients, error } = await adminClient.rpc('get_users_needing_welcome_email');
  if (error) return json({ error: error.message }, 500);
  if (!recipients || recipients.length === 0) {
    return json({ sent: 0, failed: 0, total: 0 }, 200);
  }

  let sent = 0;
  const failures: { email: string; detail: string }[] = [];

  for (const recipient of recipients as Recipient[]) {
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: recipient.email,
        subject: 'Welcome to Citadel Fitness',
        html: emailShell(welcomeEmailBody(recipient.name)),
      }),
    });

    if (emailResponse.ok) {
      sent += 1;
      await adminClient
        .from('profiles')
        .update({ welcome_email_sent_at: new Date().toISOString() })
        .eq('id', recipient.user_id);
    } else {
      failures.push({ email: recipient.email, detail: await emailResponse.text() });
    }
  }

  return json({ sent, failed: failures.length, total: recipients.length, failures }, 200);
});
