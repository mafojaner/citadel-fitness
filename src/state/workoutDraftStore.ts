import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { todayISO } from '../lib/analytics';
import { convertDistance, convertWeight, roundForDisplay } from '../lib/units';
import type { WorkoutDetailExercise } from '../lib/workouts';
import type { DistanceUnit, Exercise, LoggedExercise, SetEntry, WeightUnit } from '../types/models';

interface WorkoutDraftState {
  date: string;
  exercises: LoggedExercise[];
  addExercise: (exercise: Exercise) => void;
  removeExercise: (loggedExerciseId: string) => void;
  addSet: (loggedExerciseId: string) => void;
  updateSet: (loggedExerciseId: string, setId: string, patch: Partial<SetEntry>) => void;
  removeSet: (loggedExerciseId: string, setId: string) => void;
  reset: (date?: string) => void;
  ensureDraftFor: (date: string) => void;
  loadFromExisting: (
    date: string,
    exercises: WorkoutDetailExercise[],
    currentWeightUnit: WeightUnit,
    currentDistanceUnit: DistanceUnit
  ) => void;
}

const makeId = () => Math.random().toString(36).slice(2, 10);

/**
 * Persisted to device storage: logging happens at the gym, where the OS can
 * kill a backgrounded app at any point. Without this, an in-progress workout
 * is lost silently. Only `date` and `exercises` are stored — the action
 * functions are recreated from the initializer on load.
 */
export const useWorkoutDraftStore = create<WorkoutDraftState>()(
  persist(
    (set) => ({
      date: todayISO(),
      exercises: [],

      addExercise: (exercise) =>
        set((state) => ({
          exercises: [
            ...state.exercises,
            {
              id: makeId(),
              exerciseId: exercise.id,
              sets: [
                { id: makeId(), setNumber: 1, reps: 0, weight: 0, durationMinutes: 0, distance: 0 },
              ],
            },
          ],
        })),

      removeExercise: (loggedExerciseId) =>
        set((state) => ({
          exercises: state.exercises.filter((e) => e.id !== loggedExerciseId),
        })),

      addSet: (loggedExerciseId) =>
        set((state) => ({
          exercises: state.exercises.map((e) =>
            e.id === loggedExerciseId
              ? {
                  ...e,
                  sets: [
                    ...e.sets,
                    {
                      id: makeId(),
                      setNumber: e.sets.length + 1,
                      reps: 0,
                      weight: 0,
                      durationMinutes: 0,
                      distance: 0,
                    },
                  ],
                }
              : e
          ),
        })),

      updateSet: (loggedExerciseId, setId, patch) =>
        set((state) => ({
          exercises: state.exercises.map((e) =>
            e.id === loggedExerciseId
              ? { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }
              : e
          ),
        })),

      removeSet: (loggedExerciseId, setId) =>
        set((state) => ({
          exercises: state.exercises.map((e) =>
            e.id === loggedExerciseId
              ? { ...e, sets: e.sets.filter((s) => s.id !== setId) }
              : e
          ),
        })),

      reset: (date) =>
        set({ date: date ?? todayISO(), exercises: [] }),

      /**
       * Opens the draft for a day without discarding work in progress.
       * A restored draft is only useful if entering the Add Workout screen
       * doesn't immediately clear it, so this keeps an existing draft when
       * it's for the same day and has content, and starts clean otherwise.
       */
      ensureDraftFor: (date) =>
        set((state) =>
          state.date === date && state.exercises.length > 0 ? {} : { date, exercises: [] }
        ),

      /**
       * Converts each set's weight/distance from whatever unit it was
       * originally logged in into the currently active preference. Without
       * this, editing an old kg-entry while now in lb mode would show its
       * raw kg number sitting in a field labelled "lb" — and re-saving it
       * unchanged would overwrite the correct kg record with a wrong lb one
       * (100 kg re-tagged as "100 lb" is a completely different, much
       * lighter weight). Converting on load means an edit always preserves
       * the actual physical weight/distance; only sets left untouched stay
       * in their original unit in the database.
       */
      loadFromExisting: (date, exercises, currentWeightUnit, currentDistanceUnit) =>
        set({
          date,
          exercises: exercises.map((e) => ({
            id: e.id,
            exerciseId: e.exerciseId,
            sets: e.sets.map((s) => ({
              id: s.id,
              setNumber: s.setNumber,
              reps: s.reps,
              weight: roundForDisplay(convertWeight(s.weight, s.weightUnit, currentWeightUnit)),
              durationMinutes: s.durationMinutes,
              distance: roundForDisplay(
                convertDistance(s.distance, s.distanceUnit, currentDistanceUnit)
              ),
            })),
          })),
        }),
    }),
    {
      name: 'citadel-fitness-workout-draft',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ date: state.date, exercises: state.exercises }),
    }
  )
);
