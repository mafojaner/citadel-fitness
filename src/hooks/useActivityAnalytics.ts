import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { fetchActivityAnalytics, type ActivityAnalytics } from '../lib/analytics';
import { useAuthStore } from '../state/authStore';
import type { Category } from '../types/models';

const EMPTY: ActivityAnalytics = {
  progressSeries: [],
  workoutsThisWeek: 0,
  currentStreakDays: 0,
  totalVolumeThisWeek: 0,
  metric: 'volume',
};

export function useActivityAnalytics(category: Category | 'all') {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [data, setData] = useState<ActivityAnalytics>(EMPTY);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      setLoading(true);
      fetchActivityAnalytics(userId, category)
        .then((result) => {
          if (!cancelled) setData(result);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [userId, category])
  );

  return { ...data, loading };
}
