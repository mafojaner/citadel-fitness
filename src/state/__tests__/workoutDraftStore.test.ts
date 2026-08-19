import { useWorkoutDraftStore } from '../workoutDraftStore';
import type { Exercise } from '../../types/models';
import type { WorkoutDetailExercise } from '../../lib/workouts';

const exercise: Exercise = {
  id: 'ex-1',
  name: 'Bench Press',
  category: 'chest',
  type: 'strength',
  description: null,
  tracksDistance: false,
};

const saved: WorkoutDetailExercise = {
  id: 'logged-1',
  exerciseId: 'ex-1',
  exerciseName: 'Bench Press',
  category: 'chest',
  type: 'strength',
  sets: [
    {
      id: 'set-1',
      setNumber: 1,
      reps: 5,
      weight: 100,
      weightUnit: 'kg',
      durationSeconds: 0,
      distance: 0,
      distanceUnit: 'km',
      rpe: 8.5,
    },
    {
      id: 'set-2',
      setNumber: 2,
      reps: 5,
      weight: 100,
      weightUnit: 'kg',
      durationSeconds: 0,
      distance: 0,
      distanceUnit: 'km',
      rpe: null,
    },
  ],
};

beforeEach(() => {
  useWorkoutDraftStore.getState().reset('2026-08-20');
});

describe('workout draft — effort', () => {
  it('starts a new set with no effort recorded rather than zero', () => {
    // Zero is a real RPE-shaped number; absent is the truth for a set
    // nobody has rated yet, and only null survives to the column as absent.
    useWorkoutDraftStore.getState().addExercise(exercise);
    const [added] = useWorkoutDraftStore.getState().exercises;
    expect(added.sets[0].rpe).toBeNull();
  });

  it('starts each additional set with no effort recorded', () => {
    useWorkoutDraftStore.getState().addExercise(exercise);
    const id = useWorkoutDraftStore.getState().exercises[0].id;
    useWorkoutDraftStore.getState().addSet(id);
    const sets = useWorkoutDraftStore.getState().exercises[0].sets;
    expect(sets).toHaveLength(2);
    expect(sets[1].rpe).toBeNull();
  });

  it('records an effort and keeps it', () => {
    useWorkoutDraftStore.getState().addExercise(exercise);
    const draft = useWorkoutDraftStore.getState().exercises[0];
    useWorkoutDraftStore.getState().updateSet(draft.id, draft.sets[0].id, { rpe: 9 });
    expect(useWorkoutDraftStore.getState().exercises[0].sets[0].rpe).toBe(9);
  });

  it('allows clearing an effort back to absent', () => {
    useWorkoutDraftStore.getState().addExercise(exercise);
    const draft = useWorkoutDraftStore.getState().exercises[0];
    useWorkoutDraftStore.getState().updateSet(draft.id, draft.sets[0].id, { rpe: 9 });
    useWorkoutDraftStore.getState().updateSet(draft.id, draft.sets[0].id, { rpe: null });
    expect(useWorkoutDraftStore.getState().exercises[0].sets[0].rpe).toBeNull();
  });

  it('carries effort through when an existing workout is reopened to edit', () => {
    // The regression that matters: save_workout replaces the day wholesale,
    // so an effort dropped on load would be permanently erased on the next
    // save of an otherwise untouched workout.
    useWorkoutDraftStore.getState().loadFromExisting('2026-08-20', [saved], 'kg', 'km');
    const sets = useWorkoutDraftStore.getState().exercises[0].sets;
    expect(sets[0].rpe).toBe(8.5);
    expect(sets[1].rpe).toBeNull();
  });

  it('keeps effort attached to its own set when weights are converted', () => {
    // Loading in lb converts the weights; the effort must not follow the
    // same path or get reordered away from the set it describes.
    useWorkoutDraftStore.getState().loadFromExisting('2026-08-20', [saved], 'lb', 'mi');
    const sets = useWorkoutDraftStore.getState().exercises[0].sets;
    expect(sets[0].weight).toBeCloseTo(220.5, 1);
    expect(sets[0].rpe).toBe(8.5);
  });
});
