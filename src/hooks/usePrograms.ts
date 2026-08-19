import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  advanceEnrollment,
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

  /** Called once a session has been loaded into the draft, so the cycle moves on. */
  const advance = useCallback(async () => {
    if (!userId || !enrollment || !enrolled) return;
    try {
      await advanceEnrollment(userId, enrollment.nextPosition, enrolled.days.length);
      setEnrollment({
        ...enrollment,
        nextPosition: (enrollment.nextPosition % enrolled.days.length) + 1,
      });
    } catch (err) {
      // Advancing is bookkeeping, not the user's goal — the session is
      // already in their draft, so a failure here shouldn't read as the
      // action having failed.
      setError(err instanceof Error ? err.message : 'Session loaded, but the program did not advance');
    }
  }, [userId, enrollment, enrolled]);

  return { programs, enrollment, enrolled, today, loading, busy, error, reload: load, join, leave, advance };
}
