// Citadel Fitness — new article email
// Deploy with: supabase functions deploy send-newsletter-email
//
// Triggered by a Supabase Database Webhook on public.articles INSERT (set
// up in the dashboard: Database -> Webhooks). Emails everyone who has
// turned on "Email me about new articles & app news" in Account ->
// Notifications — a real inbox email, separate from the in-app push
// notification the app already sends for the same event.
//
// The webhook must be configured with a custom HTTP header
// `x-webhook-secret: <WEBHOOK_SECRET>` so this endpoint can't be triggered
// by anyone who merely finds the URL; WEBHOOK_SECRET is a function secret
// you choose yourself (any long random string) and set on both sides.
//
// Sends one at a time in a loop — fine at this app's current scale, but if
// the recipient list ever grows large enough to risk the function's
// execution time limit, this should move to a queue instead.

import { createClient } from 'npm:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET')!;
const FROM_EMAIL = Deno.env.get('EMAIL_FROM') ?? 'Citadel Fitness <onboarding@resend.dev>';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface ArticleWebhookPayload {
  type: string;
  table: string;
  schema: string;
  record: { id: string; title: string; summary: string; category: string };
}

interface Recipient {
  user_id: string;
  email: string;
}

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const { record: article } = (await req.json()) as ArticleWebhookPayload;

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: recipients, error } = await adminClient.rpc('get_email_newsletter_recipients');
  if (error) return json({ error: error.message }, 500);
  if (!recipients || recipients.length === 0) return json({ sent: 0 }, 200);

  let sent = 0;
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
        subject: `New in ${article.category}: ${article.title}`,
        html: `
          <p>${article.summary}</p>
          <p>Open Citadel Fitness and check the Learn tab to read it.</p>
          <p style="color:#888;font-size:12px;">You're getting this because you turned on email updates in Account &rarr; Notifications. Turn it off there anytime.</p>
        `,
      }),
    });
    if (emailResponse.ok) sent += 1;
  }

  return json({ sent, total: recipients.length }, 200);
});
