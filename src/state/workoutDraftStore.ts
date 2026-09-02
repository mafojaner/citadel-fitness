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
  /** Replaces the draft with a program day's prescribed exercises and set counts. */
  loadFromProgram: (
    date: string,
    exercises: { exerciseId: string; targetSets: number; targetReps: number }[],
    advance: ProgramAdvance
  ) => void;
  /**
   * Set while the draft holds a program day that has not been saved yet.
   *
   * The program used to move on the moment a day was loaded into the draft,
   * on the reasoning that a session started is a session moved past. In
   * practice a draft gets loaded and abandoned all the time -- you check
   * what today is, get pulled away, come back tomorrow -- and every one of
   * those silently burned a day of the cycle, with nothing in the interface
   * able to step back.
   *
   * So the position rides along with the draft instead, and the advance
   * happens when the workout is actually saved.
   */
  programAdvance: ProgramAdvance | null;
  /** Called once the advance has been attempted, so a re-save cannot repeat it. */
  clearProgramAdvance: () => void;
}

export interface ProgramAdvance {
  /** The enrollment's next_position at the time the day was loaded. */
  position: number;
  /** How many days the program has, for the wrap-around. */
  cycleLength: number;
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
      programAdvance: null,

      addExercise: (exercise) =>
        set((state) => ({
          exercises: [
            ...state.exercises,
            {
              id: makeId(),
              exerciseId: exercise.id,
              sets: [
                { id: makeId(), setNumber: 1, reps: 0, weight: 0, durationSeconds: 0, distance: 0, rpe: null },
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
                      durationSeconds: 0,
                      distance: 0,
                      rpe: null,
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
        set({ date: date ?? todayISO(), exercises: [], programAdvance: null }),

      clearProgramAdvance: () => set({ programAdvance: null }),

      /**
       * Opens the draft for a day without discarding work in progress.
       * A restored draft is only useful if entering the Add Workout screen
       * doesn't immediately clear it, so this keeps an existing draft when
       * it's for the same day and has content, and starts clean otherwise.
       */
      ensureDraftFor: (date) =>
        set((state) =>
          state.date === date && state.exercises.length > 0
            ? {}
            : { date, exercises: [], programAdvance: null }
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
      /**
       * Pre-fills reps from the program's target so the numbers already
       * read as the prescription; weight is left at zero because only the
       * lifter knows what they're loading today. Replaces rather than
       * appends — the program is describing the whole session, and merging
       * it into an existing draft would silently duplicate exercises.
       */
      loadFromProgram: (date, exercises, advance) =>
        set({
          date,
          programAdvance: advance,
          exercises: exercises.map((entry) => ({
            id: makeId(),
            exerciseId: entry.exerciseId,
            sets: Array.from({ length: entry.targetSets }, (_, index) => ({
              id: makeId(),
              setNumber: index + 1,
              reps: entry.targetReps,
              weight: 0,
              durationSeconds: 0,
              distance: 0,
              rpe: null,
            })),
          })),
        }),

      loadFromExisting: (date, exercises, currentWeightUnit, currentDistanceUnit) =>
        set({
          date,
          // Editing an existing workout is not a program day, whatever the
          // draft happened to be holding a moment ago.
          programAdvance: null,
          exercises: exercises.map((e) => ({
            id: e.id,
            exerciseId: e.exerciseId,
            sets: e.sets.map((s) => ({
              id: s.id,
              setNumber: s.setNumber,
              reps: s.reps,
              weight: roundForDisplay(convertWeight(s.weight, s.weightUnit, currentWeightUnit)),
              durationSeconds: s.durationSeconds,
              distance: roundForDisplay(
                convertDistance(s.distance, s.distanceUnit, currentDistanceUnit)
              ),
              rpe: s.rpe,
            })),
          })),
        }),
    }),
    {
      name: 'citadel-fitness-workout-draft',
      storage: createJSONStorage(() => AsyncStorage),
      // programAdvance is persisted with the draft, not left in memory.
      // The whole reason this store is persisted is that the OS kills
      // backgrounded apps mid-workout; a program day that survived that but
      // lost its link to the enrollment would save fine and silently leave
      // the cycle parked on a day already trained.
      partialize: (state) => ({
        date: state.date,
        exercises: state.exercises,
        programAdvance: state.programAdvance,
      }),
    }
  )
);
