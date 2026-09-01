import { parseTier, type MembershipTier } from './membership';
import { DEFAULT_CURRENCY, type CurrencyCode } from './currency';
import { supabase } from './supabase';
import type { ArticleCategory } from '../types/models';

export interface ProfilePreferences {
  units: 'lb' | 'kg';
  distanceUnit: 'mi' | 'km';
  /**
   * Which currency plan prices are shown in.
   *
   * A display choice only. The stores charge in the currency of the
   * buyer's own store account, so this changes what someone reads while
   * deciding, never what they are billed. See lib/currency.ts.
   */
  currency: CurrencyCode;
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
  /** Independent of `units` — matches how distanceUnit is its own toggle rather than following weight. */
  waterUnit: 'oz' | 'ml';
  dailyWaterGoalMl: number;
  /** Seconds the rest timer counts down between sets. Fortress feature; ignored otherwise. */
  restTimerSeconds: number;
  /**
   * Sunday recap email. Fortress-only and opt-in for the same reason
   * emailNewsletter is: a real inbox email should be asked for, not
   * assumed, even from someone who is paying.
   */
  weeklyDigest: boolean;
}

export const DEFAULT_PREFERENCES: ProfilePreferences = {
  currency: DEFAULT_CURRENCY,
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
  waterUnit: 'oz',
  // 2000ml (~68 fl oz) — close to the common "8 glasses a day" guideline and a round number to start from; fully editable in Account → Units.
  dailyWaterGoalMl: 2000,
  // 90s suits most compound work — long enough to recover, short enough
  // that the timer stays a nudge rather than a break. Editable per session.
  restTimerSeconds: 90,
  weeklyDigest: false,
};

export interface RawProfile {
  name: string;
  preferences: Partial<ProfilePreferences>;
  avatarUrl: string | null;
  /** When this account first joined a paid tier; null if it never has. */
  fortressSince: string | null;
  membershipTier: MembershipTier;
}

export async function fetchProfile(userId: string): Promise<RawProfile> {
  // The tier comes from my_tier() rather than from the row, because the row
  // is only half the answer now: profiles.membership_tier is the hand-grant,
  // and a paid subscription lives in `subscriptions`. Reading the column
  // alone would gate a new subscriber correctly at every policy and still
  // tell them, on every screen, that they were on the free plan.
  //
  // Both come back in one round trip. my_tier() derives from the same
  // tier_rank the policies use, so what someone is shown and what they can
  // reach cannot disagree.
  const [profileResult, tierResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('name, preferences, avatar_url, fortress_since, membership_tier')
      .eq('id', userId)
      .single(),
    supabase.rpc('my_tier'),
  ]);

  if (profileResult.error) throw profileResult.error;
  const data = profileResult.data;

  return {
    name: data.name,
    preferences: data.preferences,
    avatarUrl: data.avatar_url,
    fortressSince: data.fortress_since,
    // Falls back to the column if the RPC failed. parseTier already defaults
    // anything unrecognised to 'free', so a failure here can only ever show
    // less than someone is entitled to, never more.
    membershipTier: parseTier(
      tierResult.error ? (data.membership_tier as string | null) : (tierResult.data as string | null)
    ),
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
