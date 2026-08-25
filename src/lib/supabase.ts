import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project credentials. Using a placeholder client until then.'
  );
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder-anon-key', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

export function getPasswordResetRedirectUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'citadelfitness://reset-password';
}

export interface RecoveryTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * On web, `detectSessionInUrl` parses the recovery link's tokens for us.
 * On native there's no browser location to detect — the OS just opens the
 * app via the `citadelfitness://` scheme with the same tokens Supabase's
 * implicit auth flow appends after a `#`, so this pulls them out by hand.
 */
export function parseRecoveryTokensFromUrl(url: string | null | undefined): RecoveryTokens | null {
  // Defensive at its own boundary rather than trusting every caller to
  // check first — this exists specifically to handle untrusted external
  // input (an OS-delivered deep link), so it should never throw on it.
  if (!url) return null;
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const paramsString = hashIndex >= 0 ? url.slice(hashIndex + 1) : queryIndex >= 0 ? url.slice(queryIndex + 1) : '';
  if (!paramsString) return null;

  const params = new URLSearchParams(paramsString);
  if (params.get('type') !== 'recovery') return null;

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return null;

  return { accessToken, refreshToken };
}
