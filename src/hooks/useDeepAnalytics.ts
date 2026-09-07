import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { fetchDeepAnalytics, type DeepAnalytics } from '../lib/analyticsDeep';
import { useAuthStore } from '../state/authStore';
import { useProfileStore } from '../state/profileStore';

const EMPTY: DeepAnalytics = {
  weeks: [],
  repBands: [],
  consistency: {
    activeDays: 0,
    activeWeeks: 0,
    sessionsPerWeek: 0,
    longestStreak: 0,
    averageRestDays: null,
    weekdays: [],
  },
  intensity: { averageRpe: null, coverage: 0, weeks: [] },
  topLifts: [],
  cardio: null,
  totalVolume: 0,
};

/** `periodDays` of null means everything ever logged. */
export function useDeepAnalytics(periodDays: number | null) {
  const userId = useAuthStore((s) => s.session?.user.id);
  const weightUnit = useProfileStore((s) => s.preferences.units);
  const distanceUnit = useProfileStore((s) => s.preferences.distanceUnit);
  const [data, setData] = useState<DeepAnalytics>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) return () => {};
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchDeepAnalytics(weightUnit, distanceUnit, periodDays)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) {
          // Cleared rather than left stale: the period pills change this
          // query, and keeping the last window's numbers under an error
          // would label one period's data with another's heading.
          setData(EMPTY);
          setError(err instanceof Error ? err.message : 'Failed to load your analytics');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, weightUnit, distanceUnit, periodDays]);

  useFocusEffect(load);

  return { ...data, loading, error, reload: load };
}
