import { useCallback } from 'react';
import { fetchWorkoutForDate } from '../lib/workouts';
import { useAuthStore } from '../state/authStore';
import { useProfileStore } from '../state/profileStore';
import { useWorkoutDraftStore } from '../state/workoutDraftStore';

/**
 * The one correct way to open the workout draft for a date: always checks
 * the database first, so a day that already has saved exercises is loaded
 * rather than treated as empty. save_workout replaces a day's exercises
 * wholesale (see supabase/migration_005_transactional_save_workout.sql), so
 * opening a draft that's blind to what's already saved and then confirming
 * it wipes out whatever was entered earlier that day through another entry
 * point. Every screen that opens the Add Workout draft — Home's "Log
 * workout", the Workouts calendar, and Add Workout's own date switcher —
 * must route through this single implementation rather than each deciding
 * for itself when to call ensureDraftFor vs. loadFromExisting.
 */
export function useOpenWorkoutDraft() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const units = useProfileStore((s) => s.preferences.units);
  const distanceUnit = useProfileStore((s) => s.preferences.distanceUnit);
  const loadFromExisting = useWorkoutDraftStore((s) => s.loadFromExisting);
  const ensureDraftFor = useWorkoutDraftStore((s) => s.ensureDraftFor);

  return useCallback(
    async (date: string) => {
      if (!userId) return;
      const existing = await fetchWorkoutForDate(userId, date);
      if (existing && existing.length > 0) {
        loadFromExisting(date, existing, units, distanceUnit);
      } else {
        // Keeps an unsaved draft for this day rather than discarding it.
        ensureDraftFor(date);
      }
    },
    [userId, units, distanceUnit, loadFromExisting, ensureDraftFor]
  );
}
