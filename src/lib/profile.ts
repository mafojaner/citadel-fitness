import { supabase } from './supabase';
import type { ArticleCategory } from '../types/models';

export interface ProfilePreferences {
  units: 'lb' | 'kg';
  distanceUnit: 'mi' | 'km';
  notifications: boolean;
  /** Which newsletter categories may raise a notification when published. */
  articleNotifications: Record<ArticleCategory, boolean>;
  /** Whether this account has been shown (or skipped) the first-run introduction flow. */
  hasSeenOnboarding: boolean;
}

export const DEFAULT_PREFERENCES: ProfilePreferences = {
  units: 'lb',
  distanceUnit: 'mi',
  notifications: true,
  articleNotifications: {
    splits: true,
    exercise: true,
    nutrition: true,
    recovery: true,
  },
  hasSeenOnboarding: false,
};

export interface RawProfile {
  name: string;
  preferences: Partial<ProfilePreferences>;
  avatarUrl: string | null;
}

export async function fetchProfile(userId: string): Promise<RawProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('name, preferences, avatar_url')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return { name: data.name, preferences: data.preferences, avatarUrl: data.avatar_url };
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

export async function uploadAvatar(
  userId: string,
  uri: string,
  mimeType?: string | null
): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const ext = mimeType?.split('/')[1] ?? 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType: mimeType ?? 'image/jpeg', upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId);
  if (updateError) throw updateError;

  return avatarUrl;
}
