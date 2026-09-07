// Citadel Fitness — new article email
// Deploy with: supabase functions deploy send-newsletter-email --no-verify-jwt
//
// --no-verify-jwt is REQUIRED. Database Webhooks don't send a user JWT, so
// with the default verify_jwt=true the platform gateway rejects the request
// before this file ever runs and the webhook silently never fires. Auth is
// still enforced below via the x-webhook-secret header, which fails closed.
//
// Triggered by a Postgres trigger, not the dashboard's Database Webhooks
// UI: on_article_created (migration 20260101000028) calls this via pg_net
// on public.articles INSERT. Emails everyone who has turned on "Email me
// about new articles & app news" in Account -> Notifications — a real
// inbox email, separate from the in-app push notification the app already
// sends for the same event. Found stale during the 7 September email
// audit; functionally identical to a dashboard webhook, which is why
// nobody had noticed.
//
// The webhook must be configured with a custom HTTP header
// `x-webhook-secret: <WEBHOOK_SECRET>` so this endpoint can't be triggered
// by anyone who merely finds the URL; WEBHOOK_SECRET is a function secret
// you choose yourself (any long random string) and set on both sides.
// WEBHOOK_SECRET_NEXT is also accepted when set -- see _shared/webhook-auth.ts
// for why, and docs/rotate-webhook-secret.md for the rotation this enables.
//
// Sends one at a time in a loop — fine at this app's current scale, but if
// the recipient list ever grows large enough to risk the function's
// execution time limit, this should move to a queue instead.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { emailShell, emailButton } from '../_shared/email-template.ts';
import { isValidWebhookSecret } from '../_shared/webhook-auth.ts';

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

interface ArticleWebhookPayload {
  type: string;
  table: string;
  schema: string;
  record: { id: string; title: string; summary: string; category: string };
}

const CATEGORY_LABELS: Record<string, string> = {
  splits: 'Workout Splits',
  exercise: 'Exercise Guides',
  nutrition: 'Nutrition',
  recovery: 'Recovery',
  updates: 'App Updates',
};

interface Recipient {
  user_id: string;
  email: string;
}

Deno.serve(async (req) => {
  if (!isValidWebhookSecret(req.headers.get('x-webhook-secret'))) {
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
        subject: `New in ${CATEGORY_LABELS[article.category] ?? article.category}: ${article.title}`,
        html: emailShell(`
          <p style="margin:0 0 10px;display:inline-block;background-color:#FDEDE8;color:#FF5A36;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;padding:4px 12px;border-radius:999px;">${CATEGORY_LABELS[article.category] ?? article.category}</p>
          <p style="margin:0 0 12px;font-size:20px;font-weight:700;">${article.title}</p>
          <p style="margin:0;color:#4A5468;">${article.summary}</p>
          ${emailButton('https://demo.citadelfitness.app', 'Read on Citadel Fitness')}
          <p style="margin:0;color:#8A93A6;font-size:12px;">You're getting this because you turned on email updates in Account &rarr; Notifications. Turn it off there anytime.</p>
        `),
      }),
    });
    if (emailResponse.ok) sent += 1;
  }

  return json({ sent, total: recipients.length }, 200);
});
