import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { fetchRecentWorkouts, type RecentWorkoutSummary } from '../lib/analytics';
import { useAuthStore } from '../state/authStore';

export function useRecentWorkouts(limit = 3) {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [workouts, setWorkouts] = useState<RecentWorkoutSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      setLoading(true);
      fetchRecentWorkouts(userId, limit)
        .then((result) => {
          if (!cancelled) setWorkouts(result);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [userId, limit])
  );

  return { workouts, loading };
}
