import { fitTrend, projectGoal, projectGoals, type LiftGoal } from '../goals';
import type { ExerciseHistory, RecordSet } from '../workoutHistory';

const goal = (over: Partial<LiftGoal> = {}): LiftGoal => ({
  id: 'goal-1',
  exerciseId: 'squat',
  targetWeight: 140,
  targetUnit: 'kg',
  targetDate: '2026-12-01',
  ...over,
});

const set = (date: string, weight: number, reps = 1): RecordSet => ({
  date,
  reps,
  weight,
  durationSeconds: 0,
  distance: 0,
});

const history = (sets: RecordSet[]): ExerciseHistory => ({
  exerciseId: 'squat',
  exerciseName: 'Back Squat',
  category: 'legs',
  type: 'strength',
  sets,
});

describe('fitTrend', () => {
  it('finds the slope of a clean line', () => {
    const trend = fitTrend([
      { day: 0, value: 100 },
      { day: 10, value: 110 },
      { day: 20, value: 120 },
    ]);
    expect(trend?.slope).toBeCloseTo(1, 6);
    expect(trend?.intercept).toBeCloseTo(100, 6);
  });

  it('finds a negative slope', () => {
    const trend = fitTrend([
      { day: 0, value: 120 },
      { day: 10, value: 100 },
    ]);
    expect(trend?.slope).toBeCloseTo(-2, 6);
  });

  it('refuses a single point, which defines no slope', () => {
    expect(fitTrend([{ day: 0, value: 100 }])).toBeNull();
  });

  it('refuses points that all share one day, rather than dividing by zero', () => {
    expect(fitTrend([
      { day: 5, value: 100 },
      { day: 5, value: 120 },
    ])).toBeNull();
  });

  it('averages through noise rather than following the last point', () => {
    // A dip on the final session shouldn't flip a clearly rising trend.
    const trend = fitTrend([
      { day: 0, value: 100 },
      { day: 10, value: 112 },
      { day: 20, value: 108 },
    ]);
    expect(trend!.slope).toBeGreaterThan(0);
  });
});

describe('projectGoal', () => {
  it('reports achieved once the target has been lifted', () => {
    const result = projectGoal(
      goal({ targetWeight: 100 }),
      history([set('2026-08-01', 100)]),
      '2026-08-20'
    );
    expect(result.status).toBe('achieved');
    expect(result.current).toBe(103.3);
  });

  it('is on track when the trend arrives before the date', () => {
    // 100 -> 120 over 60 days is ~2.3/week; 140 is comfortably reachable
    // by December from a late-August start.
    const result = projectGoal(
      goal(),
      history([set('2026-06-01', 100), set('2026-08-01', 120)]),
      '2026-08-20'
    );
    expect(result.status).toBe('on-track');
    expect(result.weeklyRate).toBeGreaterThan(0);
    expect(result.projectedDate).not.toBeNull();
  });

  it('is behind when rising too slowly to arrive in time', () => {
    const result = projectGoal(
      goal({ targetWeight: 300, targetDate: '2026-09-01' }),
      history([set('2026-06-01', 100), set('2026-08-01', 101)]),
      '2026-08-20'
    );
    expect(result.status).toBe('behind');
    expect(result.projected).toBeLessThan(300);
  });

  it('reports declining when the trend is flat or falling', () => {
    const result = projectGoal(
      goal(),
      history([set('2026-06-01', 120), set('2026-08-01', 100)]),
      '2026-08-20'
    );
    expect(result.status).toBe('declining');
    expect(result.weeklyRate).toBeLessThan(0);
    // No arrival date, because on this trend there isn't one.
    expect(result.projectedDate).toBeNull();
  });

  it('reports no trend from a single session', () => {
    const result = projectGoal(goal(), history([set('2026-08-01', 100)]), '2026-08-20');
    expect(result.status).toBe('no-trend');
    expect(result.sessions).toBe(1);
    expect(result.projected).toBeNull();
  });

  it('reports no trend when the lift has never been logged', () => {
    const result = projectGoal(goal(), undefined, '2026-08-20');
    expect(result.status).toBe('no-trend');
    expect(result.current).toBe(0);
    expect(result.exerciseName).toBe('Unknown exercise');
  });

  it('ignores sets too high-rep to estimate a max from', () => {
    const result = projectGoal(
      goal(),
      history([set('2026-06-01', 60, 30), set('2026-08-01', 60, 30)]),
      '2026-08-20'
    );
    expect(result.status).toBe('no-trend');
    expect(result.sessions).toBe(0);
  });

  it('takes the best estimate of each day, not the last set', () => {
    const result = projectGoal(
      goal({ targetWeight: 200 }),
      history([
        set('2026-06-01', 100),
        set('2026-08-01', 130),
        set('2026-08-01', 80),
      ]),
      '2026-08-20'
    );
    // The 80 back-off set must not drag the latest session down.
    expect(result.current).toBeCloseTo(134.3, 1);
  });

  it('counts days remaining, negative once the date has passed', () => {
    expect(projectGoal(goal({ targetDate: '2026-08-25' }), history([set('2026-08-01', 100)]), '2026-08-20').daysRemaining).toBe(5);
    expect(projectGoal(goal({ targetDate: '2026-08-15' }), history([set('2026-08-01', 100)]), '2026-08-20').daysRemaining).toBe(-5);
  });
});

describe('projectGoals', () => {
  it('converts history into the goal’s own unit before projecting', () => {
    // History in kg, goal in lb. Without conversion a 100 kg lift would be
    // compared against a 225 lb target as though 100 < 225 by a mile.
    const [result] = projectGoals(
      [goal({ targetWeight: 225, targetUnit: 'lb' })],
      [history([set('2026-08-01', 110)])],
      'kg',
      '2026-08-20'
    );
    // 110 kg is ~242 lb, so a 225 lb target is already achieved.
    expect(result.status).toBe('achieved');
  });

  it('leaves a goal for a never-logged lift as no-trend', () => {
    const [result] = projectGoals([goal({ exerciseId: 'bench' })], [history([set('2026-08-01', 100)])], 'kg', '2026-08-20');
    expect(result.status).toBe('no-trend');
  });
});
