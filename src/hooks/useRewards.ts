import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { fetchRewardProgress, type RewardProgress } from '../lib/rewards';
import { useAuthStore } from '../state/authStore';

const EMPTY: RewardProgress = {
  weeklyStreak: 0,
  rewardsEarned: 0,
  weeksIntoCurrentCycle: 0,
  weeksPerReward: 4,
  weeklyTargetDays: 4,
  weeks: [],
};

export function useRewards() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [data, setData] = useState<RewardProgress>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchRewardProgress(userId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setData(EMPTY);
          setError(err instanceof Error ? err.message : 'Failed to load reward progress');
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

  return { ...data, loading, error, reload: load };
}
