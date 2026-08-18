import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { deleteWaterEntry, fetchTodayWaterEntries, logWater, type WaterEntry } from '../lib/water';
import { trackEvent } from '../lib/telemetry';
import { todayISO } from '../lib/analytics';
import { useAuthStore } from '../state/authStore';

/**
 * Today's water log for the signed-in user. Refetches on focus (matching
 * useRecentWorkouts) rather than once on mount, so returning to Home after
 * logging elsewhere — or after midnight rolls the date over — shows the
 * current day's real total instead of a stale one from whenever the app
 * was first opened.
 */
export function useWaterIntake() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [entries, setEntries] = useState<WaterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

  const load = useCallback(() => {
    if (!userId) return () => {};
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchTodayWaterEntries(userId, todayISO())
      .then((result) => {
        if (!cancelled) setEntries(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load water intake');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useFocusEffect(load);

  const totalMl = useMemo(() => entries.reduce((sum, e) => sum + e.amountMl, 0), [entries]);

  const addWater = useCallback(
    async (amountMl: number, source: 'preset' | 'custom' = 'preset') => {
      if (!userId) return;
      // The amount itself is deliberately not sent — only which control was
      // used, which is what says whether custom amounts earned their place.
      trackEvent({ name: 'water_logged', properties: { source } });
      setMutating(true);
      setError(null);
      // Optimistic: logging water is a tap someone repeats several times in
      // a row, and this table has no other reader to conflict with — a
      // round trip before the bar moves would make quick taps feel broken.
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticEntry: WaterEntry = { id: optimisticId, amountMl, createdAt: new Date().toISOString() };
      setEntries((prev) => [...prev, optimisticEntry]);
      try {
        const real = await logWater(userId, amountMl, todayISO());
        setEntries((prev) => prev.map((e) => (e.id === optimisticId ? real : e)));
      } catch (err) {
        setEntries((prev) => prev.filter((e) => e.id !== optimisticId));
        setError(err instanceof Error ? err.message : 'Failed to log water');
      } finally {
        setMutating(false);
      }
    },
    [userId]
  );

  const removeEntry = useCallback(
    async (entryId: string) => {
      if (entryId.startsWith('optimistic-')) return;
      setMutating(true);
      setError(null);
      const previous = entries;
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      try {
        await deleteWaterEntry(entryId);
      } catch (err) {
        setEntries(previous);
        setError(err instanceof Error ? err.message : 'Failed to remove entry');
      } finally {
        setMutating(false);
      }
    },
    [entries]
  );

  const removeLastEntry = useCallback(() => {
    const last = entries[entries.length - 1];
    if (!last) return Promise.resolve();
    return removeEntry(last.id);
  }, [entries, removeEntry]);

  return { entries, totalMl, loading, error, mutating, addWater, removeEntry, removeLastEntry };
}
