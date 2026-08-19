import { addDays, todayISO } from './analytics';
import { supabase } from './supabase';

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  memberCount: number;
}

export interface GroupStanding {
  userId: string;
  name: string;
  avatarUrl: string | null;
  daysLogged: number;
}

/**
 * A "challenge" is a window, not a stored object. Comparing the same crew
 * over the last 7, 30 or 90 days is what people actually mean by running
 * one against each other, and it needs no table, no lifecycle, and no
 * decision about what happens to a challenge nobody finished.
 */
export const GROUP_PERIODS = [
  { label: 'This week', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
] as const;

interface DbGroup {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  group_members: { count: number }[];
}

export async function fetchMyGroups(): Promise<Group[]> {
  // RLS scopes this to groups the caller belongs to, so no user filter is
  // needed here — and adding one would imply the policy couldn't be trusted.
  const { data, error } = await supabase
    .from('groups')
    .select('id, name, invite_code, owner_id, group_members(count)')
    .returns<DbGroup[]>();

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    ownerId: row.owner_id,
    memberCount: row.group_members?.[0]?.count ?? 0,
  }));
}

export async function createGroup(name: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_group', { p_name: name });
  if (error) throw error;
  return data as string;
}

export async function joinGroupByCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_group_by_code', { p_code: code });
  if (error) throw error;
  return data as string;
}

export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function fetchGroupLeaderboard(
  groupId: string,
  periodDays: number
): Promise<GroupStanding[]> {
  const end = todayISO();
  // Inclusive of both ends, so "this week" is 7 days including today rather
  // than 8.
  const start = addDays(end, -(periodDays - 1));

  const { data, error } = await supabase.rpc('get_group_leaderboard', {
    p_group_id: groupId,
    p_start: start,
    p_end: end,
  });

  if (error) throw error;
  return ((data ?? []) as { user_id: string; name: string; avatar_url: string | null; days_logged: number }[]).map(
    (row) => ({
      userId: row.user_id,
      name: row.name,
      avatarUrl: row.avatar_url,
      daysLogged: row.days_logged,
    })
  );
}
