import { supabase } from './supabase';
import type { WeightUnit } from '../types/models';

export interface PeriodTotals {
  sets: number;
  activeDays: number;
  volume: number;
}

export interface PeriodComparison {
  current: PeriodTotals;
  previous: PeriodTotals;
}

/**
 * This window against the one immediately before it.
 *
 * "42 sets in 30 days" means nothing on its own; against the prior 30 days it
 * becomes a direction, which is the promise of an analytics tier.
 */
export async function fetchPeriodComparison(
  days: number,
  weightUnit: WeightUnit
): Promise<PeriodComparison> {
  const { data, error } = await supabase.rpc('get_period_comparison', {
    p_days: days,
    p_weight_unit: weightUnit,
  });
  if (error) throw error;
  return data as PeriodComparison;
}

/**
 * The change between two windows, as a whole percent.
 *
 * Null when the previous window is empty rather than reporting an infinite
 * rise: everything is up from nothing, and "+100%" against a week nobody
 * trained is a number that flatters without informing.
 */
export function changePct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
