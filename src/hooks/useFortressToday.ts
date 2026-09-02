import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useHasTier } from './useMembership';
import { useAuthStore } from '../state/authStore';
import { useProfileStore } from '../state/profileStore';

export interface FortressToday {
  program: {
    programName: string;
    dayName: string;
    position: number;
    cycleLength: number;
  } | null;
  goal: {
    exerciseName: string;
    target: number;
    unit: 'kg' | 'lb';
    targetDate: string;
    daysLeft: number;
    current: number;
  } | null;
  newRecords: number;
  group: {
    groupName: string;
    rank: number;
    memberCount: number;
  } | null;
}

/**
 * The one thing each owned Fortress feature has to say today.
 *
 * A single RPC rather than the four hooks that already exist for these
 * features. Home is the screen that opens on launch, and calling
 * usePrograms, useLiftGoals, usePersonalRecords and useGroups there would be
 * four round trips that between them pull the member's whole set history
 * down to compute a four-line summary. The server composes it instead.
 *
 * Skipped entirely below Fortress: the RPC refuses a free account, so
 * calling it would be a guaranteed error on the most-visited screen, logged
 * every launch. `useHasTier` is compared rather than equality-checked, so a
 * Valhalla member is included.
 */
export function useFortressToday() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const weightUnit = useProfileStore((s) => s.preferences.units);
  const entitled = useHasTier('fortress');
  const [data, setData] = useState<FortressToday | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!userId || !entitled) {
      setData(null);
      return () => {};
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .rpc('get_fortress_today', { p_weight_unit: weightUnit })
      .then(({ data: result, error }) => {
        if (cancelled) return;
        // Deliberately silent on failure. This is a summary of things the
        // member can already reach through their own screens, so a banner
        // here would report a problem they do not have and cannot act on --
        // the card simply does not appear.
        setData(error ? null : (result as FortressToday));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, entitled, weightUnit]);

  useFocusEffect(load);

  return { data, loading };
}
