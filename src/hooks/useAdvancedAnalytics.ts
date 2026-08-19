import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { fetchAdvancedAnalytics, type AdvancedAnalytics } from '../lib/advancedAnalytics';
import { useAuthStore } from '../state/authStore';
import { useProfileStore } from '../state/profileStore';

const EMPTY: AdvancedAnalytics = {
  balance: [],
  progressions: [],
  totalValue: 0,
  totalSets: 0,
  activeDays: 0,
};

/** `periodDays` of null means everything ever logged. */
export function useAdvancedAnalytics(periodDays: number | null) {
  const userId = useAuthStore((s) => s.session?.user.id);
  const weightUnit = useProfileStore((s) => s.preferences.units);
  const distanceUnit = useProfileStore((s) => s.preferences.distanceUnit);
  const [data, setData] = useState<AdvancedAnalytics>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) return () => {};
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAdvancedAnalytics(userId, weightUnit, distanceUnit, periodDays)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load your analytics');
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
