import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { fetchReferralSummary, redeemReferralCode, type ReferralSummary } from '../lib/referrals';
import { useAuthStore } from '../state/authStore';

export function useReferrals() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) return () => {};
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchReferralSummary(userId)
      .then((result) => {
        if (!cancelled) setSummary(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load your referrals');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useFocusEffect(load);

  const redeem = useCallback(
    async (code: string) => {
      setBusy(true);
      setError(null);
      try {
        await redeemReferralCode(code);
        load();
        return true;
      } catch (err) {
        // The database messages here are already written for a person —
        // "You cannot use your own code" — so they're surfaced as-is
        // rather than flattened into a generic failure.
        setError(err instanceof Error ? err.message : 'Could not redeem that code');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [load]
  );

  return { summary, loading, busy, error, reload: load, redeem };
}
