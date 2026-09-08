import {
  computePersonalRecords,
  estimateOneRepMax,
  isRecentRecord,
  newestRecord,
  newestRecordDate,
  recentRecords,
  sortRecords,
  summariseRecords,
  type ExerciseHistory,
  type PersonalRecord,
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

describe('record freshness', () => {
  const record = (over: Partial<PersonalRecord> = {}): PersonalRecord => ({
    exerciseId: 'ex-1',
    exerciseName: 'Bench Press',
    category: 'chest',
    type: 'strength',
    heaviestWeight: 100,
    heaviestWeightReps: 5,
    heaviestWeightDate: '2026-08-01',
    estimatedOneRepMax: 112,
    estimatedOneRepMaxDate: '2026-08-01',
    longestDurationSeconds: 0,
    longestDurationDate: null,
    farthestDistance: 0,
    farthestDistanceDate: null,
    bestSessionValue: 2000,
    bestSessionDate: '2026-08-01',
    totalSets: 12,
    lastPerformed: '2026-08-01',
    ...over,
  });

  it('takes the latest of the record dates, not the first it finds', () => {
    expect(
      newestRecordDate(record({ heaviestWeightDate: '2026-08-01', bestSessionDate: '2026-09-01' }))
    ).toBe('2026-09-01');
  });

  it('ignores the dates that are absent', () => {
    // A lift with no qualifying 1RM estimate leaves that date null, and a
    // null must not win a max comparison or sort as a date.
    expect(
      newestRecordDate(
        record({ estimatedOneRepMaxDate: null, bestSessionDate: null, heaviestWeightDate: '2026-07-04' })
      )
    ).toBe('2026-07-04');
  });

  it('is null when nothing is dated at all', () => {
    expect(
      newestRecordDate(
        record({
          heaviestWeightDate: null,
          estimatedOneRepMaxDate: null,
          longestDurationDate: null,
          farthestDistanceDate: null,
          bestSessionDate: null,
        })
      )
    ).toBeNull();
  });

  it('counts a record inside the window as new', () => {
    expect(isRecentRecord(record({ bestSessionDate: '2026-09-10' }), '2026-09-12')).toBe(true);
  });

  it('does not count one on the far edge of the window', () => {
    // Exactly seven days back is outside: the window is the last seven days,
    // not the last eight.
    expect(isRecentRecord(record({ bestSessionDate: '2026-09-05' }), '2026-09-12')).toBe(false);
    expect(isRecentRecord(record({ bestSessionDate: '2026-09-06' }), '2026-09-12')).toBe(true);
  });

  it('counts one set today', () => {
    expect(isRecentRecord(record({ bestSessionDate: '2026-09-12' }), '2026-09-12')).toBe(true);
  });

  it('does not count a future date as new', () => {
    // Nothing should produce one, but a device clock set forward would, and
    // "new" on a record from next week is worse than not marking it.
    expect(isRecentRecord(record({ bestSessionDate: '2026-09-20' }), '2026-09-12')).toBe(false);
  });

  it('crosses a month boundary rather than comparing day numbers', () => {
    expect(isRecentRecord(record({ bestSessionDate: '2026-08-30' }), '2026-09-02')).toBe(true);
  });

  it('is not new when the exercise has no dated record', () => {
    expect(
      isRecentRecord(
        record({
          heaviestWeightDate: null,
          estimatedOneRepMaxDate: null,
          longestDurationDate: null,
          farthestDistanceDate: null,
          bestSessionDate: null,
        }),
        '2026-09-12'
      )
    ).toBe(false);
  });
});

/** A strength record, for the screen-facing derivations below. */
const pr = (over: Partial<PersonalRecord> = {}): PersonalRecord => ({
  exerciseId: 'ex-1',
  exerciseName: 'Bench Press',
  category: 'chest',
  type: 'strength',
  heaviestWeight: 100,
  heaviestWeightReps: 5,
  heaviestWeightDate: '2026-08-01',
  estimatedOneRepMax: 112,
  estimatedOneRepMaxDate: '2026-08-01',
  longestDurationSeconds: 0,
  longestDurationDate: null,
  farthestDistance: 0,
  farthestDistanceDate: null,
  bestSessionValue: 2000,
  bestSessionDate: '2026-08-01',
  totalSets: 12,
  lastPerformed: '2026-08-01',
  ...over,
});

describe('newestRecord', () => {
  it('names which record was broken, not just when', () => {
    expect(newestRecord(pr({ bestSessionDate: '2026-09-01' }))).toEqual({
      kind: 'bestSession',
      date: '2026-09-01',
    });
  });

  it('prefers the set actually lifted over the estimate derived from it', () => {
    // One session sets both, on the same date. The card headlines whichever
    // this returns, and "you lifted 100 kg" beats "we calculated 112 kg".
    expect(newestRecord(pr())?.kind).toBe('heaviestWeight');
  });

  it('agrees with newestRecordDate', () => {
    // The two are one function now precisely so they cannot drift; this is
    // the assertion that would fail if someone split them again.
    const record = pr({ heaviestWeightDate: '2026-08-01', longestDurationDate: '2026-09-05' });
    expect(newestRecord(record)?.date).toBe(newestRecordDate(record));
  });

  it('is null with no dated record at all', () => {
    expect(
      newestRecord(
        pr({
          heaviestWeightDate: null,
          estimatedOneRepMaxDate: null,
          longestDurationDate: null,
          farthestDistanceDate: null,
          bestSessionDate: null,
        })
      )
    ).toBeNull();
  });

  it('does not treat a dated zero as a record', () => {
    // What the server returns for a bodyweight lift: every figure is zero
    // and every one of them carries the date it was logged. The screen
    // headlined "0 kg x 0" and announced two personal bests broken that
    // week, both of nothing.
    expect(
      newestRecord(
        pr({
          heaviestWeight: 0,
          heaviestWeightReps: 0,
          heaviestWeightDate: '2026-09-08',
          estimatedOneRepMax: 0,
          estimatedOneRepMaxDate: '2026-09-08',
          bestSessionValue: 0,
          bestSessionDate: '2026-09-08',
        })
      )
    ).toBeNull();
  });

  it('still finds the real record beside a dated zero', () => {
    // The mixed case, which is the one a blanket "any zero disqualifies the
    // exercise" rule would get wrong: a lift with a genuine heaviest set
    // whose best-day volume happens to be missing.
    expect(
      newestRecord(
        pr({
          heaviestWeight: 60,
          heaviestWeightDate: '2026-09-08',
          bestSessionValue: 0,
          bestSessionDate: '2026-09-09',
        })
      )
    ).toEqual({ kind: 'heaviestWeight', date: '2026-09-08' });
  });
});

describe('a record of nothing', () => {
  const bodyweightOnly = pr({
    exerciseId: 'bw',
    heaviestWeight: 0,
    heaviestWeightReps: 0,
    heaviestWeightDate: '2026-09-08',
    estimatedOneRepMax: 0,
    estimatedOneRepMaxDate: '2026-09-08',
    bestSessionValue: 0,
    bestSessionDate: '2026-09-08',
  });

  it('is not new, however recently it was logged', () => {
    expect(isRecentRecord(bodyweightOnly, '2026-09-09')).toBe(false);
  });

  it('is left out of the new-records list', () => {
    expect(recentRecords([bodyweightOnly], '2026-09-09')).toEqual([]);
  });

  it('is not counted in the headline', () => {
    expect(summariseRecords([bodyweightOnly], '2026-09-09').newThisWeek).toBe(0);
  });

  it('still counts as an exercise in the vault', () => {
    // It is a lift that has been trained; it just has no measured best.
    // Dropping it from the count would make the number disagree with the
    // list, which still shows the card.
    const summary = summariseRecords([bodyweightOnly], '2026-09-09');
    expect(summary.exercises).toBe(1);
    expect(summary.totalSets).toBe(12);
  });
});

describe('summariseRecords', () => {
  it('adds up the vault', () => {
    const summary = summariseRecords(
      [
        pr({ exerciseId: 'a', heaviestWeight: 100, totalSets: 12 }),
        pr({ exerciseId: 'b', heaviestWeight: 140, totalSets: 3 }),
      ],
      '2026-09-12'
    );
    expect(summary.exercises).toBe(2);
    expect(summary.totalSets).toBe(15);
    expect(summary.heaviestWeight).toBe(140);
  });

  it('counts new records on the same rule the cards are badged with', () => {
    const summary = summariseRecords(
      [
        pr({ exerciseId: 'a', bestSessionDate: '2026-09-10' }),
        pr({
          exerciseId: 'b',
          bestSessionDate: '2026-06-01',
          heaviestWeightDate: '2026-06-01',
          estimatedOneRepMaxDate: '2026-06-01',
        }),
      ],
      '2026-09-12'
    );
    expect(summary.newThisWeek).toBe(1);
  });

  it('is all zeros for an empty vault rather than throwing', () => {
    expect(summariseRecords([], '2026-09-12')).toEqual({
      exercises: 0,
      newThisWeek: 0,
      totalSets: 0,
      heaviestWeight: 0,
      longestDurationSeconds: 0,
    });
  });
});

describe('sortRecords', () => {
  const bench = pr({
    exerciseId: 'a',
    exerciseName: 'Bench Press',
    heaviestWeight: 100,
    lastPerformed: '2026-08-01',
  });
  const squat = pr({
    exerciseId: 'b',
    exerciseName: 'Squat',
    heaviestWeight: 160,
    lastPerformed: '2026-07-01',
  });
  const run = pr({
    exerciseId: 'c',
    exerciseName: 'Running',
    type: 'cardio',
    heaviestWeight: 0,
    lastPerformed: '2026-09-01',
  });

  it('orders by when the lift was last trained', () => {
    expect(sortRecords([bench, squat, run], 'recent').map((r) => r.exerciseId)).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('orders by the heaviest set, sinking what has no weight', () => {
    expect(sortRecords([bench, run, squat], 'heaviest').map((r) => r.exerciseId)).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('orders by name', () => {
    expect(sortRecords([squat, run, bench], 'name').map((r) => r.exerciseId)).toEqual([
      'a',
      'c',
      'b',
    ]);
  });

  it('does not mutate what it is given', () => {
    const input = [bench, squat];
    sortRecords(input, 'heaviest');
    expect(input.map((r) => r.exerciseId)).toEqual(['a', 'b']);
  });

  it('breaks ties on name so the order is stable', () => {
    const a = pr({ exerciseId: 'x', exerciseName: 'Zercher Squat', heaviestWeight: 100 });
    const b = pr({ exerciseId: 'y', exerciseName: 'Arnold Press', heaviestWeight: 100 });
    expect(sortRecords([a, b], 'heaviest').map((r) => r.exerciseId)).toEqual(['y', 'x']);
  });
});

describe('recentRecords', () => {
  it('returns only what was broken inside the window, newest first', () => {
    const rows = recentRecords(
      [
        pr({ exerciseId: 'a', exerciseName: 'A', bestSessionDate: '2026-09-08' }),
        pr({ exerciseId: 'b', exerciseName: 'B', bestSessionDate: '2026-09-11' }),
        pr({
          exerciseId: 'c',
          exerciseName: 'C',
          heaviestWeightDate: '2026-01-01',
          estimatedOneRepMaxDate: '2026-01-01',
          bestSessionDate: '2026-01-01',
        }),
      ],
      '2026-09-12'
    );
    expect(rows.map((r) => r.record.exerciseId)).toEqual(['b', 'a']);
  });

  it('carries which record each one was', () => {
    const [row] = recentRecords(
      [
        pr({
          heaviestWeightDate: '2026-09-01',
          estimatedOneRepMaxDate: '2026-09-01',
          bestSessionDate: '2026-09-11',
        }),
      ],
      '2026-09-12'
    );
    expect(row.kind).toBe('bestSession');
    expect(row.date).toBe('2026-09-11');
  });

  it('agrees with isRecentRecord about the window', () => {
    // The headline count and this list are two reads of one predicate, and
    // a card badged "New" that is missing from the list above it is the
    // exact inconsistency the shared derivation exists to prevent.
    const records = [
      pr({ exerciseId: 'a', bestSessionDate: '2026-09-11' }),
      pr({ exerciseId: 'b', bestSessionDate: '2026-09-04' }),
      pr({ exerciseId: 'c', bestSessionDate: '2026-09-06' }),
    ];
    expect(recentRecords(records, '2026-09-12').length).toBe(
      records.filter((r) => isRecentRecord(r, '2026-09-12')).length
    );
  });
});
