import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { fetchActivityLeaderboard, type LeaderboardEntry } from '../lib/leaderboard';

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchActivityLeaderboard()
      .then((result) => {
        if (!cancelled) setEntries(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setEntries([]);
          setError(err instanceof Error ? err.message : 'Failed to load the leaderboard');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(load);
  return { entries, loading, error, reload: load };
}
