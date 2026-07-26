import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { fetchProgressSeries, type ProgressSeries } from '../lib/analytics';
import { useAuthStore } from '../state/authStore';
import type { Category } from '../types/models';

const EMPTY: ProgressSeries = { points: [], bucketing: 'day', metric: 'volume' };

/**
 * The Activity screen's chart data — a user-selectable date range, unlike
 * useActivityAnalytics's fixed "current streak / this week" KPIs.
 */
export function useProgressSeries(category: Category | 'all', startDate: string, endDate: string) {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [data, setData] = useState<ProgressSeries>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      setLoading(true);
      setError(null);
      fetchProgressSeries(userId, category, startDate, endDate)
        .then((result) => {
          if (!cancelled) setData(result);
        })
        .catch((err) => {
          if (!cancelled) {
            setData(EMPTY);
            setError(err instanceof Error ? err.message : 'Failed to load progress data');
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [userId, category, startDate, endDate])
  );

  return { ...data, loading, error };
}
