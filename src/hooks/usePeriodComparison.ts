import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { fetchPeriodComparison, type PeriodComparison } from '../lib/periodComparison';
import { useProfileStore } from '../state/profileStore';

/**
 * Totals for the selected window and the one before it.
 *
 * Skipped entirely for the all-time range: there is no window before
 * everything, and asking would be a round trip whose only honest answer is
 * "nothing to compare".
 */
export function usePeriodComparison(days: number | null) {
  const weightUnit = useProfileStore((s) => s.preferences.units);
  const [data, setData] = useState<PeriodComparison | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    Promise.resolve(days === null ? null : fetchPeriodComparison(days, weightUnit))
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        // The comparison is an extra line under figures that are already
        // correct. A failure should remove the line, not the screen.
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [days, weightUnit]);

  useFocusEffect(load);

  return data;
}
