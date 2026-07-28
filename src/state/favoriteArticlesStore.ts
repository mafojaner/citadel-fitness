import { create } from 'zustand';
import {
  addFavoriteArticle,
  fetchFavoriteArticleIds,
  removeFavoriteArticle,
} from '../lib/articles';

interface FavoriteArticlesState {
  ids: Set<string>;
  pending: Set<string>;
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
  toggle: (userId: string, articleId: string) => Promise<void>;
  reset: () => void;
}

const INITIAL = {
  ids: new Set<string>(),
  pending: new Set<string>(),
  loaded: false,
  loading: false,
  error: null,
  activeUserId: null,
};

/**
 * Shared across NewsletterScreen and ArticleDetailScreen so favoriting from
 * either place stays in sync without prop drilling — same pattern as
 * profileStore. Loaded once per session; toggle is optimistic and reverts
 * on failure so a flaky request doesn't leave the UI lying about state.
 *
 * Every commit inside `load` is gated on `activeUserId` still matching
 * `userId`, and `reset()` (called on sign-out) clears `activeUserId` —
 * without that, signing out and into a different account while this fetch
 * is still in flight could let account A's stale response land after
 * account B's session has started, silently showing A's favorited
 * articles while signed in as B.
 */
export const useFavoriteArticlesStore = create<FavoriteArticlesState>((set, get) => ({
  ...INITIAL,

  load: async (userId) => {
    if (get().loaded || get().loading) return;
    set({ loading: true, error: null, activeUserId: userId });
    try {
      const ids = await fetchFavoriteArticleIds(userId);
      if (get().activeUserId !== userId) return;
      set({ ids: new Set(ids), loaded: true });
    } catch (err) {
      if (get().activeUserId !== userId) return;
      set({ error: err instanceof Error ? err.message : 'Failed to load favorites' });
    } finally {
      if (get().activeUserId === userId) set({ loading: false });
    }
  },

  toggle: async (userId, articleId) => {
    if (get().pending.has(articleId)) return;

    const wasFavorited = get().ids.has(articleId);
    const nextIds = new Set(get().ids);
    wasFavorited ? nextIds.delete(articleId) : nextIds.add(articleId);
    set((state) => ({ ids: nextIds, pending: new Set(state.pending).add(articleId) }));

    try {
      if (wasFavorited) {
        await removeFavoriteArticle(userId, articleId);
      } else {
        await addFavoriteArticle(userId, articleId);
      }
    } catch (err) {
      // Revert the optimistic change; leave other favorites untouched.
      const revertedIds = new Set(get().ids);
      wasFavorited ? revertedIds.add(articleId) : revertedIds.delete(articleId);
      set({
        ids: revertedIds,
        error: err instanceof Error ? err.message : 'Failed to update favorite',
      });
    } finally {
      set((state) => {
        const nextPending = new Set(state.pending);
        nextPending.delete(articleId);
        return { pending: nextPending };
      });
    }
  },

  reset: () => set(INITIAL),
}));
