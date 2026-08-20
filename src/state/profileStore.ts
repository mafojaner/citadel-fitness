import { create } from 'zustand';
import type { MembershipTier } from '../lib/membership';
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
  /**
   * When this account started paying, or null on the free tier — for either
   * paid tier, despite the name. Kept as `fortressSince` because the field
   * is persisted: renaming it would read as absent on every device that
   * rehydrates an older store. Ask useMembershipTier which tier, not this.
   */
  fortressSince: string | null;
  membershipTier: MembershipTier;
  preferences: ProfilePreferences;
  loaded: boolean;
  loading: boolean;
  error: string | null;
  /**
   * Whichever user's data this store should currently reflect. Not read by
   * any screen — purely internal bookkeeping so a slow response for a
   * previous account can recognize it's stale. See the comment on `load`.
   */
  activeUserId: string | null;
  load: (userId: string) => Promise<void>;
  saveName: (userId: string, name: string) => Promise<void>;
  savePreferences: (userId: string, patch: Partial<ProfilePreferences>) => Promise<void>;
  /** null when the photo is removed, which clears it back to the initials fallback. */
  setAvatarUrl: (url: string | null) => void;
  reset: () => void;
}

// Typed rather than inferred: without it `membershipTier` widens to string
// and stops being assignable to MembershipTier, which is exactly the
// narrowing that keeps a stray tier value out of the store.
const INITIAL: Pick<
  ProfileState,
  'name' | 'avatarUrl' | 'fortressSince' | 'membershipTier' | 'preferences' | 'loaded' | 'loading' | 'error' | 'activeUserId'
> = {
  name: '',
  avatarUrl: null,
  fortressSince: null,
  membershipTier: 'free',
  preferences: DEFAULT_PREFERENCES,
  loaded: false,
  loading: false,
  error: null,
  activeUserId: null,
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
   *
   * Every commit below is gated on `activeUserId` still matching `userId`.
   * Without that, signing out and into a different account while this
   * fetch is still in flight — slow network, quick account switch — could
   * let account A's stale response land after account B's has already
   * loaded, silently showing A's name, avatar, and units while signed in
   * as B. `reset()` (called on sign-out) clears `activeUserId`, which is
   * what makes an in-flight response for the old account recognizable as
   * stale once it resolves.
   */
  load: async (userId) => {
    if (get().loaded || get().loading) return;
    set({ loading: true, error: null, activeUserId: userId });
    try {
      const profile = await fetchProfile(userId);
      if (get().activeUserId !== userId) return;
      set({
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        fortressSince: profile.fortressSince,
        membershipTier: profile.membershipTier,
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
      if (get().activeUserId !== userId) return;
      set({ error: err instanceof Error ? err.message : 'Failed to load your profile' });
    } finally {
      if (get().activeUserId === userId) set({ loading: false });
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
