// Citadel Fitness — live Sentry status for the developer dashboard
// Deploy with: supabase functions deploy admin-sentry-health
// Then set (in your own terminal, not through an assistant):
//   supabase secrets set SENTRY_AUTH_TOKEN=<your token> --project-ref ulyduorkvikeyxtpshoq
//
// Create the token at sentry.io -> Settings -> Developer Settings ->
// New Internal Integration, with Project: Read + Issue & Event: Read
// permissions. It's a credential — this function is the only thing that
// ever holds it; the dashboard page never sees it.
//
// Same two-step auth as admin-dashboard-stats: verify the caller's own JWT
// first, then only proceed if their verified email matches ADMIN_EMAIL.

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

// Not secret — this is the literal path segment in the project's own
// sentry.io URL, same as the "Inspect deployment" links Vercel prints to
// a terminal. Overridable in case the project ever moves.
const DEFAULT_SENTRY_ORG = 'reitumetse-mafojane';
const DEFAULT_SENTRY_PROJECT = 'citadel-fitness';

interface SentryIssue {
  id: string;
  shortId: string;
  title: string;
  culprit: string | null;
  permalink: string;
  level: string;
  status: string;
  count: string;
  userCount: number;
  firstSeen: string;
  lastSeen: string;
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
  const adminEmail = Deno.env.get('ADMIN_EMAIL');
  const sentryToken = Deno.env.get('SENTRY_AUTH_TOKEN');
  const sentryOrg = Deno.env.get('SENTRY_ORG') ?? DEFAULT_SENTRY_ORG;
  const sentryProject = Deno.env.get('SENTRY_PROJECT') ?? DEFAULT_SENTRY_PROJECT;

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

  if (!adminEmail || user.email?.toLowerCase() !== adminEmail.toLowerCase()) {
    return json({ error: 'Not authorized' }, 403);
  }

  // A missing token isn't a server error — it's an expected, common state
  // (nobody has connected Sentry yet). Reported as configured: false so the
  // dashboard can show "here's how to connect it" instead of a scary 500.
  if (!sentryToken) {
    return json({ configured: false }, 200);
  }

  try {
    // Sorted by frequency rather than recency: the point of this section is
    // "what's actually broken right now", which is what's still firing
    // repeatedly, not what happened to log an event most recently.
    const res = await fetch(
      `https://sentry.io/api/0/projects/${sentryOrg}/${sentryProject}/issues/?query=is:unresolved&sort=freq&limit=10`,
      { headers: { Authorization: `Bearer ${sentryToken}` } }
    );

    if (!res.ok) {
      const detail = await res.text();
      // Surfaces as configured:true so the dashboard shows the real error
      // rather than the "not connected" prompt — the token exists, something
      // else is wrong (revoked token, wrong org/project slug, etc.).
      return json({ configured: true, error: `Sentry returned ${res.status}: ${detail}` }, 200);
    }

    const issues = (await res.json()) as SentryIssue[];

    const unresolvedIssues = issues.map((issue) => ({
      shortId: issue.shortId,
      title: issue.title,
      culprit: issue.culprit,
      permalink: issue.permalink,
      level: issue.level,
      count: Number(issue.count),
      userCount: issue.userCount,
      lastSeen: issue.lastSeen,
    }));

    // Counts events across only the unresolved issues just fetched (top 10
    // by frequency), not a true all-time total — a resolved issue with a
    // huge historical count shouldn't make a currently-clean project look
    // unhealthy. Capped at what the query returned, so a project with more
    // than 10 distinct unresolved issues undercounts; the issue list below
    // it makes that visible rather than hiding behind a single number.
    const totalEvents = unresolvedIssues.reduce((sum, issue) => sum + issue.count, 0);

    return json(
      {
        configured: true,
        projectUrl: `https://${sentryOrg}.sentry.io/issues/?project=${sentryProject}`,
        unresolvedCount: unresolvedIssues.length,
        totalEvents,
        unresolvedIssues,
        generatedAt: new Date().toISOString(),
      },
      200
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ configured: true, error: message }, 200);
  }
});
