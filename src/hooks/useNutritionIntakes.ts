import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { fetchNutritionIntakes, isOpen, type NutritionIntake } from '../lib/nutrition';
import { useAuthStore } from '../state/authStore';

/**
 * The member's plans, newest first, plus whether one is still in flight.
 *
 * `openIntake` is derived here rather than stored, because the database
 * already guarantees at most one: a partial unique index on the open
 * statuses. Tracking it separately would be a second source for a fact that
 * has one.
 */
export function useNutritionIntakes() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [intakes, setIntakes] = useState<NutritionIntake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) return () => {};
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchNutritionIntakes(userId)
      .then((rows) => {
        if (!cancelled) setIntakes(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load your nutrition plans');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useFocusEffect(load);

  return {
    intakes,
    openIntake: intakes.find(isOpen) ?? null,
    loading,
    error,
    reload: load,
  };
}
