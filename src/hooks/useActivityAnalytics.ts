import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { fetchActivitySummary, type ActivitySummary } from '../lib/analytics';
import { useAuthStore } from '../state/authStore';
import type { Category, WeightUnit } from '../types/models';

const EMPTY: ActivitySummary = {
  workoutsThisWeek: 0,
  currentStreakDays: 0,
  totalVolumeThisWeek: 0,
  metric: 'volume',
};

/**
 * Fixed KPIs (streak, this week) — always "up to today", regardless of
 * whatever date range the Activity screen's chart is currently showing.
 * Backs both the Home summary cards and the Activity screen's stat tiles.
 */
export function useActivityAnalytics(category: Category | 'all', weightUnit: WeightUnit) {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [data, setData] = useState<ActivitySummary>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      setLoading(true);
      setError(null);
      fetchActivitySummary(userId, category, weightUnit)
        .then((result) => {
          if (!cancelled) setData(result);
        })
        .catch((err) => {
          if (!cancelled) {
            setData(EMPTY);
            setError(err instanceof Error ? err.message : 'Failed to load activity data');
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [userId, category, weightUnit])
  );

  return { ...data, loading, error };
}
