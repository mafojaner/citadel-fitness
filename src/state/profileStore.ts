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
  preferences: ProfilePreferences;
  loaded: boolean;
  loading: boolean;
  load: (userId: string) => Promise<void>;
  saveName: (userId: string, name: string) => Promise<void>;
  savePreferences: (userId: string, patch: Partial<ProfilePreferences>) => Promise<void>;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  name: '',
  preferences: DEFAULT_PREFERENCES,
  loaded: false,
  loading: false,

  load: async (userId) => {
    if (get().loaded || get().loading) return;
    set({ loading: true });
    try {
      const profile = await fetchProfile(userId);
      set({
        name: profile.name,
        preferences: { ...DEFAULT_PREFERENCES, ...profile.preferences },
        loaded: true,
      });
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

  reset: () => set({ name: '', preferences: DEFAULT_PREFERENCES, loaded: false, loading: false }),
}));
