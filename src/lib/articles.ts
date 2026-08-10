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

export function formatPublished(iso: string) {
  const published = new Date(iso);
  const days = Math.floor((Date.now() - published.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return published.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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

export async function fetchFavoriteArticleIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('article_favorites')
    .select('article_id')
    .eq('user_id', userId);

  if (error) throw error;
  return (data ?? []).map((row) => row.article_id as string);
}

export async function addFavoriteArticle(userId: string, articleId: string): Promise<void> {
  const { error } = await supabase
    .from('article_favorites')
    .insert({ user_id: userId, article_id: articleId });

  if (error) throw error;
}

export async function removeFavoriteArticle(userId: string, articleId: string): Promise<void> {
  const { error } = await supabase
    .from('article_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('article_id', articleId);

  if (error) throw error;
}
