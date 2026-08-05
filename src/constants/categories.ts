import { Ionicons } from '@expo/vector-icons';
import { gradients } from '../theme/tokens';
import type { Category } from '../types/models';

export const CATEGORY_FILTERS: { label: string; value: Category | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Chest', value: 'chest' },
  { label: 'Back', value: 'back' },
  { label: 'Legs', value: 'legs' },
  { label: 'Arms', value: 'arms' },
  { label: 'Core', value: 'core' },
  { label: 'Cardio', value: 'cardio' },
  { label: 'Boxing', value: 'boxing' },
  { label: 'Glutes', value: 'glutes' },
];

export const CATEGORY_ICONS: Partial<Record<Category, keyof typeof Ionicons.glyphMap>> = {
  chest: 'barbell-outline',
  back: 'body-outline',
  legs: 'walk-outline',
  arms: 'accessibility-outline',
  core: 'sync-outline',
  cardio: 'heart-outline',
  boxing: 'hand-left-outline',
  glutes: 'contract-outline',
};

export const DEFAULT_CATEGORY_ICON: keyof typeof Ionicons.glyphMap = 'fitness-outline';

export const CATEGORY_GRADIENTS: Partial<Record<Category, readonly [string, string, ...string[]]>> = {
  chest: gradients.volume,
  back: gradients.calendar,
  legs: gradients.flame,
  arms: gradients.arms,
  core: gradients.identity,
  cardio: gradients.pulse,
  boxing: gradients.favorite,
  glutes: gradients.action,
};

export const DEFAULT_CATEGORY_GRADIENT = gradients.volume;
