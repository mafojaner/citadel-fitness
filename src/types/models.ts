export type Category = 'chest' | 'back' | 'legs' | 'arms' | 'core' | 'cardio' | 'boxing' | 'glutes' | string;

export type ExerciseType = 'strength' | 'cardio';

export type WeightUnit = 'lb' | 'kg';
export type DistanceUnit = 'mi' | 'km';

export interface Exercise {
  id: string;
  name: string;
  category: Category;
  type: ExerciseType;
  description: string | null;
  /**
   * Whether a distance is meaningful for this exercise. `type` only
   * distinguishes rep-based from time-based, so without this every timed
   * exercise — a plank, a skipping session, a round on the heavy bag —
   * would also ask for a distance. See migration_023.
   */
  tracksDistance: boolean;
}

export interface SetEntry {
  id: string;
  setNumber: number;
  reps: number;
  weight: number;
  durationSeconds: number;
  distance: number;
  /**
   * Rate of perceived exertion, 1–10, or null when not recorded. Null rather
   * than 0 because "no effort reported" and "an effort of zero" are
   * different claims, and only one of them is ever true.
   */
  rpe: number | null;
}

export interface LoggedExercise {
  id: string;
  exerciseId: string;
  sets: SetEntry[];
}

export interface Workout {
  id: string;
  userId: string;
  date: string;
  exercises: LoggedExercise[];
}

export interface UserProfile {
  id: string;
  name: string;
  preferences: Record<string, unknown>;
}

export type ArticleCategory = 'splits' | 'exercise' | 'nutrition' | 'recovery' | 'updates';

export interface Article {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: ArticleCategory;
  readMinutes: number;
  publishedAt: string;
}
