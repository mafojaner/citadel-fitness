import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { fetchArticles } from '../lib/articles';
import type { Article } from '../types/models';

export function useArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchArticles()
      .then((data) => {
        if (!cancelled) setArticles(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setArticles([]);
          setError(err instanceof Error ? err.message : 'Failed to load articles');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(load);

  return { articles, loading, error, reload: load };
}
