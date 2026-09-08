import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { todayISO, weekOf } from '../lib/analytics';
import { fetchWorkoutDatesInRange } from '../lib/workouts';
import { useAuthStore } from '../state/authStore';

/**
 * Which days of the current week have something logged, for the snapshot's
 * dots.
 *
 * A week rather than the month the picker loads: the snapshot only ever
 * draws seven days, and asking for a month to render seven of it is a
 * bigger query on two screens that are already fetching several other
 * things on focus.
 *
 * A failure leaves the dots off rather than surfacing an error. They are a
 * convenience on a card whose real content is the dates, and an error
 * notice on a summary screen for a missing dot would be louder than the
 * thing it is reporting.
 */
export function useWeekWorkoutDates() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [dates, setDates] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      const week = weekOf(todayISO());
      fetchWorkoutDatesInRange(userId, week[0], week[6])
        .then((result) => {
          if (!cancelled) setDates(result);
        })
        .catch(() => {
          if (!cancelled) setDates([]);
        });
      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  return { dates };
}
