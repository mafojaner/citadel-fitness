import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { fetchGroupChallenge, type GroupChallenge } from '../lib/groupChallenges';

/**
 * The selected group's challenge.
 *
 * Separate from useGroups because the two change on different schedules: a
 * challenge appears when somebody starts one and ends on its own date, while
 * the groups list changes only when you join or leave. Folding this in would
 * mean refetching every group's leaderboard to notice that a challenge had
 * begun.
 *
 * State is set only inside the promise callbacks, never synchronously in the
 * effect -- including the no-group case, which resolves through the same
 * path rather than short-circuiting into a setState the project's lint rules
 * (rightly) reject.
 */
export function useGroupChallenge(groupId: string | null) {
  const [challenge, setChallenge] = useState<GroupChallenge | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    Promise.resolve(groupId ? fetchGroupChallenge(groupId) : null)
      .then((result) => {
        if (!cancelled) setChallenge(result);
      })
      .catch(() => {
        // A missing challenge panel is not worth a banner over the
        // standings, which are what the screen is for.
        if (!cancelled) setChallenge(null);
      });
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  useFocusEffect(load);

  return { challenge, reload: load };
}
