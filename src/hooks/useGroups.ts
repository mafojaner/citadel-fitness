import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  createGroup,
  fetchGroupLeaderboard,
  fetchMyGroups,
  joinGroupByCode,
  leaveGroup,
  type Group,
  type GroupStanding,
} from '../lib/groups';
import { useAuthStore } from '../state/authStore';

export function useGroups(periodDays: number) {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [standings, setStandings] = useState<GroupStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMyGroups()
      .then((mine) => {
        if (cancelled) return;
        setGroups(mine);
        // Keep the current selection if it still exists, so refreshing
        // doesn't yank someone back to the first group.
        setSelectedId((current) =>
          current && mine.some((g) => g.id === current) ? current : (mine[0]?.id ?? null)
        );
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load your groups');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(load);

  const loadStandings = useCallback(() => {
    if (!selectedId) {
      setStandings([]);
      return () => {};
    }
    let cancelled = false;
    fetchGroupLeaderboard(selectedId, periodDays)
      .then((rows) => {
        if (!cancelled) setStandings(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load the standings');
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, periodDays]);

  useFocusEffect(loadStandings);

  const create = useCallback(
    async (name: string) => {
      setBusy(true);
      setError(null);
      try {
        const id = await createGroup(name);
        setSelectedId(id);
        load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not create that group');
      } finally {
        setBusy(false);
      }
    },
    [load]
  );

  const join = useCallback(
    async (code: string) => {
      setBusy(true);
      setError(null);
      try {
        const id = await joinGroupByCode(code);
        setSelectedId(id);
        load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not join with that code');
      } finally {
        setBusy(false);
      }
    },
    [load]
  );

  const leave = useCallback(
    async (groupId: string) => {
      if (!userId) return;
      setBusy(true);
      setError(null);
      try {
        await leaveGroup(groupId, userId);
        setSelectedId(null);
        load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not leave that group');
      } finally {
        setBusy(false);
      }
    },
    [userId, load]
  );

  return {
    groups,
    selectedId,
    setSelectedId,
    standings,
    loading,
    busy,
    error,
    reload: load,
    create,
    join,
    leave,
    myUserId: userId,
  };
}
