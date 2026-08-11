import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  isInitializing: boolean;
  /**
   * Set only by the sign-in screen on a successful submit, so the welcome
   * greeting fires when someone actually signs back in. Deliberately not
   * driven off the SIGNED_IN auth event, which also fires when a stored
   * session is restored — that would greet you on every reload — nor set
   * by sign-up, where "welcome back" would be wrong. Consumed once by
   * WelcomeBackBanner, which clears it as it starts animating.
   */
  justSignedIn: boolean;
  markJustSignedIn: () => void;
  clearJustSignedIn: () => void;
  signOut: () => Promise<void>;
  /**
   * Forces the local session to null without waiting on Supabase's own
   * sign-out network call. Only meant for the case where the account has
   * already been deleted server-side and signOut() itself then fails — at
   * that point there's no account left to retry against, so the app must
   * still drop back to the Auth flow rather than stay stuck showing a
   * session for a user that no longer exists.
   */
  clearSessionLocally: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // supabase-js's own methods resolve with { data, error } rather than
  // rejecting for expected failures, but nothing guarantees that holds for
  // every edge case (a corrupted AsyncStorage entry, an unexpected error
  // from a future version). Without this catch, any rejection here would
  // leave isInitializing stuck true forever — RootNavigator shows its
  // loading spinner and never moves past it, with no way out but force-
  // quitting the app.
  supabase.auth
    .getSession()
    .then(({ data }) => {
      set({ session: data.session, isInitializing: false });
    })
    .catch(() => {
      set({ session: null, isInitializing: false });
    });

  supabase.auth.onAuthStateChange((_event, session) => {
    set({ session, isInitializing: false });
  });

  return {
    session: null,
    isInitializing: true,
    justSignedIn: false,
    markJustSignedIn: () => set({ justSignedIn: true }),
    clearJustSignedIn: () => set({ justSignedIn: false }),
    signOut: async () => {
      await supabase.auth.signOut();
      // Otherwise a flag left over from a sign-in that never got greeted
      // (signed out before Home mounted) would fire on the next account.
      set({ justSignedIn: false });
    },
    clearSessionLocally: () => set({ session: null, justSignedIn: false }),
  };
});
