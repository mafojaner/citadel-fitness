import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { fetchFortressWaitlistStatus, joinFortressWaitlist, leaveFortressWaitlist } from '../lib/fortress';
import { trackEvent } from '../lib/telemetry';
import { useAuthStore } from '../state/authStore';

export function useFortressWaitlist() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const accountEmail = useAuthStore((s) => s.session?.user.email);
  const [joined, setJoined] = useState(false);
  const [joinedEmail, setJoinedEmail] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchFortressWaitlistStatus(userId)
      .then((result) => {
        if (!cancelled) {
          setJoined(result.joined);
          setJoinedEmail(result.email);
        }
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

  const join = useCallback(
    async (submittedEmail: string) => {
      if (!userId || !submittedEmail || joined || joining) return;
      setJoining(true);
      setError(null);
      try {
        await joinFortressWaitlist(userId, submittedEmail);
        // No properties: the submitted email is the one thing this flow
        // has that telemetry must never see.
        trackEvent({ name: 'fortress_waitlist_joined' });
        setJoined(true);
        setJoinedEmail(submittedEmail);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to join the waitlist');
      } finally {
        setJoining(false);
      }
    },
    [userId, joined, joining],
  );

  const leave = useCallback(async () => {
    if (!userId || !joined || leaving) return;
    setLeaving(true);
    setError(null);
    try {
      await leaveFortressWaitlist(userId);
      setJoined(false);
      setJoinedEmail(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave the waitlist');
    } finally {
      setLeaving(false);
    }
  }, [userId, joined, leaving]);

  return { accountEmail, joined, joinedEmail, loading, joining, leaving, error, join, leave };
}
