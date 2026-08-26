import { useCallback } from 'react';
import { isRetriableError } from '../lib/offlineQueue';
import { supabase } from '../lib/supabase';
import { buildSaveWorkoutParams } from '../lib/workouts';
import { useOfflineQueueStore } from '../state/offlineQueueStore';
import type { DistanceUnit, LoggedExercise, WeightUnit } from '../types/models';
import { useHasTier } from './useMembership';

/** What happened, so the screen can say the right thing. */
export type SaveOutcome = 'saved' | 'queued';

/**
 * Save a workout, falling back to the offline queue for members.
 *
 * Offline mode is a Fortress feature, and this is where that line is drawn.
 * It is drawn narrowly on purpose: a free account that saves with no signal
 * still keeps its draft, because the draft store is persisted, so nothing is
 * destroyed either way. What a member buys is the app retrying for them
 * instead of them remembering to. Charging for *not losing someone's data*
 * would be a different and much worse product decision, and the draft is
 * what makes it unnecessary.
 *
 * A save is only queued when the request never reached the server. Anything
 * the server actively rejected is thrown, because it will be rejected
 * identically forever and a queue that keeps retrying it hides the real
 * failure behind an indicator that never clears.
 */
export function useSaveWorkout() {
  const isMember = useHasTier('fortress');
  const enqueue = useOfflineQueueStore((s) => s.enqueue);

  return useCallback(
    async (
      date: string,
      exercises: LoggedExercise[],
      weightUnit: WeightUnit,
      distanceUnit: DistanceUnit
    ): Promise<SaveOutcome> => {
      const params = buildSaveWorkoutParams(date, exercises, weightUnit, distanceUnit);
      const { error } = await supabase.rpc('save_workout', params);

      if (!error) return 'saved';
      if (isMember && isRetriableError(error)) {
        enqueue(date, params);
        return 'queued';
      }
      throw error;
    },
    [isMember, enqueue]
  );
}
