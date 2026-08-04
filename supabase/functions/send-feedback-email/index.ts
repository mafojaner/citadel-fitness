// Citadel Fitness — feedback email
// Deploy with: supabase functions deploy send-feedback-email
//
// Invoked directly by the client right after a feedback submission is
// saved to public.feedback, so the developer sees it by email immediately
// instead of needing to check the database. Identity comes from the
// caller's own JWT (same pattern as delete-account) — never a
// client-supplied id or email, so the "From" shown can't be spoofed.

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

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = Deno.env.get('EMAIL_FROM') ?? 'Citadel Fitness <onboarding@resend.dev>';
const FEEDBACK_TO = 'tumi.citadel@gmail.com';

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

  const { message } = await req.json();
  if (!message || typeof message !== 'string' || !message.trim()) {
    return json({ error: 'Message is required' }, 400);
  }

  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: FEEDBACK_TO,
      reply_to: user.email,
      subject: 'Citadel Fitness feedback',
      html: `
        <p><strong>From:</strong> ${user.email}</p>
        <p><strong>Message:</strong></p>
        <p>${message.trim().replace(/\n/g, '<br>')}</p>
      `,
    }),
  });

  if (!emailResponse.ok) {
    const detail = await emailResponse.text();
    return json({ error: 'Failed to send feedback email', detail }, 502);
  }

  return json({ success: true }, 200);
});
