import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useOfflineQueueStore } from '../state/offlineQueueStore';

/** How often to retry while the app is open and something is waiting. */
const POLL_MS = 30_000;

/**
 * Drains the offline queue whenever there is a plausible reason it might
 * now succeed.
 *
 * Three triggers, because no single one is enough. On mount, so a queue that
 * was persisted through a restart goes out as soon as the app opens. On
 * return to the foreground, which is the usual moment signal comes back,
 * since the phone was in a pocket between the gym and the street. And on a
 * timer, for the case the app is left open while connectivity returns, where
 * neither of the other two ever fires.
 *
 * There is deliberately no connectivity library. A reachability flag has to
 * be believed, and it lies on captive portals and on networks that are up
 * but cannot route — the app would report itself online and the save would
 * fail anyway. Attempting the request is the only honest test of whether the
 * request can be made, and the backoff in offlineQueue keeps the cost of
 * being wrong small.
 */
export function useOfflineFlush() {
  const flush = useOfflineQueueStore((s) => s.flush);
  const pending = useOfflineQueueStore((s) => s.queue.length);

  useEffect(() => {
    if (pending === 0) return;

    flush();

    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') flush();
    });
    const timer = setInterval(flush, POLL_MS);

    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [flush, pending]);
}
