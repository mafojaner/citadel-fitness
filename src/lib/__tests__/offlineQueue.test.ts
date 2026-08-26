import {
  MAX_ATTEMPTS,
  backoffMs,
  dueItems,
  enqueueSave,
  isRetriableError,
  recordFailure,
  removeFromQueue,
  stalledItems,
  type PendingSave,
} from '../offlineQueue';

const save = (over: Partial<PendingSave> = {}): PendingSave => ({
  id: 'a',
  date: '2026-08-26',
  payload: {
    p_date: '2026-08-26',
    p_exercises: [],
    p_weight_unit: 'kg',
    p_distance_unit: 'km',
    p_logged_same_day: true,
  },
  queuedAt: 0,
  attempts: 0,
  ...over,
});

describe('enqueueSave', () => {
  it('collapses repeat saves of the same day to the last one', () => {
    // save_workout replaces a day wholesale, so of two queued saves for one
    // date only the later can survive. Keeping both would spend an attempt
    // writing a state the next item immediately overwrites.
    const first = save({ id: 'first' });
    const second = save({ id: 'second' });
    const queue = enqueueSave(enqueueSave([], first), second);

    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe('second');
  });

  it('keeps saves for different days side by side', () => {
    const monday = save({ id: 'mon', date: '2026-08-24' });
    const tuesday = save({ id: 'tue', date: '2026-08-25' });
    const queue = enqueueSave(enqueueSave([], monday), tuesday);

    expect(queue.map((q) => q.date)).toEqual(['2026-08-24', '2026-08-25']);
  });

  it('does not inherit the attempt count of what it replaces', () => {
    // A replacement is a different save. Starting it at four failed attempts
    // would put a long backoff on something that has never been tried.
    const tired = save({ id: 'old', attempts: 4, lastAttemptAt: 1_000, lastError: 'boom' });
    const fresh = save({ id: 'new' });
    const [only] = enqueueSave([tired], fresh);

    expect(only.id).toBe('new');
    expect(only.attempts).toBe(0);
    expect(only.lastAttemptAt).toBeUndefined();
    expect(only.lastError).toBeUndefined();
  });
});

describe('the payload', () => {
  it('carries same-day eligibility rather than recomputing it', () => {
    // The reason the payload is stored instead of rebuilt at flush time. A
    // workout logged tonight and synced tomorrow was still logged tonight,
    // and recomputing would silently take away the reward it earned.
    const queued = save({ payload: { ...save().payload, p_logged_same_day: true } });
    const [only] = enqueueSave([], queued);
    expect(only.payload.p_logged_same_day).toBe(true);
  });
});

describe('dueItems', () => {
  it('offers anything never attempted', () => {
    expect(dueItems([save()], 0)).toHaveLength(1);
  });

  it('holds an item back until its backoff has elapsed', () => {
    const failed = save({ attempts: 1, lastAttemptAt: 10_000 });
    const wait = backoffMs(1);

    expect(dueItems([failed], 10_000 + wait - 1)).toHaveLength(0);
    expect(dueItems([failed], 10_000 + wait)).toHaveLength(1);
  });

  it('stops offering an item once it has given up', () => {
    // Retrying forever turns one permanently rejected save into a request
    // every few minutes for the life of the install.
    const done = save({ attempts: MAX_ATTEMPTS, lastAttemptAt: 0 });
    expect(dueItems([done], Number.MAX_SAFE_INTEGER)).toHaveLength(0);
    expect(stalledItems([done])).toHaveLength(1);
  });

  it('keeps a stalled item rather than dropping it', () => {
    // It is still the person's workout. It needs a decision, not deletion.
    const done = save({ attempts: MAX_ATTEMPTS });
    expect(removeFromQueue([done], 'not-this-one')).toHaveLength(1);
  });
});

describe('backoffMs', () => {
  it('grows with each failure', () => {
    expect(backoffMs(1)).toBeGreaterThan(backoffMs(0));
    expect(backoffMs(3)).toBeGreaterThan(backoffMs(2));
  });

  it('caps, so a long-dead queue does not schedule itself days out', () => {
    expect(backoffMs(50)).toBe(backoffMs(6));
    expect(backoffMs(50)).toBeLessThanOrEqual(10 * 60_000);
  });
});

describe('recordFailure', () => {
  it('counts the attempt and remembers why', () => {
    const [only] = recordFailure([save()], 'a', 'Network request failed', 5_000);
    expect(only.attempts).toBe(1);
    expect(only.lastAttemptAt).toBe(5_000);
    expect(only.lastError).toBe('Network request failed');
  });

  it('leaves other items alone', () => {
    const queue = [save({ id: 'a' }), save({ id: 'b', date: '2026-08-25' })];
    const after = recordFailure(queue, 'a', 'boom', 1);
    expect(after.find((q) => q.id === 'b')?.attempts).toBe(0);
  });
});

describe('isRetriableError', () => {
  it('queues genuine network failures', () => {
    expect(isRetriableError(new Error('Network request failed'))).toBe(true);
    expect(isRetriableError(new Error('Failed to fetch'))).toBe(true);
    expect(isRetriableError({ message: 'connection reset' })).toBe(true);
    expect(isRetriableError({ status: 503, message: 'Service Unavailable' })).toBe(true);
  });

  it('refuses to queue what the server actually rejected', () => {
    // The distinguishing case for this whole feature. A permission denial or
    // a constraint violation fails identically forever, and retrying it every
    // few minutes hides a real bug behind a queue that never drains.
    expect(isRetriableError({ status: 403, message: 'forbidden' })).toBe(false);
    expect(isRetriableError({ code: '23505', message: 'duplicate key' })).toBe(false);
    expect(isRetriableError({ code: '42501', message: 'permission denied' })).toBe(false);
    expect(isRetriableError({ code: 'P0001', message: 'Personal records are a Fortress feature' })).toBe(
      false
    );
  });

  it('treats nothing as not worth retrying', () => {
    expect(isRetriableError(null)).toBe(false);
    expect(isRetriableError(undefined)).toBe(false);
  });
});
