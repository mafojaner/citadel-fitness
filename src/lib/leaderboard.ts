import { supabase } from './supabase';

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  daysLogged: number;
}

interface DbLeaderboardRow {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  days_logged: number;
}

/**
 * Backed by get_activity_leaderboard() — see supabase/migrations/20260101000029_activity_leaderboard.sql.
 * Ranks by distinct same-day-logged workout days in the trailing 7, top 50.
 */
export async function fetchActivityLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('get_activity_leaderboard');
  if (error) throw error;
  return ((data ?? []) as DbLeaderboardRow[]).map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    daysLogged: row.days_logged,
  }));
}
