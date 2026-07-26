export type Category = 'chest' | 'back' | 'legs' | 'arms' | 'cardio' | string;

export type ExerciseType = 'strength' | 'cardio';

export interface Exercise {
  id: string;
  name: string;
  category: Category;
  type: ExerciseType;
}

export interface SetEntry {
  id: string;
  setNumber: number;
  reps: number;
  weight: number;
  durationMinutes: number;
  distance: number;
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

export type ArticleCategory = 'splits' | 'exercise' | 'nutrition' | 'recovery';

export interface Article {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: ArticleCategory;
  readMinutes: number;
  publishedAt: string;
}
