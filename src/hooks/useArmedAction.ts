import { useCallback, useEffect, useRef, useState } from 'react';

/** How long an armed control stays armed before disarming itself. */
const DISARM_AFTER_MS = 4000;

/**
 * A destructive control that takes two taps, and forgets after a few
 * seconds.
 *
 * Leaving a program, leaving a group and calling off a challenge each grew
 * their own copy of this, and each had the same flaw: once armed, the button
 * stayed armed indefinitely. Tap it, get distracted, come back a minute
 * later, and the next tap is destructive with no warning that it had been
 * primed. A confirmation that outlives the intent is not a confirmation.
 *
 * A timeout rather than a modal because this app has no confirmation dialog
 * anywhere, and introducing one for three buttons would be a heavier change
 * than the problem deserves.
 */
export function useArmedAction(perform: () => void) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  // An armed control that unmounts must not leave its timer running, or the
  // callback fires against a screen that is gone.
  useEffect(() => clear, [clear]);

  const trigger = useCallback(() => {
    if (armed) {
      clear();
      setArmed(false);
      perform();
      return;
    }
    setArmed(true);
    clear();
    timer.current = setTimeout(() => setArmed(false), DISARM_AFTER_MS);
  }, [armed, clear, perform]);

  return { armed, trigger };
}
