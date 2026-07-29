import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { fetchFortressWaitlistStatus, joinFortressWaitlist } from '../lib/fortress';
import { useAuthStore } from '../state/authStore';

export function useFortressWaitlist() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const email = useAuthStore((s) => s.session?.user.email);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchFortressWaitlistStatus(userId)
      .then((result) => {
        if (!cancelled) setJoined(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to check waitlist status');
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

  const join = useCallback(async () => {
    if (!userId || !email || joined || joining) return;
    setJoining(true);
    setError(null);
    try {
      await joinFortressWaitlist(userId, email);
      setJoined(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join the waitlist');
    } finally {
      setJoining(false);
    }
  }, [userId, email, joined, joining]);

  return { email, joined, loading, joining, error, join };
}
