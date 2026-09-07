import {
  computeConsistency,
  computeCardio,
  computeIntensity,
  computeRepBands,
  computeWeeks,
  weekStartOf,
  weekdayIndex,
  type DailyRollup,
} from '../analyticsDeep';

/**
 * The arithmetic that has edge cases, which is why it lives in TypeScript
 * rather than in the RPC beside the sums it is derived from.
 *
 * The cases worth holding are the ones where a plausible implementation is
 * quietly wrong rather than broken: averaging RPE over sets that never had
 * one, counting weekly frequency against calendar weeks a member did not
 * train, and every date boundary, since a week that starts on Sunday puts
 * roughly a seventh of all training in the wrong bucket.
 */

function row(over: Partial<DailyRollup> & { date: string }): DailyRollup {
  return {
    category: 'chest',
    type: 'strength',
    sets: 0,
    volume: 0,
    setsLow: 0,
    setsMid: 0,
    setsHigh: 0,
    rpeSum: 0,
    rpeCount: 0,
    durationSeconds: 0,
    distance: 0,
    bestE1rm: 0,
    ...over,
  };
}

describe('week boundaries', () => {
  it('starts weeks on Monday', () => {
    // 2026-09-07 is a Monday; the Sunday after it belongs to the same week.
    expect(weekStartOf('2026-09-07')).toBe('2026-09-07');
    expect(weekStartOf('2026-09-13')).toBe('2026-09-07');
    // The Sunday before is the previous week, not the start of this one.
    expect(weekStartOf('2026-09-06')).toBe('2026-08-31');
  });

  it('indexes Monday as 0 and Sunday as 6', () => {
    expect(weekdayIndex('2026-09-07')).toBe(0);
    expect(weekdayIndex('2026-09-13')).toBe(6);
  });

  it('does not shift a date across a month boundary', () => {
    expect(weekStartOf('2026-10-01')).toBe('2026-09-28');
  });
});

describe('computeWeeks', () => {
  it('groups days into their week and counts distinct active days', () => {
    const weeks = computeWeeks([
      row({ date: '2026-09-07', sets: 3, volume: 100 }),
      row({ date: '2026-09-07', sets: 2, volume: 50 }),
      row({ date: '2026-09-09', sets: 4, volume: 200 }),
      row({ date: '2026-09-14', sets: 1, volume: 10 }),
    ]);

    expect(weeks).toHaveLength(2);
    expect(weeks[0]).toMatchObject({ weekStart: '2026-09-07', sets: 9, volume: 350, activeDays: 2 });
    expect(weeks[1]).toMatchObject({ weekStart: '2026-09-14', sets: 1, activeDays: 1 });
  });

  it('returns weeks in chronological order regardless of input order', () => {
    const weeks = computeWeeks([
      row({ date: '2026-09-21', sets: 1 }),
      row({ date: '2026-09-07', sets: 1 }),
      row({ date: '2026-09-14', sets: 1 }),
    ]);
    expect(weeks.map((w) => w.weekStart)).toEqual(['2026-09-07', '2026-09-14', '2026-09-21']);
  });

  it('averages RPE over rated sets only, not over every set', () => {
    // Ten sets, two of them rated 9. The week was hard where it was measured;
    // dividing 18 by 10 would report 1.8 and call it an easy week.
    const weeks = computeWeeks([row({ date: '2026-09-07', sets: 10, rpeSum: 18, rpeCount: 2 })]);
    expect(weeks[0].avgRpe).toBe(9);
  });

  it('reports no RPE rather than zero when nothing was rated', () => {
    const weeks = computeWeeks([row({ date: '2026-09-07', sets: 5 })]);
    expect(weeks[0].avgRpe).toBeNull();
  });
});

describe('computeRepBands', () => {
  it('splits sets across the three bands', () => {
    const bands = computeRepBands([
      row({ date: '2026-09-07', setsLow: 2, setsMid: 6, setsHigh: 2 }),
    ]);
    expect(bands.map((b) => b.sets)).toEqual([2, 6, 2]);
    expect(bands[1].share).toBeCloseTo(0.6);
  });

  it('reports zero shares rather than NaN for a window with no banded sets', () => {
    // Cardio only: nothing lands in a rep band, and 0/0 would reach the bar
    // as NaN, which renders as no bar at all rather than as an empty one.
    const bands = computeRepBands([row({ date: '2026-09-07', type: 'cardio', sets: 3 })]);
    for (const band of bands) {
      expect(band.share).toBe(0);
      expect(Number.isNaN(band.share)).toBe(false);
    }
  });
});

describe('computeConsistency', () => {
  it('counts the longest run of consecutive days', () => {
    const summary = computeConsistency([
      row({ date: '2026-09-07' }),
      row({ date: '2026-09-08' }),
      row({ date: '2026-09-09' }),
      row({ date: '2026-09-11' }),
    ]);
    expect(summary.longestStreak).toBe(3);
    expect(summary.activeDays).toBe(4);
  });

  it('counts a streak that runs across a month boundary', () => {
    const summary = computeConsistency([
      row({ date: '2026-09-29' }),
      row({ date: '2026-09-30' }),
      row({ date: '2026-10-01' }),
    ]);
    expect(summary.longestStreak).toBe(3);
  });

  it('treats several exercises on one day as one session', () => {
    const summary = computeConsistency([
      row({ date: '2026-09-07', category: 'chest' }),
      row({ date: '2026-09-07', category: 'back' }),
      row({ date: '2026-09-07', category: 'legs' }),
    ]);
    expect(summary.activeDays).toBe(1);
    expect(summary.longestStreak).toBe(1);
  });

  it('measures weekly frequency against weeks trained, not the whole window', () => {
    // Two sessions in one week, then a month off, then one more. Against
    // calendar weeks this reads as collapse; against weeks trained it says
    // what it should -- when this member trains, it is about 1.5 times a week.
    const summary = computeConsistency([
      row({ date: '2026-09-07' }),
      row({ date: '2026-09-09' }),
      row({ date: '2026-10-12' }),
    ]);
    expect(summary.activeWeeks).toBe(2);
    expect(summary.sessionsPerWeek).toBe(1.5);
  });

  it('has no rest-day average from a single session', () => {
    const summary = computeConsistency([row({ date: '2026-09-07' })]);
    expect(summary.averageRestDays).toBeNull();
  });

  it('averages the gaps between sessions', () => {
    const summary = computeConsistency([
      row({ date: '2026-09-07' }),
      row({ date: '2026-09-09' }),
      row({ date: '2026-09-13' }),
    ]);
    // Gaps of 2 and 4.
    expect(summary.averageRestDays).toBe(3);
  });

  it('buckets days onto the right weekday', () => {
    const summary = computeConsistency([
      row({ date: '2026-09-07' }), // Monday
      row({ date: '2026-09-13' }), // Sunday
    ]);
    expect(summary.weekdays[0]).toMatchObject({ label: 'Mon', sessions: 1 });
    expect(summary.weekdays[6]).toMatchObject({ label: 'Sun', sessions: 1 });
    expect(summary.weekdays.reduce((sum, d) => sum + d.sessions, 0)).toBe(2);
  });

  it('survives an empty window', () => {
    const summary = computeConsistency([]);
    expect(summary).toMatchObject({
      activeDays: 0,
      activeWeeks: 0,
      sessionsPerWeek: 0,
      longestStreak: 0,
      averageRestDays: null,
    });
  });
});

describe('computeIntensity', () => {
  it('states coverage so the average can be read with the right confidence', () => {
    // 8.5 across three of thirty sets is a different claim from 8.5 across
    // all thirty, and the average alone cannot tell them apart.
    const rows = [row({ date: '2026-09-07', sets: 30, rpeSum: 25.5, rpeCount: 3 })];
    const intensity = computeIntensity(rows, computeWeeks(rows));
    expect(intensity.averageRpe).toBe(8.5);
    expect(intensity.coverage).toBeCloseTo(0.1);
  });

  it('does not count cardio sets against RPE coverage', () => {
    // RPE is asked for on strength sets; counting a run against the
    // denominator would report the log as less rated than it is.
    const rows = [
      row({ date: '2026-09-07', sets: 4, rpeSum: 32, rpeCount: 4 }),
      row({ date: '2026-09-07', type: 'cardio', sets: 6 }),
    ];
    const intensity = computeIntensity(rows, computeWeeks(rows));
    expect(intensity.coverage).toBe(1);
  });

  it('reports no average rather than zero when nothing was rated', () => {
    const rows = [row({ date: '2026-09-07', sets: 5 })];
    const intensity = computeIntensity(rows, computeWeeks(rows));
    expect(intensity.averageRpe).toBeNull();
    expect(intensity.coverage).toBe(0);
  });
});

describe('computeCardio', () => {
  it('is absent when nothing cardio was logged', () => {
    expect(computeCardio([row({ date: '2026-09-07', sets: 3 })])).toBeNull();
  });

  it('totals minutes and distance across cardio days', () => {
    const cardio = computeCardio([
      row({ date: '2026-09-07', type: 'cardio', sets: 1, durationSeconds: 1800, distance: 5 }),
      row({ date: '2026-09-09', type: 'cardio', sets: 1, durationSeconds: 900, distance: 2.5 }),
    ]);
    expect(cardio).toMatchObject({ sessions: 2, minutes: 45, distance: 7.5 });
  });
});

describe('computeWeeks fills untrained weeks', () => {
  it('inserts the weeks with no training between two that had some', () => {
    // The bug this exists for: a chart spaces points evenly, so a fortnight
    // off drawn as a single segment is indistinguishable from one week off.
    // Seen on the real page, where 17/08 was missing between 10/08 and 24/08.
    const weeks = computeWeeks([
      row({ date: '2026-08-10', sets: 5, volume: 2970 }),
      row({ date: '2026-08-24', sets: 3, volume: 1100 }),
    ]);

    expect(weeks.map((w) => w.weekStart)).toEqual(['2026-08-10', '2026-08-17', '2026-08-24']);
    expect(weeks[1]).toMatchObject({ volume: 0, sets: 0, activeDays: 0, avgRpe: null });
  });

  it('leaves a filled week unrated rather than rating it zero', () => {
    const weeks = computeWeeks([
      row({ date: '2026-08-10', sets: 2, rpeSum: 16, rpeCount: 2 }),
      row({ date: '2026-08-24', sets: 2, rpeSum: 18, rpeCount: 2 }),
    ]);
    // A week nobody trained has no intensity to report. Zero would drag the
    // RPE line to the floor and read as a deliberately easy week.
    expect(weeks[1].avgRpe).toBeNull();
    expect(weeks.filter((w) => w.avgRpe !== null)).toHaveLength(2);
  });

  it('does not pad before the first or after the last trained week', () => {
    const weeks = computeWeeks([row({ date: '2026-08-10', sets: 1 })]);
    expect(weeks).toHaveLength(1);
    expect(weeks[0].weekStart).toBe('2026-08-10');
  });

  it('returns nothing for an empty window', () => {
    expect(computeWeeks([])).toEqual([]);
  });

  it('keeps weeks-trained counted from days, not from the padded series', () => {
    // The padding must not inflate consistency: three calendar weeks are
    // spanned, but only two were trained.
    const rows = [row({ date: '2026-08-10' }), row({ date: '2026-08-24' })];
    expect(computeWeeks(rows)).toHaveLength(3);
    expect(computeConsistency(rows).activeWeeks).toBe(2);
  });
});
