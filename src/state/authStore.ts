import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  isInitializing: boolean;
  signOut: () => Promise<void>;
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
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };
});
