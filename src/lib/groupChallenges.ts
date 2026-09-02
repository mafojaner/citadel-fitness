import { supabase } from './supabase';
import { todayISO } from './analytics';

export type ChallengeMetric = 'days' | 'volume';

export interface ChallengeStanding {
  user_id: string;
  name: string;
  avatar_url: string | null;
  score: number;
}

export interface GroupChallenge {
  id: string;
  name: string;
  metric: ChallengeMetric;
  startsOn: string;
  endsOn: string;
  daysLeft: number;
  finished: boolean;
  startedByMe: boolean;
  standings: ChallengeStanding[];
}

/**
 * How long a challenge runs.
 *
 * The same shape as the goal horizons, and for the same reason: a week or a
 * month is how people actually agree to compete, and nobody types a date on
 * a phone. Deliberately shorter than the goal horizons -- a challenge that
 * runs for a year is a leaderboard, which the group already has.
 */
export const CHALLENGE_LENGTHS: { label: string; days: number }[] = [
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '30 days', days: 30 },
];

export const CHALLENGE_METRICS: { label: string; value: ChallengeMetric; unit: string }[] = [
  { label: 'Days trained', value: 'days', unit: 'days' },
  { label: 'Volume moved', value: 'volume', unit: 'kg' },
];

export function metricUnit(metric: ChallengeMetric): string {
  return metric === 'days' ? 'days' : 'kg';
}

export async function fetchGroupChallenge(groupId: string): Promise<GroupChallenge | null> {
  const { data, error } = await supabase.rpc('get_group_challenge', { p_group_id: groupId });
  if (error) throw error;
  return (data as GroupChallenge | null) ?? null;
}

export async function createGroupChallenge(
  groupId: string,
  userId: string,
  name: string,
  metric: ChallengeMetric,
  lengthDays: number
): Promise<void> {
  const startsOn = todayISO();
  const ends = new Date();
  // Inclusive of the start day, so a "1 week" challenge that starts today
  // ends six days later and runs for seven days rather than eight.
  ends.setDate(ends.getDate() + lengthDays - 1);
  const { error } = await supabase.from('group_challenges').insert({
    group_id: groupId,
    name,
    metric,
    starts_on: startsOn,
    ends_on: ends.toISOString().slice(0, 10),
    created_by: userId,
  });
  if (error) throw error;
}

export async function cancelGroupChallenge(challengeId: string): Promise<void> {
  const { error } = await supabase.from('group_challenges').delete().eq('id', challengeId);
  if (error) throw error;
}
