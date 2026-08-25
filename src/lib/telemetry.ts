import PostHog from 'posthog-react-native';

/**
 * Product telemetry — which screens get used and whether people finish the
 * flows that matter. Deliberately *not* named "analytics": analytics.ts is
 * the user-facing workout statistics (streaks, volume, progress charts),
 * and conflating the two would be a lasting source of confusion.
 *
 * Three rules this module exists to enforce, rather than leaving to each
 * call site to remember:
 *
 * 1. No personally identifying data ever leaves the device. The only
 *    identifier sent is the Supabase user id, which PostHog receives as an
 *    opaque string. Never an email, name, avatar URL, or anything typed
 *    into a form. TrackedEvent's property types are narrow on purpose —
 *    adding a field means deciding, at review time, that it's safe.
 * 2. Nothing is captured automatically. Autocapture and session replay are
 *    off, so a screen showing someone's workout history can't be recorded
 *    by accident. Every event below is one somebody chose to send.
 * 3. It is inert unless configured. Same shape as sentry.ts: no key, no
 *    client, no network calls — so local dev, tests and CI never talk to
 *    PostHog, and a build that forgets the key degrades to silence rather
 *    than crashing.
 */

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;

/**
 * EU region by default, matching where the rest of the stack already keeps
 * data: Supabase is eu-west-1 and Sentry ingests via its German endpoint.
 * Sending product telemetry to the US while everything else stays in the EU
 * would undermine that for no benefit.
 */
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

/**
 * The complete set of events this app sends. A closed union rather than a
 * free-form string: it keeps the taxonomy from drifting into
 * `workout_saved` / `workoutSaved` / `save_workout` variants that quietly
 * split one funnel across three names, and it makes the full list of what
 * we collect reviewable in one place — which is what the Play Data Safety
 * form and the privacy policy have to describe.
 */
export type TrackedEvent =
  | { name: 'onboarding_completed'; properties?: undefined }
  | { name: 'workout_logged'; properties: { exerciseCount: number; isBackdated: boolean } }
  // The tier is the whole reason this event is worth having: it answers how
  // many people want the coached plan, which is the one with a capacity cap
  // and so the one whose demand has to be known before it goes on sale. The
  // submitted email stays out — it is the only thing in this flow that
  // telemetry must never see.
  | { name: 'fortress_waitlist_joined'; properties: { tier: 'fortress' | 'valhalla' } }
  | { name: 'water_logged'; properties: { source: 'preset' | 'custom' } };

export const isTelemetryConfigured = Boolean(apiKey);

const client = apiKey
  ? new PostHog(apiKey, {
      host,
      // Off by choice, not by default. This app's screens show workout
      // history and body-weight figures; replay would capture them.
      enableSessionReplay: false,
      // Install/update/open/background. No user content, and it's the only
      // way to tell "nobody opened the app" from "nobody logged a workout".
      captureAppLifecycleEvents: true,
    })
  : null;

/**
 * Ties subsequent events to a user. Called with the Supabase user id and
 * nothing else — no traits — so PostHog holds an opaque identifier it
 * cannot resolve to a person on its own.
 */
export function identifyUser(userId: string): void {
  client?.identify(userId);
}

/** Call on sign-out so the next person on the device starts a fresh identity. */
export function resetTelemetryIdentity(): void {
  client?.reset();
  // Otherwise the first screen after signing back in is swallowed as a
  // duplicate of whatever was on screen when the previous session ended.
  lastScreen = null;
}

export function trackEvent(event: TrackedEvent): void {
  client?.capture(event.name, event.properties);
}

/**
 * Screen views. Takes the route name from the navigator, never the route
 * params — params carry dates and ids, and a workout date is exactly the
 * kind of thing that shouldn't leave the device.
 *
 * Deduped here rather than in the navigator: React Navigation fires
 * onStateChange for any state change, including ones that don't move the
 * user (a tab re-press, a param update), and the caller shouldn't have to
 * hold a ref to filter those out. Module scope, not component state, so
 * the navigator stays a pure render.
 */
let lastScreen: string | null = null;

export function trackScreen(routeName: string): void {
  if (routeName === lastScreen) return;
  lastScreen = routeName;
  void client?.screen(routeName);
}

/**
 * Best-effort delivery of anything still queued. Useful before sign-out,
 * where the identity is about to be reset out from under pending events.
 */
export async function flushTelemetry(): Promise<void> {
  await client?.flush().catch(() => {
    // Losing a queued event is not worth surfacing to the user or Sentry.
  });
}
