import { Ionicons } from '@expo/vector-icons';
import { gradients, iconInk, type IconInk } from '../theme/tokens';
import type { ArticleCategory } from '../types/models';

export const ARTICLE_CATEGORY_FILTERS: { label: string; value: ArticleCategory | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Splits', value: 'splits' },
  { label: 'Exercises', value: 'exercise' },
  { label: 'Nutrition', value: 'nutrition' },
  { label: 'Recovery', value: 'recovery' },
  { label: 'App Updates', value: 'updates' },
];

/** Full labels, used on cards and in notifications where there's room. */
export const ARTICLE_CATEGORY_LABELS: Record<ArticleCategory, string> = {
  splits: 'Workout Splits',
  exercise: 'Exercise Guides',
  nutrition: 'Nutrition',
  recovery: 'Recovery & Mobility',
  updates: 'App Updates',
};

export const ARTICLE_CATEGORY_ICONS: Record<ArticleCategory, keyof typeof Ionicons.glyphMap> = {
  splits: 'grid',
  exercise: 'barbell',
  nutrition: 'nutrition',
  recovery: 'moon',
  updates: 'megaphone',
};

/**
 * Keyed to what the category is about, like every other icon in the app.
 * These were ramps borrowed from `gradients`, which put nutrition in the
 * orange-to-pink `flame` and recovery in the cardio-chart `pulse`.
 */
export const ARTICLE_CATEGORY_INK: Record<ArticleCategory, IconInk> = {
  splits: iconInk.ember,
  exercise: iconInk.flare,
  nutrition: iconInk.mint,
  recovery: iconInk.azure,
  // Still deliberately distinct from the fitness-content categories above:
  // this is a product announcement, not workout content.
  updates: iconInk.violet,
};

export const ARTICLE_CATEGORY_GRADIENTS: Record<
  ArticleCategory,
  readonly [string, string, ...string[]]
> = {
  splits: gradients.calendar,
  exercise: gradients.volume,
  nutrition: gradients.flame,
  recovery: gradients.pulse,
  // Deliberately distinct from the fitness-content categories above — this
  // is a product/brand announcement, not workout content.
  updates: gradients.identity,
};

/**
 * The one spot of colour a category gets.
 *
 * The newsletter used to be built from colour -- gradient-filled tiles, a
 * gradient disc on every row -- which made the category the loudest thing on
 * a screen whose actual content is the writing. It now carries colour on the
 * category's own icon instead, which is a shape that already means something
 * rather than a mark added beside it.
 */
export function articleCategoryInk(category: ArticleCategory): IconInk {
  return ARTICLE_CATEGORY_INK[category];
}
