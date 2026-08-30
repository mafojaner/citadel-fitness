import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { fetchOverloadSuggestions, type OverloadSuggestion } from '../lib/overload';
import { useAuthStore } from '../state/authStore';
import { useProfileStore } from '../state/profileStore';

/**
 * Refetches on focus, matching the other data hooks. It matters more here
 * than elsewhere: the whole point of a suggestion is that it reflects the
 * session you just logged, and coming back from Add Workout is exactly when
 * it would otherwise be stale.
 */
export function useOverloadSuggestions() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const weightUnit = useProfileStore((s) => s.preferences.units);
  const [suggestions, setSuggestions] = useState<OverloadSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) return () => {};
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchOverloadSuggestions(weightUnit)
      .then((result) => {
        if (!cancelled) setSuggestions(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load your suggestions');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, weightUnit]);

  useFocusEffect(load);

  return { suggestions, loading, error, reload: load };
}
