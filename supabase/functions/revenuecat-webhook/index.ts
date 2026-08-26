// Citadel Fitness — RevenueCat entitlement webhook
// Deploy with: supabase functions deploy revenuecat-webhook --no-verify-jwt
//
// --no-verify-jwt is required for the same reason as the email functions:
// RevenueCat calls this, not a signed-in user, so there is no JWT to verify.
// Auth is the Authorization header below, set in RevenueCat's dashboard, and
// it fails closed — a missing or wrong value is rejected before any work.
//
// This is the only thing in the system that can grant a paid tier. The app
// cannot: `subscriptions` has no insert or update policy, and
// profiles.membership_tier had client writes revoked by column privilege in
// 20260817120000. Everything below is written on the assumption that a
// mistake here is the difference between selling a subscription and giving
// it away.

import { createClient } from 'npm:@supabase/supabase-js@2';

const WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * Which product grants which tier.
 *
 * Explicit rather than parsed out of the product id. A rule like "contains
 * valhalla" would hand the top tier to any product someone later names
 * carelessly in a store console, and the store console is not in this repo
 * or in review. An unknown product grants nothing.
 */
const PRODUCT_TIERS: Record<string, 'fortress' | 'valhalla'> = {
  fortress_monthly: 'fortress',
  fortress_annual: 'fortress',
  valhalla_monthly: 'valhalla',
  valhalla_annual: 'valhalla',
};

/**
 * RevenueCat event type to subscription status.
 *
 * Anything not listed is ignored rather than guessed at. RevenueCat adds
 * event types over time, and defaulting an unrecognised one to either
 * 'active' or 'expired' would be inventing an entitlement decision from a
 * message this code has never seen.
 */
const EVENT_STATUS: Record<string, 'active' | 'grace' | 'paused' | 'expired' | 'refunded'> = {
  INITIAL_PURCHASE: 'active',
  RENEWAL: 'active',
  PRODUCT_CHANGE: 'active',
  UNCANCELLATION: 'active',
  NON_RENEWING_PURCHASE: 'active',
  // Cancellation means "will not renew", not "access ends now" — the period
  // already paid for still runs, and current_period_end is what ends it.
  CANCELLATION: 'active',
  BILLING_ISSUE: 'grace',
  SUBSCRIPTION_PAUSED: 'paused',
  EXPIRATION: 'expired',
  REFUND: 'refunded',
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  // Compared before anything is read or parsed. RevenueCat sends this as a
  // bearer-style value configured in its dashboard.
  if (req.headers.get('Authorization') !== WEBHOOK_SECRET) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let body: { event?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Malformed body' }, 400);
  }

  const event = body.event;
  if (!event) return json({ error: 'No event' }, 400);

  const type = String(event.type ?? '');
  const userId = String(event.app_user_id ?? '');
  const productId = String(event.product_id ?? '');

  // app_user_id is the Supabase user id, set by the client when it identifies
  // with RevenueCat. If it is not a uuid this event is not about an account
  // this system knows, and writing it would create an orphan row.
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    return json({ error: 'Unusable app_user_id' }, 400);
  }

  const status = EVENT_STATUS[type];
  const tier = PRODUCT_TIERS[productId];

  // 200 rather than an error for both: RevenueCat retries non-2xx, and an
  // event this system deliberately ignores would be retried forever. The
  // response says what happened so it is visible in their dashboard.
  if (!status) return json({ ignored: `Unhandled event type: ${type}` }, 200);
  if (!tier) return json({ ignored: `Unknown product: ${productId}` }, 200);

  const eventAt = new Date(Number(event.event_timestamp_ms ?? Date.now()));
  const periodEnd = event.expiration_at_ms ? new Date(Number(event.expiration_at_ms)) : null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Ordering guard. Webhook delivery is neither ordered nor exactly-once, so
  // a cancellation emitted before a renewal can arrive after it. Applying
  // that blindly would revoke a subscription that had just been renewed.
  // Reading first and comparing is a race in theory; the where-clause below
  // is what actually enforces it.
  const { data: existing, error: readError } = await supabase
    .from('subscriptions')
    .select('event_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (readError) return json({ error: readError.message }, 500);

  if (existing && new Date(existing.event_at) >= eventAt) {
    return json({ ignored: 'Older than the stored event' }, 200);
  }

  const row = {
    user_id: userId,
    provider: 'revenuecat',
    product_id: productId,
    tier,
    status,
    current_period_end: periodEnd?.toISOString() ?? null,
    event_at: eventAt.toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error: writeError } = existing
    ? // The where-clause repeats the ordering check, so two events racing
      // cannot both win: the older one matches no row and writes nothing.
      await supabase.from('subscriptions').update(row).eq('user_id', userId).lt('event_at', row.event_at)
    : await supabase.from('subscriptions').insert(row);

  if (writeError) return json({ error: writeError.message }, 500);

  return json({ ok: true, tier, status }, 200);
});
