import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { fetchPersonalRecords, type PersonalRecord } from '../lib/personalRecords';
import { useAuthStore } from '../state/authStore';
import { useProfileStore } from '../state/profileStore';

/**
 * Refetches on focus, matching the other data hooks: records change whenever
 * a workout is logged, and coming back from Add Workout is exactly when a new
 * PR would have just been set.
 */
export function usePersonalRecords() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const weightUnit = useProfileStore((s) => s.preferences.units);
  const distanceUnit = useProfileStore((s) => s.preferences.distanceUnit);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) return () => {};
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPersonalRecords(userId, weightUnit, distanceUnit)
      .then((result) => {
        if (!cancelled) setRecords(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load your personal records');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, weightUnit, distanceUnit]);

  useFocusEffect(load);

  return { records, loading, error, reload: load };
}
