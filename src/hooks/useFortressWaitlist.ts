import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  fetchFortressWaitlistStatus,
  joinFortressWaitlist,
  leaveFortressWaitlist,
  type WaitlistTier,
} from '../lib/fortress';
import { trackEvent } from '../lib/telemetry';
import { useAuthStore } from '../state/authStore';

export function useFortressWaitlist() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const accountEmail = useAuthStore((s) => s.session?.user.email);
  const [joined, setJoined] = useState(false);
  const [joinedEmail, setJoinedEmail] = useState<string | undefined>(undefined);
  const [joinedTier, setJoinedTier] = useState<WaitlistTier | null>(null);
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
          setJoinedTier(result.tier);
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
    async (submittedEmail: string, tier: WaitlistTier) => {
      if (!userId || !submittedEmail || joined || joining) return;
      setJoining(true);
      setError(null);
      try {
        await joinFortressWaitlist(userId, submittedEmail, tier);
        // The tier is safe to send and is the whole point of the event —
        // it answers how many people want the coached plan. The submitted
        // email is the one thing this flow has that telemetry must never see.
        trackEvent({ name: 'fortress_waitlist_joined', properties: { tier } });
        setJoined(true);
        setJoinedEmail(submittedEmail);
        setJoinedTier(tier);
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
      setJoinedTier(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave the waitlist');
    } finally {
      setLeaving(false);
    }
  }, [userId, joined, leaving]);

  return { accountEmail, joined, joinedEmail, joinedTier, loading, joining, leaving, error, join, leave };
}
