import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { addDays, todayISO } from '../lib/analytics';
import { fetchWaterHistory, type WaterDayTotal } from '../lib/water';
import { useAuthStore } from '../state/authStore';

const HISTORY_DAYS = 14;

/**
 * Daily totals for the two weeks before today — today itself comes from
 * useWaterIntake, which also has the entry-level detail this hook doesn't
 * fetch, so the two are kept separate rather than this re-deriving today
 * from its own query.
 */
export function useWaterHistory() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [days, setDays] = useState<WaterDayTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) return () => {};
    let cancelled = false;
    setLoading(true);
    setError(null);
    const end = addDays(todayISO(), -1);
    const start = addDays(todayISO(), -HISTORY_DAYS);
    fetchWaterHistory(userId, start, end)
      .then((result) => {
        if (!cancelled) setDays(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load hydration history');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useFocusEffect(load);

  return { days, loading, error };
}
