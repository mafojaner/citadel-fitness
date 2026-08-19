import {
  computePersonalRecords,
  estimateOneRepMax,
  type ExerciseHistory,
  type RecordSet,
} from '../personalRecords';

const set = (over: Partial<RecordSet> = {}): RecordSet => ({
  date: '2026-08-01',
  reps: 5,
  weight: 100,
  durationSeconds: 0,
  distance: 0,
  ...over,
});

const strength = (sets: RecordSet[]): ExerciseHistory => ({
  exerciseId: 'ex-1',
  exerciseName: 'Bench Press',
  category: 'chest',
  type: 'strength',
  sets,
});

const cardio = (sets: RecordSet[]): ExerciseHistory => ({
  exerciseId: 'ex-2',
  exerciseName: 'Running',
  category: 'cardio',
  type: 'cardio',
  sets,
});

describe('estimateOneRepMax', () => {
  it('returns the weight itself for a single rep', () => {
    expect(estimateOneRepMax(100, 1)).toBeCloseTo(103.33, 2);
  });

  it('scales with reps', () => {
    expect(estimateOneRepMax(100, 5)).toBeCloseTo(116.67, 2);
    expect(estimateOneRepMax(100, 10)).toBeCloseTo(133.33, 2);
  });

  it('refuses reps beyond where the formula stays honest', () => {
    // Epley on a 20-rep set claims a 1RM two thirds above the weight lifted,
    // which would quietly invent a record nobody achieved.
    expect(estimateOneRepMax(100, 12)).toBeGreaterThan(0);
    expect(estimateOneRepMax(100, 13)).toBe(0);
    expect(estimateOneRepMax(100, 20)).toBe(0);
  });

  it('returns zero for bodyweight or empty sets', () => {
    expect(estimateOneRepMax(0, 10)).toBe(0);
    expect(estimateOneRepMax(100, 0)).toBe(0);
  });
});

describe('computePersonalRecords — strength', () => {
  it('finds the heaviest set and what it was for', () => {
    const [record] = computePersonalRecords([
      strength([
        set({ weight: 80, reps: 8, date: '2026-08-01' }),
        set({ weight: 100, reps: 3, date: '2026-08-05' }),
        set({ weight: 90, reps: 5, date: '2026-08-10' }),
      ]),
    ]);
    expect(record.heaviestWeight).toBe(100);
    expect(record.heaviestWeightReps).toBe(3);
    expect(record.heaviestWeightDate).toBe('2026-08-05');
  });

  it('picks the best estimated max, which need not be the heaviest set', () => {
    // 100x3 estimates 110; 90x8 estimates 114. The lighter set is the better
    // performance, and a vault that only tracked heaviest would miss it.
    const [record] = computePersonalRecords([
      strength([
        set({ weight: 100, reps: 3, date: '2026-08-01' }),
        set({ weight: 90, reps: 8, date: '2026-08-05' }),
      ]),
    ]);
    expect(record.heaviestWeight).toBe(100);
    expect(record.estimatedOneRepMax).toBe(114);
    expect(record.estimatedOneRepMaxDate).toBe('2026-08-05');
  });

  it('ignores very high rep sets when estimating a max', () => {
    const [record] = computePersonalRecords([
      strength([set({ weight: 60, reps: 30, date: '2026-08-01' })]),
    ]);
    expect(record.heaviestWeight).toBe(60);
    expect(record.estimatedOneRepMax).toBe(0);
    expect(record.estimatedOneRepMaxDate).toBeNull();
  });

  it('totals volume per day and reports the best session', () => {
    const [record] = computePersonalRecords([
      strength([
        set({ weight: 100, reps: 5, date: '2026-08-01' }),
        set({ weight: 100, reps: 5, date: '2026-08-01' }),
        set({ weight: 100, reps: 8, date: '2026-08-05' }),
      ]),
    ]);
    // 1000 across two sets on the 1st beats 800 in one set on the 5th.
    expect(record.bestSessionValue).toBe(1000);
    expect(record.bestSessionDate).toBe('2026-08-01');
  });

  it('awards a tie to the session that got there first', () => {
    const [record] = computePersonalRecords([
      strength([
        set({ weight: 100, reps: 5, date: '2026-08-05' }),
        set({ weight: 100, reps: 5, date: '2026-08-01' }),
      ]),
    ]);
    expect(record.heaviestWeightDate).toBe('2026-08-05');
    expect(record.bestSessionDate).toBe('2026-08-01');
  });

  it('counts sets and tracks when the lift was last done', () => {
    const [record] = computePersonalRecords([
      strength([
        set({ date: '2026-08-01' }),
        set({ date: '2026-08-20' }),
        set({ date: '2026-08-10' }),
      ]),
    ]);
    expect(record.totalSets).toBe(3);
    expect(record.lastPerformed).toBe('2026-08-20');
  });
});

describe('computePersonalRecords — cardio', () => {
  it('tracks longest duration and farthest distance independently', () => {
    const [record] = computePersonalRecords([
      cardio([
        set({ weight: 0, reps: 0, durationSeconds: 1800, distance: 5, date: '2026-08-01' }),
        set({ weight: 0, reps: 0, durationSeconds: 3600, distance: 3, date: '2026-08-05' }),
      ]),
    ]);
    expect(record.longestDurationSeconds).toBe(3600);
    expect(record.longestDurationDate).toBe('2026-08-05');
    expect(record.farthestDistance).toBe(5);
    expect(record.farthestDistanceDate).toBe('2026-08-01');
  });

  it('measures a cardio session in minutes, not volume', () => {
    // reps x weight is zero for cardio, so a volume-based best session would
    // report nothing at all for every run ever logged.
    const [record] = computePersonalRecords([
      cardio([set({ weight: 0, reps: 0, durationSeconds: 1800, date: '2026-08-01' })]),
    ]);
    expect(record.bestSessionValue).toBe(30);
    expect(record.bestSessionDate).toBe('2026-08-01');
  });

  it('leaves strength records empty for a cardio exercise', () => {
    const [record] = computePersonalRecords([
      cardio([set({ weight: 0, reps: 0, durationSeconds: 600 })]),
    ]);
    expect(record.heaviestWeight).toBe(0);
    expect(record.heaviestWeightDate).toBeNull();
    expect(record.estimatedOneRepMax).toBe(0);
  });
});

describe('computePersonalRecords — collection', () => {
  it('skips exercises with no sets', () => {
    expect(computePersonalRecords([strength([])])).toEqual([]);
  });

  it('returns most recently performed first', () => {
    const records = computePersonalRecords([
      { ...strength([set({ date: '2026-08-01' })]), exerciseId: 'old', exerciseName: 'Old' },
      { ...strength([set({ date: '2026-08-20' })]), exerciseId: 'new', exerciseName: 'New' },
    ]);
    expect(records.map((r) => r.exerciseId)).toEqual(['new', 'old']);
  });

  it('keeps each exercise’s records separate', () => {
    const records = computePersonalRecords([
      { ...strength([set({ weight: 100 })]), exerciseId: 'a', exerciseName: 'A' },
      { ...strength([set({ weight: 50 })]), exerciseId: 'b', exerciseName: 'B' },
    ]);
    expect(records.find((r) => r.exerciseId === 'a')?.heaviestWeight).toBe(100);
    expect(records.find((r) => r.exerciseId === 'b')?.heaviestWeight).toBe(50);
  });

  it('carries through the exercise’s own category and type', () => {
    const [record] = computePersonalRecords([cardio([set({ durationSeconds: 60 })])]);
    expect(record.category).toBe('cardio');
    expect(record.type).toBe('cardio');
  });
});
