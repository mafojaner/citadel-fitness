import { Ionicons } from '@expo/vector-icons';
import { gradients } from '../theme/tokens';
import type { ArticleCategory } from '../types/models';

export const ARTICLE_CATEGORY_FILTERS: { label: string; value: ArticleCategory | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Splits', value: 'splits' },
  { label: 'Exercises', value: 'exercise' },
  { label: 'Nutrition', value: 'nutrition' },
  { label: 'Recovery', value: 'recovery' },
];

/** Full labels, used on cards and in notifications where there's room. */
export const ARTICLE_CATEGORY_LABELS: Record<ArticleCategory, string> = {
  splits: 'Workout Splits',
  exercise: 'Exercise Guides',
  nutrition: 'Nutrition',
  recovery: 'Recovery & Mobility',
};

export const ARTICLE_CATEGORY_ICONS: Record<ArticleCategory, keyof typeof Ionicons.glyphMap> = {
  splits: 'grid',
  exercise: 'barbell',
  nutrition: 'nutrition',
  recovery: 'moon',
};

export const ARTICLE_CATEGORY_GRADIENTS: Record<
  ArticleCategory,
  readonly [string, string, ...string[]]
> = {
  splits: gradients.calendar,
  exercise: gradients.volume,
  nutrition: gradients.flame,
  recovery: gradients.pulse,
};
