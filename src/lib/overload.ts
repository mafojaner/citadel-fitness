import { supabase } from './supabase';
import type { WeightUnit } from '../types/models';

/**
 * What the lifter should do next on a lift, and why.
 *
 * There is no client-side copy of the rules on purpose. They live in
 * `get_overload_suggestions` and nowhere else, because the gate has to be
 * server-side (the feature is a computation over rows the member already
 * owns) and two expressions of the same rule drift -- which is how the
 * weekly digest ended up entitling a different set of people than every
 * other feature. This module fetches and types; it decides nothing.
 */
export type OverloadAction = 'add_weight' | 'add_rep' | 'hold' | 'deload';

/** How much history the suggestion rests on. Shown, never hidden. */
export type OverloadConfidence = 'low' | 'medium' | 'high';

export interface OverloadSuggestion {
  exerciseId: string;
  exerciseName: string;
  unit: WeightUnit;
  lastDate: string;
  lastWeight: number;
  lastReps: number;
  lastRpe: number | null;
  sessions: number;
  action: OverloadAction;
  suggestedWeight: number;
  suggestedReps: number;
  /** The sentence explaining the row. Always present, always shown. */
  rationale: string;
  confidence: OverloadConfidence;
}

/** Short label for the action, for a chip beside the lift's name. */
export function actionLabel(action: OverloadAction): string {
  switch (action) {
    case 'add_weight':
      return 'Add weight';
    case 'add_rep':
      return 'Add a rep';
    case 'hold':
      return 'Repeat';
    case 'deload':
      return 'Back off';
  }
}

/**
 * Whether this row is telling you to ease off rather than push.
 *
 * Used for the one spot of colour on the screen. A deload and an RPE hold
 * are the two rows a lifter most needs to notice, because they are the ones
 * arguing against what they probably want to do.
 */
export function isCaution(action: OverloadAction): boolean {
  return action === 'deload' || action === 'hold';
}

export function confidenceLabel(confidence: OverloadConfidence, sessions: number): string {
  const sessionText = `${sessions} session${sessions === 1 ? '' : 's'}`;
  switch (confidence) {
    case 'high':
      return `From ${sessionText} with effort logged`;
    case 'medium':
      return `From ${sessionText}`;
    case 'low':
      // Named rather than softened: two sessions is thin, and a suggestion
      // presented with more certainty than it has is how someone ends up
      // trusting it over how the set actually felt.
      return `From ${sessionText} only — treat as a starting point`;
  }
}

export async function fetchOverloadSuggestions(
  weightUnit: WeightUnit
): Promise<OverloadSuggestion[]> {
  const { data, error } = await supabase.rpc('get_overload_suggestions', {
    p_weight_unit: weightUnit,
  });
  if (error) throw error;
  return (data ?? []) as OverloadSuggestion[];
}
