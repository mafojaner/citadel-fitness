export type Category = 'chest' | 'back' | 'legs' | 'cardio' | string;

export interface Exercise {
  id: string;
  name: string;
  category: Category;
}

export interface SetEntry {
  id: string;
  setNumber: number;
  reps: number;
  weight: number;
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
