import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useProfileStore } from '../state/profileStore';

export interface LiftDetail {
  exercise: { id: string; name: string; category: string; type: string };
  record: {
    totalSets: number;
    lastPerformed: string | null;
    heaviestWeight: number | null;
    heaviestReps: number | null;
    heaviestDate: string | null;
    bestEstimate: number | null;
    bestEstimateDate: string | null;
  };
  goal: {
    id: string;
    target: number;
    unit: 'kg' | 'lb';
    targetDate: string;
    daysLeft: number;
  } | null;
  series: { date: string; value: number }[];
}

/**
 * One lift's record, goal and progression together.
 *
 * A single call rather than three: all three answers come from the same
 * logged sets, and fetching them separately would read the member's history
 * three times to say one thing.
 */
export function useLiftDetail(exerciseId: string) {
  const weightUnit = useProfileStore((s) => s.preferences.units);
  const [data, setData] = useState<LiftDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    supabase
      .rpc('get_lift_detail', { p_exercise_id: exerciseId, p_weight_unit: weightUnit })
      .then(({ data: result, error: err }) => {
        if (cancelled) return;
        if (err) setError(err.message);
        else setData(result as LiftDetail);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [exerciseId, weightUnit]);

  useFocusEffect(load);

  return { data, loading, error, reload: load };
}
