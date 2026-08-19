import {
  computeAdvancedAnalytics,
  computeLiftProgressions,
  computeMuscleBalance,
} from '../advancedAnalytics';
import type { ExerciseHistory, RecordSet } from '../workoutHistory';
import type { Category } from '../../types/models';

const set = (over: Partial<RecordSet> = {}): RecordSet => ({
  date: '2026-08-01',
  reps: 10,
  weight: 100,
  durationSeconds: 0,
  distance: 0,
  ...over,
});

const lift = (
  id: string,
  category: Category,
  sets: RecordSet[],
  type: 'strength' | 'cardio' = 'strength'
): ExerciseHistory => ({
  exerciseId: id,
  exerciseName: id,
  category,
  type,
  sets,
});

describe('computeMuscleBalance', () => {
  it('splits volume by category and reports each share', () => {
    const balance = computeMuscleBalance([
      lift('bench', 'chest', [set({ reps: 10, weight: 100 })]),
      lift('squat', 'legs', [set({ reps: 10, weight: 300 })]),
    ]);
    expect(balance.map((b) => b.category)).toEqual(['legs', 'chest']);
    expect(balance[0].value).toBe(3000);
    expect(balance[0].share).toBeCloseTo(0.75, 5);
    expect(balance[1].share).toBeCloseTo(0.25, 5);
  });

  it('counts cardio in minutes so it is not erased by a volume-only total', () => {
    // reps x weight is zero for a run, so a purely volume-based balance
    // would report cardio as 0% no matter how much of it you did.
    const balance = computeMuscleBalance([
      lift('run', 'cardio', [set({ reps: 0, weight: 0, durationSeconds: 1800 })], 'cardio'),
    ]);
    expect(balance).toHaveLength(1);
    expect(balance[0].value).toBe(30);
    expect(balance[0].share).toBe(1);
  });

  it('sums several exercises sharing a category', () => {
    const balance = computeMuscleBalance([
      lift('bench', 'chest', [set({ reps: 10, weight: 100 })]),
      lift('fly', 'chest', [set({ reps: 10, weight: 50 })]),
    ]);
    expect(balance).toHaveLength(1);
    expect(balance[0].value).toBe(1500);
    expect(balance[0].sets).toBe(2);
  });

  it('honours the period cutoff', () => {
    const balance = computeMuscleBalance(
      [
        lift('bench', 'chest', [
          set({ date: '2026-07-01', reps: 10, weight: 100 }),
          set({ date: '2026-08-10', reps: 10, weight: 50 }),
        ]),
      ],
      '2026-08-01'
    );
    expect(balance[0].value).toBe(500);
    expect(balance[0].sets).toBe(1);
  });

  it('reports no shares rather than NaN when everything totals zero', () => {
    const balance = computeMuscleBalance([
      lift('bw', 'core', [set({ reps: 0, weight: 0 })]),
    ]);
    expect(balance[0].share).toBe(0);
    expect(Number.isNaN(balance[0].share)).toBe(false);
  });

  it('returns nothing when no sets fall in the period', () => {
    expect(computeMuscleBalance([lift('bench', 'chest', [set({ date: '2026-01-01' })])], '2026-08-01')).toEqual([]);
  });
});

describe('computeLiftProgressions', () => {
  it('tracks estimated max per day and the change across the period', () => {
    const [progression] = computeLiftProgressions([
      lift('bench', 'chest', [
        set({ date: '2026-08-01', reps: 5, weight: 100 }),
        set({ date: '2026-08-15', reps: 5, weight: 110 }),
      ]),
    ]);
    expect(progression.points).toHaveLength(2);
    expect(progression.first).toBe(116.7);
    expect(progression.latest).toBe(128.3);
    expect(progression.changePct).toBe(10);
  });

  it('takes the best estimate of each day, not the last set of it', () => {
    // A heavy single followed by lighter back-off sets is a good session,
    // and must not read as a decline just because the last set was easier.
    const [progression] = computeLiftProgressions([
      lift('bench', 'chest', [
        set({ date: '2026-08-01', reps: 5, weight: 100 }),
        set({ date: '2026-08-15', reps: 1, weight: 130 }),
        set({ date: '2026-08-15', reps: 10, weight: 80 }),
      ]),
    ]);
    expect(progression.points[1].estimatedOneRepMax).toBe(134.3);
  });

  it('reports a decline as a negative change', () => {
    const [progression] = computeLiftProgressions([
      lift('bench', 'chest', [
        set({ date: '2026-08-01', reps: 5, weight: 100 }),
        set({ date: '2026-08-15', reps: 5, weight: 90 }),
      ]),
    ]);
    expect(progression.changePct).toBe(-10);
  });

  it('skips a lift with only one day of data', () => {
    expect(
      computeLiftProgressions([lift('bench', 'chest', [set(), set()])])
    ).toEqual([]);
  });

  it('skips cardio, which has no meaningful one-rep max', () => {
    expect(
      computeLiftProgressions([
        lift('run', 'cardio', [
          set({ date: '2026-08-01', durationSeconds: 600 }),
          set({ date: '2026-08-05', durationSeconds: 900 }),
        ], 'cardio'),
      ])
    ).toEqual([]);
  });

  it('ignores sets too high-rep to estimate from', () => {
    // Only one day yields a usable estimate, so there is no trend to report.
    expect(
      computeLiftProgressions([
        lift('bench', 'chest', [
          set({ date: '2026-08-01', reps: 30, weight: 60 }),
          set({ date: '2026-08-05', reps: 5, weight: 100 }),
        ]),
      ])
    ).toEqual([]);
  });

  it('orders by biggest gain first', () => {
    const progressions = computeLiftProgressions([
      lift('flat', 'chest', [
        set({ date: '2026-08-01', reps: 5, weight: 100 }),
        set({ date: '2026-08-15', reps: 5, weight: 100 }),
      ]),
      lift('rising', 'legs', [
        set({ date: '2026-08-01', reps: 5, weight: 100 }),
        set({ date: '2026-08-15', reps: 5, weight: 120 }),
      ]),
    ]);
    expect(progressions.map((p) => p.exerciseId)).toEqual(['rising', 'flat']);
  });
});

describe('computeAdvancedAnalytics', () => {
  it('counts distinct active days rather than sets', () => {
    const result = computeAdvancedAnalytics([
      lift('bench', 'chest', [
        set({ date: '2026-08-01' }),
        set({ date: '2026-08-01' }),
        set({ date: '2026-08-05' }),
      ]),
    ]);
    expect(result.activeDays).toBe(2);
    expect(result.totalSets).toBe(3);
  });

  it('is empty and safe with no history at all', () => {
    const result = computeAdvancedAnalytics([]);
    expect(result.balance).toEqual([]);
    expect(result.progressions).toEqual([]);
    expect(result.totalValue).toBe(0);
    expect(result.activeDays).toBe(0);
  });
});
