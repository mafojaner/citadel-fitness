import { supabase } from './supabase';
import type { Article, ArticleCategory } from '../types/models';

interface DbArticle {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: ArticleCategory;
  read_minutes: number;
  published_at: string;
}

function toArticle(row: DbArticle): Article {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    body: row.body,
    category: row.category,
    readMinutes: row.read_minutes,
    publishedAt: row.published_at,
  };
}

export async function fetchArticles(): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, summary, body, category, read_minutes, published_at')
    .order('published_at', { ascending: false })
    .returns<DbArticle[]>();

  if (error) throw error;
  return (data ?? []).map(toArticle);
}

export async function fetchArticleById(id: string): Promise<Article | null> {
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, summary, body, category, read_minutes, published_at')
    .eq('id', id)
    .maybeSingle<DbArticle>();

  if (error) throw error;
  return data ? toArticle(data) : null;
}

/**
 * Articles published after `since`, oldest first. Backs the "what's new
 * since you last looked" notification check.
 */
export async function fetchArticlesSince(since: string): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('id, title, summary, body, category, read_minutes, published_at')
    .gt('published_at', since)
    .order('published_at', { ascending: true })
    .returns<DbArticle[]>();

  if (error) throw error;
  return (data ?? []).map(toArticle);
}
