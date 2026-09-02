import { supabase } from './supabase';
import type { WeightUnit } from '../types/models';

export interface RecordSetOn {
  exerciseName: string;
  weight: number;
  reps: number;
}

/**
 * Personal records that were set on a given day and still stand.
 *
 * Called immediately after a workout saves, so "still stand" and "just set"
 * are the same thing. A lift that has since been beaten is deliberately
 * absent -- announcing a superseded record would be worse than announcing
 * nothing. See the migration for why that is the chosen semantics.
 */
export async function fetchRecordsSetOn(
  date: string,
  weightUnit: WeightUnit
): Promise<RecordSetOn[]> {
  const { data, error } = await supabase.rpc('get_records_set_on', {
    p_date: date,
    p_weight_unit: weightUnit,
  });
  if (error) throw error;
  return (data as RecordSetOn[]) ?? [];
}
