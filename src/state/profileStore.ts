import { create } from 'zustand';
import {
  DEFAULT_PREFERENCES,
  fetchProfile,
  updateProfileName,
  updateProfilePreferences,
  type ProfilePreferences,
} from '../lib/profile';

interface ProfileState {
  name: string;
  avatarUrl: string | null;
  preferences: ProfilePreferences;
  loaded: boolean;
  loading: boolean;
  error: string | null;
  load: (userId: string) => Promise<void>;
  saveName: (userId: string, name: string) => Promise<void>;
  savePreferences: (userId: string, patch: Partial<ProfilePreferences>) => Promise<void>;
  setAvatarUrl: (url: string) => void;
  reset: () => void;
}

const INITIAL = {
  name: '',
  avatarUrl: null,
  preferences: DEFAULT_PREFERENCES,
  loaded: false,
  loading: false,
  error: null,
};

export const useProfileStore = create<ProfileState>((set, get) => ({
  ...INITIAL,

  /**
   * Loads the profile once per session.
   *
   * A failure here used to be silent: without a catch the rejection went
   * unhandled, `loaded` stayed false, and `preferences` kept its defaults —
   * so someone who had chosen kg saw every weight in the app labelled lb.
   * Showing the wrong unit is worse than showing an error, so a failure is
   * now recorded and surfaced, and the caller can retry.
   */
  load: async (userId) => {
    if (get().loaded || get().loading) return;
    set({ loading: true, error: null });
    try {
      const profile = await fetchProfile(userId);
      set({
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        preferences: {
          ...DEFAULT_PREFERENCES,
          ...profile.preferences,
          // Nested record needs its own merge, otherwise a profile saved
          // before a category existed would drop that category's default.
          articleNotifications: {
            ...DEFAULT_PREFERENCES.articleNotifications,
            ...(profile.preferences?.articleNotifications ?? {}),
          },
        },
        loaded: true,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load your profile' });
    } finally {
      set({ loading: false });
    }
  },

  saveName: async (userId, name) => {
    await updateProfileName(userId, name);
    set({ name });
  },

  savePreferences: async (userId, patch) => {
    const merged = { ...get().preferences, ...patch };
    await updateProfilePreferences(userId, merged);
    set({ preferences: merged });
  },

  setAvatarUrl: (url) => set({ avatarUrl: url }),

  reset: () => set(INITIAL),
}));
