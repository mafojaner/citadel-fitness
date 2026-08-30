import { supabase } from './supabase';

/**
 * Nutrition coaching: say what you are after, a coach writes a plan back.
 *
 * One open intake at a time, enforced by a partial unique index rather than
 * by this module. A form check is a repeated transaction and is capped per
 * month; a plan is a conversation, so the constraint is that you cannot
 * have two of them going at once. Every decision lives in the database for
 * the usual reason -- two copies of a rule drift.
 */
export type NutritionStatus = 'submitted' | 'in_review' | 'answered' | 'withdrawn';

export interface NutritionIntake {
  id: string;
  goal: string;
  bodyWeightKg: number | null;
  heightCm: number | null;
  activityLevel: string | null;
  restrictions: string | null;
  typicalDay: string | null;
  status: NutritionStatus;
  createdAt: string;
  answeredAt: string | null;
  coachPlan: string | null;
}

interface DbIntake {
  id: string;
  goal: string;
  body_weight_kg: number | null;
  height_cm: number | null;
  activity_level: string | null;
  restrictions: string | null;
  typical_day: string | null;
  status: NutritionStatus;
  created_at: string;
  answered_at: string | null;
  coach_plan: string | null;
}

export function nutritionStatusLabel(status: NutritionStatus): string {
  switch (status) {
    case 'submitted':
      return 'Waiting for a coach';
    case 'in_review':
      return 'Being written';
    case 'answered':
      return 'Plan ready';
    case 'withdrawn':
      return 'Withdrawn';
  }
}

/** True while a conversation is in flight, which is what blocks a new one. */
export function isOpen(intake: NutritionIntake): boolean {
  return intake.status === 'submitted' || intake.status === 'in_review';
}

export async function fetchNutritionIntakes(userId: string): Promise<NutritionIntake[]> {
  const { data, error } = await supabase
    .from('nutrition_intakes')
    .select(
      'id, goal, body_weight_kg, height_cm, activity_level, restrictions, typical_day, status, created_at, answered_at, coach_plan'
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .returns<DbIntake[]>();

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    goal: row.goal,
    bodyWeightKg: row.body_weight_kg,
    heightCm: row.height_cm,
    activityLevel: row.activity_level,
    restrictions: row.restrictions,
    typicalDay: row.typical_day,
    status: row.status,
    createdAt: row.created_at,
    answeredAt: row.answered_at,
    coachPlan: row.coach_plan,
  }));
}

export async function submitNutritionIntake(input: {
  goal: string;
  bodyWeightKg?: number | null;
  heightCm?: number | null;
  activityLevel?: string;
  restrictions?: string;
  typicalDay?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('submit_nutrition_intake', {
    p_goal: input.goal,
    p_body_weight_kg: input.bodyWeightKg ?? null,
    p_height_cm: input.heightCm ?? null,
    p_activity_level: input.activityLevel ?? null,
    p_restrictions: input.restrictions ?? null,
    p_typical_day: input.typicalDay ?? null,
  });
  if (error) throw error;
  return data as string;
}

/** Closes the conversation and frees the one open slot. */
export async function withdrawNutritionIntake(id: string): Promise<void> {
  const { error } = await supabase
    .from('nutrition_intakes')
    .update({ status: 'withdrawn' })
    .eq('id', id);
  if (error) throw error;
}
