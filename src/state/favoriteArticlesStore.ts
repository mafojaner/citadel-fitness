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
  load: (userId: string) => Promise<void>;
  toggle: (userId: string, articleId: string) => Promise<void>;
  reset: () => void;
}

/**
 * Shared across NewsletterScreen and ArticleDetailScreen so favoriting from
 * either place stays in sync without prop drilling — same pattern as
 * profileStore. Loaded once per session; toggle is optimistic and reverts
 * on failure so a flaky request doesn't leave the UI lying about state.
 */
export const useFavoriteArticlesStore = create<FavoriteArticlesState>((set, get) => ({
  ids: new Set(),
  pending: new Set(),
  loaded: false,
  loading: false,
  error: null,

  load: async (userId) => {
    if (get().loaded || get().loading) return;
    set({ loading: true, error: null });
    try {
      const ids = await fetchFavoriteArticleIds(userId);
      set({ ids: new Set(ids), loaded: true });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load favorites' });
    } finally {
      set({ loading: false });
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

  reset: () => set({ ids: new Set(), pending: new Set(), loaded: false, loading: false, error: null }),
}));
