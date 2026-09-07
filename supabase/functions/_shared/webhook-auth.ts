// Citadel Fitness — the webhook-secret gate, in one place.
//
// send-welcome-email, send-newsletter-email and send-weekly-digest each ran
// the same one-line check against `WEBHOOK_SECRET`, copied three times. That
// was fine until the secret had to be rotated: between changing the
// Supabase function secret and re-pointing every caller, every one of the
// three disagreed with its own trigger or scheduler and rejected real mail
// with a 401 that surfaces nowhere, because pg_net is fire-and-forget. See
// docs/rotate-webhook-secret.md for what that cost the first time.
//
// Accepting a second, temporary secret removes the window rather than
// living with it. During a rotation: publish the new value as
// WEBHOOK_SECRET_NEXT (both are now accepted), move every caller across at
// leisure, then promote WEBHOOK_SECRET_NEXT to WEBHOOK_SECRET and delete
// WEBHOOK_SECRET_NEXT. At every point in between, both the old and new
// value work, so there is no moment where a real trigger fires into a 401.
//
// A single shared function rather than three copies for the same reason
// requireAdmin is shared: three copies is how a fix lands in one file and
// not the other.

/**
 * True if `provided` matches WEBHOOK_SECRET or, when set, WEBHOOK_SECRET_NEXT.
 *
 * `provided` is typed as `string | null` because that's exactly what
 * `Request.headers.get()` returns -- callers pass that value straight
 * through rather than coercing it first, so a missing header can't
 * accidentally read as the empty string and get compared against an env var
 * that happens to also be unset.
 *
 * Both env vars are read fresh on every call rather than hoisted to module
 * constants like the single-secret version was. Harmless either way on a
 * platform that fixes a function's environment at deploy time; kept this
 * way so nothing about this file depends on that being true.
 */
export function isValidWebhookSecret(provided: string | null): boolean {
  if (!provided) return false;

  const current = Deno.env.get('WEBHOOK_SECRET');
  if (current && provided === current) return true;

  const next = Deno.env.get('WEBHOOK_SECRET_NEXT');
  if (next && provided === next) return true;

  return false;
}
