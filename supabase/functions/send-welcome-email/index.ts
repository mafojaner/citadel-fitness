// Citadel Fitness — welcome email
// Deploy with: supabase functions deploy send-welcome-email
//
// Triggered by a Supabase Database Webhook on auth.users UPDATE (set up in
// the dashboard: Database -> Webhooks). Fires a one-time welcome email the
// moment a new account's email is confirmed for the first time — not on
// every subsequent login.
//
// The webhook must be configured with a custom HTTP header
// `x-webhook-secret: <WEBHOOK_SECRET>` so this endpoint can't be triggered
// by anyone who merely finds the URL; WEBHOOK_SECRET is a function secret
// you choose yourself (any long random string) and set on both sides.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')!;
const FROM_EMAIL = Deno.env.get('EMAIL_FROM') ?? 'Citadel Fitness <onboarding@resend.dev>';

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface AuthUserWebhookPayload {
  type: string;
  table: string;
  schema: string;
  record: {
    id: string;
    email: string;
    email_confirmed_at: string | null;
    raw_user_meta_data?: Record<string, unknown>;
  };
  old_record: { email_confirmed_at: string | null } | null;
}

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const payload = (await req.json()) as AuthUserWebhookPayload;

  const justConfirmed =
    payload.old_record?.email_confirmed_at == null && payload.record.email_confirmed_at != null;

  if (!justConfirmed) {
    // Every other auth.users update (password change, metadata edit, etc.)
    // lands here too — not an error, just nothing to send.
    return json({ skipped: true }, 200);
  }

  const name =
    (payload.record.raw_user_meta_data?.name as string | undefined) ||
    payload.record.email.split('@')[0];

  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: payload.record.email,
      subject: 'Welcome to Citadel Fitness',
      html: `
        <p>Hey ${name},</p>
        <p>Your account's confirmed — you're ready to log your first workout.</p>
        <p>Open the app, tap <strong>Log workout</strong>, and pick your first exercise from the catalogue. Everything you log builds your streak on the Activity tab.</p>
        <p>&mdash; The Citadel Fitness team</p>
      `,
    }),
  });

  if (!emailResponse.ok) {
    const detail = await emailResponse.text();
    return json({ error: 'Failed to send welcome email', detail }, 502);
  }

  return json({ success: true }, 200);
});
