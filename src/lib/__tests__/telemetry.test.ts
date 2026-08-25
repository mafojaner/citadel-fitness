/**
 * These tests exist to hold the privacy guarantees telemetry.ts claims, so
 * they can't be undone by a well-meaning edit later. The event taxonomy is
 * also what the Play Data Safety form has to describe, so a new event
 * appearing without a deliberate decision is itself the failure.
 */

// `mock`-prefixed by necessity: jest hoists the factory above these
// declarations, and only names matching /^mock/i may be referenced from it.
const mockCapture = jest.fn();
const mockIdentify = jest.fn();
const mockReset = jest.fn();
const mockScreen = jest.fn().mockResolvedValue(undefined);
const mockFlush = jest.fn().mockResolvedValue(undefined);
const mockConstruct = jest.fn();

jest.mock('posthog-react-native', () =>
  jest.fn().mockImplementation((apiKey: string, options: unknown) => {
    mockConstruct(apiKey, options);
    return {
      capture: mockCapture,
      identify: mockIdentify,
      reset: mockReset,
      screen: mockScreen,
      flush: mockFlush,
    };
  })
);

/** Re-imports telemetry.ts with a given env, since it reads config at module load. */
async function loadTelemetry(env: Record<string, string | undefined>) {
  jest.resetModules();
  const previous = { ...process.env };
  Object.assign(process.env, env);
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
  }
  // require, not dynamic import: jest runs these as CommonJS, and import()
  // needs --experimental-vm-modules to resolve here.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('../telemetry') as typeof import('../telemetry');
  process.env = previous;
  return mod;
}

beforeEach(() => {
  [mockCapture, mockIdentify, mockReset, mockScreen, mockFlush, mockConstruct].forEach((m) => m.mockClear());
});

describe('without an API key', () => {
  const env = { EXPO_PUBLIC_POSTHOG_KEY: undefined, EXPO_PUBLIC_POSTHOG_HOST: undefined };

  it('reports itself unconfigured and never constructs a client', async () => {
    const t = await loadTelemetry(env);
    expect(t.isTelemetryConfigured).toBe(false);
    expect(mockConstruct).not.toHaveBeenCalled();
  });

  it('makes every entry point a silent no-op rather than throwing', async () => {
    // A build that forgets the key must degrade to silence, not crash on
    // the first screen change.
    const t = await loadTelemetry(env);
    expect(() => t.identifyUser('user-1')).not.toThrow();
    expect(() => t.trackEvent({ name: 'onboarding_completed' })).not.toThrow();
    expect(() => t.trackScreen('Home')).not.toThrow();
    expect(() => t.resetTelemetryIdentity()).not.toThrow();
    await expect(t.flushTelemetry()).resolves.toBeUndefined();
    expect(mockCapture).not.toHaveBeenCalled();
    expect(mockScreen).not.toHaveBeenCalled();
  });
});

describe('with an API key', () => {
  const env = { EXPO_PUBLIC_POSTHOG_KEY: 'phc_test', EXPO_PUBLIC_POSTHOG_HOST: undefined };

  it('defaults to the EU host, matching where Supabase and Sentry keep data', async () => {
    await loadTelemetry(env);
    expect(mockConstruct).toHaveBeenCalledWith('phc_test', expect.objectContaining({
      host: 'https://eu.i.posthog.com',
    }));
  });

  it('honours an explicit host override', async () => {
    await loadTelemetry({ ...env, EXPO_PUBLIC_POSTHOG_HOST: 'https://us.i.posthog.com' });
    expect(mockConstruct).toHaveBeenCalledWith('phc_test', expect.objectContaining({
      host: 'https://us.i.posthog.com',
    }));
  });

  it('keeps session replay off', async () => {
    // This app's screens show workout history and body-weight figures.
    await loadTelemetry(env);
    expect(mockConstruct).toHaveBeenCalledWith('phc_test', expect.objectContaining({
      enableSessionReplay: false,
    }));
  });

  it('identifies with the user id alone, sending no traits', async () => {
    const t = await loadTelemetry(env);
    t.identifyUser('user-123');
    expect(mockIdentify).toHaveBeenCalledWith('user-123');
    // A second argument here would be user properties — the vector by which
    // an email or name would reach PostHog.
    expect(mockIdentify.mock.calls[0]).toHaveLength(1);
  });

  it('resets identity on sign-out', async () => {
    const t = await loadTelemetry(env);
    t.resetTelemetryIdentity();
    expect(mockReset).toHaveBeenCalled();
  });

  it('sends events with only their declared properties', async () => {
    const t = await loadTelemetry(env);
    t.trackEvent({ name: 'workout_logged', properties: { exerciseCount: 3, isBackdated: false } });
    expect(mockCapture).toHaveBeenCalledWith('workout_logged', { exerciseCount: 3, isBackdated: false });
  });

  it('sends no properties for events that declare none', async () => {
    // Was fortress_waitlist_joined until that event gained a tier. Moved to
    // onboarding_completed rather than deleted: "an event with no properties
    // sends undefined, not an empty object" is still a rule worth holding.
    const t = await loadTelemetry(env);
    t.trackEvent({ name: 'onboarding_completed' });
    expect(mockCapture).toHaveBeenCalledWith('onboarding_completed', undefined);
  });

  it('records which plan a waitlist signup chose, and never the email', async () => {
    // The tier is the only reason this event earns its place — it answers
    // how many people want the coached plan, which is the one with a
    // capacity cap. The email is the one value in that flow that must never
    // reach telemetry, so the assertion is on the whole payload rather than
    // just the tier: an extra field would slip past a narrower check.
    const t = await loadTelemetry(env);
    t.trackEvent({ name: 'fortress_waitlist_joined', properties: { tier: 'valhalla' } });
    expect(mockCapture).toHaveBeenCalledWith('fortress_waitlist_joined', { tier: 'valhalla' });
  });
});

describe('screen tracking', () => {
  const env = { EXPO_PUBLIC_POSTHOG_KEY: 'phc_test', EXPO_PUBLIC_POSTHOG_HOST: undefined };

  it('records a screen view', async () => {
    const t = await loadTelemetry(env);
    t.trackScreen('Home');
    expect(mockScreen).toHaveBeenCalledWith('Home');
  });

  it('drops repeats of the current screen', async () => {
    // onStateChange fires for changes that don't move the user — a tab
    // re-press, a param update — and each would otherwise be a screen view.
    const t = await loadTelemetry(env);
    t.trackScreen('Home');
    t.trackScreen('Home');
    t.trackScreen('Home');
    expect(mockScreen).toHaveBeenCalledTimes(1);
  });

  it('records a genuine change, and a return to a previous screen', async () => {
    const t = await loadTelemetry(env);
    t.trackScreen('Home');
    t.trackScreen('Workouts');
    t.trackScreen('Home');
    expect(mockScreen.mock.calls.map((c) => c[0])).toEqual(['Home', 'Workouts', 'Home']);
  });

  it('clears the dedupe on sign-out, so the next session records its first screen', async () => {
    const t = await loadTelemetry(env);
    t.trackScreen('Home');
    t.resetTelemetryIdentity();
    t.trackScreen('Home');
    expect(mockScreen).toHaveBeenCalledTimes(2);
  });
});
