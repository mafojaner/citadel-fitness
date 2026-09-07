import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { fetchActivityFeed, type DayActivity } from '../lib/activityFeed';
import { addDays, todayISO } from '../lib/analytics';
import { tierAllows } from '../lib/membership';
import { useAuthStore } from '../state/authStore';
import { useMembershipTier } from './useMembership';

/**
 * How far back the feed reaches on one load.
 *
 * Bounded rather than "everything", because the range is what keeps the
 * workouts half to two queries however long the history gets. Ninety days is
 * a season of training: enough to scroll without paging, short enough that
 * the first screen is not waiting on a year of set entries.
 */
const FEED_DAYS = 90;

/**
 * The Home feed. Reloads on focus, like every other screen's data here, so
 * logging a workout and coming back shows it without a manual refresh.
 */
export function useActivityFeed() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const tier = useMembershipTier();
  // Valhalla is what the nutrition and form-check tables are gated on, so it
  // is also what decides whether asking for them is worth a request.
  const includePaid = tierAllows(tier, 'valhalla');

  const [days, setDays] = useState<DayActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Which request is the current one.
   *
   * A counter rather than the usual `cancelled` boolean, because this hook
   * has two callers that can overlap: the focus effect and the error
   * notice's retry. A boolean scoped to one effect run cannot tell a stale
   * response from a live one when a retry is already in flight, so a slow
   * first request could land after a fast second and overwrite it.
   */
  const requestId = useRef(0);

  const load = useCallback(async () => {
    if (!userId) return;
    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    const end = todayISO();
    const start = addDays(end, -FEED_DAYS);

    try {
      const result = await fetchActivityFeed(userId, start, end, { includePaid });
      if (id === requestId.current) setDays(result);
    } catch (err) {
      if (id === requestId.current) {
        setError(err instanceof Error ? err.message : 'Failed to load your activity');
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [userId, includePaid]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return { days, loading, error, reload: load };
}
