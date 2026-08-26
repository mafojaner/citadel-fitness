/**
 * The offline write queue.
 *
 * Pure logic, no storage and no network, so the parts that decide whether
 * data survives can be tested without either. The store in
 * state/offlineQueueStore.ts persists what these functions return; the
 * flusher hands each item back to Supabase.
 *
 * Only workout saves are queued. They are the one write someone makes with
 * their phone in a gym basement, and the only one where losing the attempt
 * loses work they cannot reconstruct. Water taps and preference toggles are
 * cheap to repeat and are left to fail loudly.
 */

/** Exactly what `save_workout` takes, captured at the moment of saving. */
export interface QueuedWorkoutPayload {
  p_date: string;
  p_exercises: unknown;
  p_weight_unit: string;
  p_distance_unit: string;
  /**
   * Whether this counted as logged on the day itself.
   *
   * Captured when the person hit save rather than recomputed at flush time,
   * which is the whole reason the payload is stored rather than rebuilt. A
   * workout logged tonight in a basement and synced tomorrow morning was
   * still logged on the night, and recomputing would quietly take away the
   * reward eligibility they earned. See save_workout, which only honours
   * this on first creation of a day.
   */
  p_logged_same_day: boolean;
}

export interface PendingSave {
  id: string;
  /** The conflict key: save_workout replaces a whole day at a time. */
  date: string;
  payload: QueuedWorkoutPayload;
  queuedAt: number;
  attempts: number;
  /** When the last attempt failed, so backoff can be measured from it. */
  lastAttemptAt?: number;
  lastError?: string;
}

/**
 * After this many failures an item stops being retried automatically.
 *
 * A queue that retries forever turns one permanently rejected save into a
 * request every few minutes for the life of the install. The item is kept,
 * not dropped — it is still the person's workout — but it needs a human
 * decision rather than another attempt.
 */
export const MAX_ATTEMPTS = 6;

/** Exponential, capped. Doubling without a cap reaches days after a dozen failures. */
export function backoffMs(attempts: number): number {
  const base = 5_000;
  const capped = Math.min(attempts, 6);
  return Math.min(base * 2 ** capped, 10 * 60_000);
}

/**
 * Add a save, replacing any already queued for the same day.
 *
 * This is the conflict rule, and it falls out of how the server already
 * works: `save_workout` replaces a day wholesale, so of two queued saves for
 * the same date only the later one can survive anyway. Collapsing here means
 * the queue does not spend attempts writing a state that the next item
 * immediately overwrites, and someone who edits the same day four times
 * offline syncs once rather than four times.
 *
 * The replacement inherits nothing from what it replaces — not the attempt
 * count, not the error. It is a different save, and starting it at four
 * failed attempts would apply a long backoff to something that has never
 * been tried.
 */
export function enqueueSave(queue: PendingSave[], item: PendingSave): PendingSave[] {
  return [...queue.filter((q) => q.date !== item.date), item];
}

export function removeFromQueue(queue: PendingSave[], id: string): PendingSave[] {
  return queue.filter((q) => q.id !== id);
}

/** Record a failed attempt, so backoff and the attempt cap can see it. */
export function recordFailure(
  queue: PendingSave[],
  id: string,
  error: string,
  now: number
): PendingSave[] {
  return queue.map((q) =>
    q.id === id ? { ...q, attempts: q.attempts + 1, lastAttemptAt: now, lastError: error } : q
  );
}

/** Items worth trying right now: never attempted, or past their backoff. */
export function dueItems(queue: PendingSave[], now: number): PendingSave[] {
  return queue.filter((q) => {
    if (q.attempts >= MAX_ATTEMPTS) return false;
    if (q.lastAttemptAt === undefined) return true;
    return now - q.lastAttemptAt >= backoffMs(q.attempts);
  });
}

/** Items that have given up and need a person to look at them. */
export function stalledItems(queue: PendingSave[]): PendingSave[] {
  return queue.filter((q) => q.attempts >= MAX_ATTEMPTS);
}

/**
 * Whether a failure looks like "no network" rather than "the server said no".
 *
 * Only the first should be queued and retried. A validation error or a
 * permission denial will fail identically forever, and retrying it every few
 * minutes hides a real bug behind a queue that never drains.
 *
 * Matched on shape rather than message text where possible: PostgREST sets a
 * code for anything it actually processed, so an error with no code at all
 * never reached the server.
 */
export function isRetriableError(error: unknown): boolean {
  if (!error) return false;
  const e = error as { code?: string; message?: string; status?: number };

  // The server answered, with a complaint. Retrying changes nothing.
  if (typeof e.status === 'number' && e.status >= 400 && e.status < 500) return false;
  if (e.code && !/^(0|5)/.test(e.code)) return false;

  const message = (e.message ?? String(error)).toLowerCase();
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('timeout') ||
    message.includes('offline') ||
    message.includes('connection') ||
    // A 5xx is the server failing rather than refusing, which a later
    // attempt can legitimately succeed at.
    (typeof e.status === 'number' && e.status >= 500)
  );
}
