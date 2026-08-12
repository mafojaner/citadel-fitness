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
  /**
   * Real email (not just an on-device push notification) about new
   * articles and app news. Defaults to off — this is a genuine inbox
   * email, not an ephemeral push, so it opts in rather than opting
   * everyone in unannounced.
   */
  emailNewsletter: boolean;
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
    updates: true,
  },
  hasSeenOnboarding: false,
  emailNewsletter: false,
};

export interface RawProfile {
  name: string;
  preferences: Partial<ProfilePreferences>;
  avatarUrl: string | null;
  /** When this account became a Fortress member; null on the free tier. */
  fortressSince: string | null;
}

export async function fetchProfile(userId: string): Promise<RawProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('name, preferences, avatar_url, fortress_since')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return {
    name: data.name,
    preferences: data.preferences,
    avatarUrl: data.avatar_url,
    fortressSince: data.fortress_since,
  };
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

/**
 * Deletes the stored image and clears the profile's reference to it.
 *
 * Clears every file in the user's folder rather than the one path the
 * current avatar_url points at: uploads are named avatar.<ext> from the
 * source image's mime type, so switching formats (jpg then png) leaves the
 * earlier file behind. Those strays are still fetchable by anyone holding
 * the old public URL, which is the opposite of what removing a photo is
 * meant to do.
 *
 * Storage first, database second. If this fails halfway the profile is left
 * pointing at a now-missing image, which shows up immediately and can be
 * retried — the other order would report success while the photo was still
 * retrievable.
 */
export async function removeAvatar(userId: string): Promise<void> {
  const { data: files, error: listError } = await supabase.storage.from('avatars').list(userId);
  if (listError) throw listError;

  if (files && files.length > 0) {
    const { error: removeError } = await supabase.storage
      .from('avatars')
      .remove(files.map((file) => `${userId}/${file.name}`));
    if (removeError) throw removeError;
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', userId);
  if (updateError) throw updateError;
}
