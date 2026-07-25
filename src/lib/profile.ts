import { supabase } from './supabase';

export interface ProfilePreferences {
  units: 'lb' | 'kg';
  distanceUnit: 'mi' | 'km';
  notifications: boolean;
}

export const DEFAULT_PREFERENCES: ProfilePreferences = {
  units: 'lb',
  distanceUnit: 'mi',
  notifications: true,
};

export interface RawProfile {
  name: string;
  preferences: Partial<ProfilePreferences>;
}

export async function fetchProfile(userId: string): Promise<RawProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('name, preferences')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data as RawProfile;
}

export async function updateProfileName(userId: string, name: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ name }).eq('id', userId);
  if (error) throw error;
}

export async function updateProfilePreferences(
  userId: string,
  preferences: ProfilePreferences
): Promise<void> {
  const { error } = await supabase.from('profiles').update({ preferences }).eq('id', userId);
  if (error) throw error;
}
