import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  fetchProgramHistory,
  setProgramPosition,
  type ProgramSession,
} from '../lib/programHistory';

/**
 * What has been trained since enrolling, and the ability to move the cycle
 * by hand.
 *
 * Kept out of usePrograms because it is only meaningful while enrolled, and
 * that hook is also what an unenrolled member uses to browse the list --
 * asking the server for the history of a program nobody is on would be a
 * guaranteed empty round trip on every visit.
 */
export function useProgramHistory(enrolled: boolean) {
  const [history, setHistory] = useState<ProgramSession[]>([]);
  const [moving, setMoving] = useState(false);

  const load = useCallback(() => {
    let cancelled = false;
    Promise.resolve(enrolled ? fetchProgramHistory() : [])
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .catch(() => {
        // The history is context, not the point of the screen. A failure
        // here should not put a banner over the next session.
        if (!cancelled) setHistory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [enrolled]);

  useFocusEffect(load);

  const moveTo = useCallback(
    async (position: number) => {
      setMoving(true);
      try {
        await setProgramPosition(position);
      } finally {
        setMoving(false);
      }
    },
    []
  );

  return { history, moving, moveTo, reload: load };
}
