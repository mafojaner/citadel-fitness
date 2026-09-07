import { Ionicons } from '@expo/vector-icons';
import { gradients, iconInk, type IconInk } from '../theme/tokens';
import type { Category } from '../types/models';

export const CATEGORY_FILTERS: { label: string; value: Category | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Chest', value: 'chest' },
  { label: 'Back', value: 'back' },
  { label: 'Legs', value: 'legs' },
  // Between legs and arms rather than appended to the end: the list
  // reads top-down through the body, and a category bolted on after
  // Glutes would look like the afterthought it was.
  { label: 'Shoulders', value: 'shoulders' },
  { label: 'Arms', value: 'arms' },
  { label: 'Core', value: 'core' },
  { label: 'Cardio', value: 'cardio' },
  { label: 'Boxing', value: 'boxing' },
  { label: 'Glutes', value: 'glutes' },
];

/**
 * Ionicons has no anatomy, so none of these is a picture of a muscle. The
 * bar they have to clear is lower and still worth clearing: be distinct
 * from each other, and don't mean something else.
 *
 * Three did not. Chest and shoulders were the same barbell, so two tiles in
 * the grid were identical. Core was `sync`, which is the refresh arrows
 * every app uses for reloading. Glutes was `contract`, which is the
 * collapse-inward arrows. The last two were not weak metaphors, they were
 * other software's vocabulary sitting on a muscle group.
 */
export const CATEGORY_ICONS: Partial<Record<Category, keyof typeof Ionicons.glyphMap>> = {
  chest: 'barbell-outline',
  back: 'body-outline',
  legs: 'walk-outline',
  // The figure with its arms out, which is the one glyph in the set that
  // actually describes a shoulder movement.
  shoulders: 'accessibility-outline',
  // A dumbbell, for the one group whose whole vocabulary is dumbbells.
  arms: 'fitness-outline',
  core: 'ellipse-outline',
  cardio: 'heart-outline',
  boxing: 'hand-left-outline',
  glutes: 'footsteps-outline',
};

export const DEFAULT_CATEGORY_ICON: keyof typeof Ionicons.glyphMap = 'fitness-outline';

/**
 * One warm-to-cool sweep down the body, and the two conditioning categories
 * sitting outside it in red.
 *
 * A rule rather than nine choices, because nine separate choices is what
 * this was: the old map borrowed a ramp per category from `gradients`, so
 * shoulders were leaderboard gold and boxing was the `favorite` pink, and
 * there was no way to tell a decision from a leftover. Reading top to
 * bottom -- chest, shoulders, arms, back, core, glutes, legs -- the hue
 * cools, which makes the grid a sequence instead of a scatter and makes a
 * new category obvious to place.
 *
 * Cardio and boxing are the exception on purpose: they are the two that are
 * about the heart rather than a muscle, so they are the two in red.
 */
export const CATEGORY_INK: Partial<Record<Category, IconInk>> = {
  chest: iconInk.ember,
  shoulders: iconInk.flare,
  arms: iconInk.amber,
  back: iconInk.gold,
  core: iconInk.mint,
  glutes: iconInk.cyan,
  legs: iconInk.azure,
  cardio: iconInk.crimson,
  boxing: iconInk.rose,
};

export const DEFAULT_CATEGORY_INK: IconInk = iconInk.ember;

/** Still the ramps, for the two places that draw a real gradient: the Plans page and rank medals. */
export const CATEGORY_GRADIENTS: Partial<Record<Category, readonly [string, string, ...string[]]>> = {
  chest: gradients.volume,
  back: gradients.calendar,
  legs: gradients.flame,
  shoulders: gradients.rankGold,
  arms: gradients.arms,
  core: gradients.identity,
  cardio: gradients.pulse,
  boxing: gradients.favorite,
  glutes: gradients.action,
};

export const DEFAULT_CATEGORY_GRADIENT = gradients.volume;
