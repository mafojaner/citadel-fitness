import { addDays, fetchActivitySummary, toISODate, todayISO } from '../analytics';
import { supabase } from '../supabase';

jest.mock('../supabase', () => ({ supabase: { from: jest.fn() } }));

interface FakeSet {
  reps: number;
  weight: number;
  weight_unit: 'kg' | 'lb';
  duration_seconds: number | null;
}

/**
 * Stands in for the PostgREST builder: every method returns the same object
 * and awaiting it yields the rows, which is all fetchValueByDate needs.
 */
function stubWorkouts(rows: unknown[]) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'gte', 'lte', 'returns']) {
    builder[method] = () => builder;
  }
  builder.then = (resolve: (v: unknown) => unknown) => resolve({ data: rows, error: null });
  (supabase.from as jest.Mock).mockReturnValue(builder);
}

function workout(date: string, category: string, sets: FakeSet[]) {
  return { date, logged_exercises: [{ exercises: { category, type: 'strength' }, set_entries: sets }] };
}

const SET = (over: Partial<FakeSet> = {}): FakeSet => ({
  reps: 10,
  weight: 100,
  weight_unit: 'kg',
  duration_seconds: null,
  ...over,
});

describe('toISODate', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(toISODate(new Date(Date.UTC(2026, 7, 17)))).toBe('2026-08-17');
  });

  it('zero-pads single-digit months and days', () => {
    expect(toISODate(new Date(Date.UTC(2026, 0, 5)))).toBe('2026-01-05');
  });
});

describe('addDays', () => {
  it('adds and subtracts within a month', () => {
    expect(addDays('2026-08-17', 3)).toBe('2026-08-20');
    expect(addDays('2026-08-17', -3)).toBe('2026-08-14');
  });

  it('crosses month boundaries', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-09-01', -1)).toBe('2026-08-31');
  });

  it('crosses year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('handles leap years', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
  });

  it('handles non-leap years', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('returns the same date for a zero delta', () => {
    expect(addDays('2026-08-17', 0)).toBe('2026-08-17');
  });

  it('is reversible across a DST boundary', () => {
    // The reason this is UTC-based rather than local: a local-time
    // implementation lands on 23:00 the previous day when the clocks go
    // forward, and silently shifts the date.
    for (const date of ['2026-03-29', '2026-10-25', '2026-03-08', '2026-11-01']) {
      expect(addDays(addDays(date, 1), -1)).toBe(date);
      expect(addDays(addDays(date, -1), 1)).toBe(date);
    }
  });

  it('composes over long spans', () => {
    expect(addDays('2026-01-01', 365)).toBe('2027-01-01');
    expect(addDays(addDays('2026-08-17', 7), 7)).toBe(addDays('2026-08-17', 14));
  });
});

describe('todayISO', () => {
  it('uses the device local date, not UTC', () => {
    // Guards the documented reason this isn't toISODate(new Date()): for any
    // non-zero UTC offset that spells "today" as tomorrow for part of every
    // day, mis-dating a just-logged workout. Only bites when local and UTC
    // dates differ, so it's a partial guard by nature.
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const localDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    expect(todayISO()).toBe(localDate);
  });

  it('returns a well-formed ISO date', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('fetchActivitySummary — streak', () => {
  const today = todayISO();

  it('is zero with no workouts', async () => {
    stubWorkouts([]);
    const summary = await fetchActivitySummary('user-1', 'all', 'kg');
    expect(summary.currentStreakDays).toBe(0);
  });

  it('counts today when logged', async () => {
    stubWorkouts([workout(today, 'chest', [SET()])]);
    const summary = await fetchActivitySummary('user-1', 'all', 'kg');
    expect(summary.currentStreakDays).toBe(1);
  });

  it('counts consecutive days back from today', async () => {
    stubWorkouts([-2, -1, 0].map((d) => workout(addDays(today, d), 'chest', [SET()])));
    const summary = await fetchActivitySummary('user-1', 'all', 'kg');
    expect(summary.currentStreakDays).toBe(3);
  });

  it('survives an unlogged today, counting back from yesterday', async () => {
    // Nothing logged yet today shouldn't read as a broken streak — the day
    // isn't over. Logging later in the day extends it rather than restarting.
    stubWorkouts([-2, -1].map((d) => workout(addDays(today, d), 'chest', [SET()])));
    const summary = await fetchActivitySummary('user-1', 'all', 'kg');
    expect(summary.currentStreakDays).toBe(2);
  });

  it('stops at the first gap', async () => {
    stubWorkouts([-4, -3, -1, 0].map((d) => workout(addDays(today, d), 'chest', [SET()])));
    const summary = await fetchActivitySummary('user-1', 'all', 'kg');
    expect(summary.currentStreakDays).toBe(2);
  });

  it('is zero when the most recent workout is two days old', async () => {
    stubWorkouts([workout(addDays(today, -2), 'chest', [SET()])]);
    const summary = await fetchActivitySummary('user-1', 'all', 'kg');
    expect(summary.currentStreakDays).toBe(0);
  });
});

describe('fetchActivitySummary — weekly totals', () => {
  const today = todayISO();

  it('counts distinct active days in the last seven', async () => {
    stubWorkouts([0, -3, -6].map((d) => workout(addDays(today, d), 'chest', [SET()])));
    const summary = await fetchActivitySummary('user-1', 'all', 'kg');
    expect(summary.workoutsThisWeek).toBe(3);
  });

  it('excludes days older than the seven-day window', async () => {
    stubWorkouts([0, -7, -8].map((d) => workout(addDays(today, d), 'chest', [SET()])));
    const summary = await fetchActivitySummary('user-1', 'all', 'kg');
    expect(summary.workoutsThisWeek).toBe(1);
  });

  it('sums volume as reps x weight', async () => {
    stubWorkouts([workout(today, 'chest', [SET({ reps: 10, weight: 100 }), SET({ reps: 5, weight: 60 })])]);
    const summary = await fetchActivitySummary('user-1', 'all', 'kg');
    expect(summary.totalVolumeThisWeek).toBe(1300);
  });

  it('converts mixed-unit sets before summing', async () => {
    // The case migration_009 created: sets carry the unit that was active
    // when they were logged, so summing raw numbers would add kg to lb.
    stubWorkouts([
      workout(today, 'chest', [
        SET({ reps: 1, weight: 100, weight_unit: 'kg' }),
        SET({ reps: 1, weight: 100, weight_unit: 'lb' }),
      ]),
    ]);
    const summary = await fetchActivitySummary('user-1', 'all', 'kg');
    // 100kg + 100lb(=45.36kg), not a naive 200.
    expect(summary.totalVolumeThisWeek).toBeCloseTo(145.36, 1);
  });
});

describe('fetchActivitySummary — metric and filtering', () => {
  const today = todayISO();

  it('reports minutes for cardio and volume otherwise', async () => {
    stubWorkouts([]);
    expect((await fetchActivitySummary('user-1', 'cardio', 'kg')).metric).toBe('minutes');
    expect((await fetchActivitySummary('user-1', 'all', 'kg')).metric).toBe('volume');
    expect((await fetchActivitySummary('user-1', 'chest', 'kg')).metric).toBe('volume');
  });

  it('sums cardio duration in minutes', async () => {
    stubWorkouts([workout(today, 'cardio', [SET({ duration_seconds: 1800 })])]);
    const summary = await fetchActivitySummary('user-1', 'cardio', 'kg');
    expect(summary.totalVolumeThisWeek).toBe(30);
  });

  it('ignores exercises outside the requested category', async () => {
    stubWorkouts([
      workout(today, 'chest', [SET({ reps: 10, weight: 100 })]),
      workout(addDays(today, -1), 'legs', [SET({ reps: 10, weight: 100 })]),
    ]);
    const summary = await fetchActivitySummary('user-1', 'chest', 'kg');
    expect(summary.workoutsThisWeek).toBe(1);
    expect(summary.totalVolumeThisWeek).toBe(1000);
  });
});
