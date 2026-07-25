import { Ionicons } from '@expo/vector-icons';
import { gradients } from '../theme/tokens';
import type { Category } from '../types/models';

export const CATEGORY_FILTERS: { label: string; value: Category | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Chest', value: 'chest' },
  { label: 'Back', value: 'back' },
  { label: 'Legs', value: 'legs' },
  { label: 'Cardio', value: 'cardio' },
];

export const CATEGORY_ICONS: Partial<Record<Category, keyof typeof Ionicons.glyphMap>> = {
  chest: 'barbell-outline',
  back: 'body-outline',
  legs: 'walk-outline',
  cardio: 'heart-outline',
};

export const DEFAULT_CATEGORY_ICON: keyof typeof Ionicons.glyphMap = 'fitness-outline';

export const CATEGORY_GRADIENTS: Partial<Record<Category, readonly [string, string, ...string[]]>> = {
  chest: gradients.volume,
  back: gradients.calendar,
  legs: gradients.flame,
  cardio: gradients.pulse,
};

export const DEFAULT_CATEGORY_GRADIENT = gradients.volume;
