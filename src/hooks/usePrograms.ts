import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  currentDay,
  enrollInProgram,
  fetchEnrollment,
  fetchPrograms,
  leaveProgram,
  type Enrollment,
  type Program,
} from '../lib/programs';
import { useAuthStore } from '../state/authStore';

export function usePrograms() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) return () => {};
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetchPrograms(), fetchEnrollment(userId)])
      .then(([allPrograms, current]) => {
        if (cancelled) return;
        setPrograms(allPrograms);
        setEnrollment(current);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load programs');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useFocusEffect(load);

  const enrolled = programs.find((p) => p.id === enrollment?.programId);
  const today = currentDay(enrolled, enrollment);

  const join = useCallback(
    async (programId: string) => {
      if (!userId) return;
      setBusy(true);
      setError(null);
      try {
        await enrollInProgram(userId, programId);
        load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not start that program');
      } finally {
        setBusy(false);
      }
    },
    [userId, load]
  );

  const leave = useCallback(async () => {
    if (!userId) return;
    setBusy(true);
    setError(null);
    try {
      await leaveProgram(userId);
      setEnrollment(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not leave that program');
    } finally {
      setBusy(false);
    }
  }, [userId]);

  // There is deliberately no `advance` here any more.
  //
  // It used to fire the moment a day was loaded into the draft, which meant
  // an abandoned draft silently burned a day of the cycle. The advance now
  // happens where it belongs -- after the workout saves, in AddWorkoutScreen,
  // using the position the draft carried with it. Leaving this in as well
  // would be a second, unguarded path to the same write.

  return { programs, enrollment, enrolled, today, loading, busy, error, reload: load, join, leave };
}
