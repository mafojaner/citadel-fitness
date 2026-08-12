import { supabase } from './supabase';

const ML_PER_FL_OZ = 29.5735295625;

export function mlToOz(ml: number): number {
  return ml / ML_PER_FL_OZ;
}

export function ozToMl(oz: number): number {
  return oz * ML_PER_FL_OZ;
}

/** Rounds a stored ml amount for display in whichever unit the user prefers. */
export function formatWaterAmount(ml: number, unit: 'oz' | 'ml'): string {
  return unit === 'ml' ? `${Math.round(ml)} ml` : `${Math.round(mlToOz(ml))} fl oz`;
}

/**
 * Quick-add amounts, in ml, per unit — chosen to land on round numbers in
 * that unit once converted (a standard glass/bottle size) rather than
 * converting one canonical ml list and showing odd numbers like "237 ml".
 */
export const QUICK_ADD_ML: Record<'oz' | 'ml', number[]> = {
  oz: [ozToMl(8), ozToMl(16), ozToMl(24)].map(Math.round), // glass, bottle, large bottle
  ml: [250, 500, 750],
};

export interface WaterEntry {
  id: string;
  amountMl: number;
  createdAt: string;
}

export async function fetchTodayWaterEntries(userId: string, date: string): Promise<WaterEntry[]> {
  const { data, error } = await supabase
    .from('water_logs')
    .select('id, amount_ml, created_at')
    .eq('user_id', userId)
    .eq('logged_date', date)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, amountMl: row.amount_ml, createdAt: row.created_at }));
}

export async function logWater(userId: string, amountMl: number, date: string): Promise<WaterEntry> {
  const { data, error } = await supabase
    .from('water_logs')
    .insert({ user_id: userId, amount_ml: Math.round(amountMl), logged_date: date })
    .select('id, amount_ml, created_at')
    .single();
  if (error) throw error;
  return { id: data.id, amountMl: data.amount_ml, createdAt: data.created_at };
}

export async function deleteWaterEntry(entryId: string): Promise<void> {
  const { error } = await supabase.from('water_logs').delete().eq('id', entryId);
  if (error) throw error;
}
