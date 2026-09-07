import { addDays, weekOf } from '../analytics';

describe('weekOf', () => {
  it('returns seven consecutive days', () => {
    const week = weekOf('2026-09-07');
    expect(week).toHaveLength(7);
    for (let i = 1; i < week.length; i++) {
      expect(week[i]).toBe(addDays(week[i - 1], 1));
    }
  });

  it('starts on the Sunday, whichever day of the week you hand it', () => {
    // 2026-09-07 is a Monday, so its week runs Sun 6th to Sat 12th. Every
    // day in that span has to produce the same seven.
    const expected = [
      '2026-09-06',
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
    ];
    for (const day of expected) {
      expect(`${day}:${weekOf(day).join(',')}`).toBe(`${day}:${expected.join(',')}`);
    }
  });

  it('keeps the Sunday when the Sunday is the argument', () => {
    // The off-by-one that a naive "go back to Sunday" gets wrong: a Sunday
    // must not roll back to the Sunday before it.
    expect(weekOf('2026-09-06')[0]).toBe('2026-09-06');
  });

  it('crosses a month boundary rather than clamping to it', () => {
    // 2026-10-01 is a Thursday, so its week starts in September. A strip
    // that stopped at the 1st would silently hide half the week.
    expect(weekOf('2026-10-01')).toEqual([
      '2026-09-27',
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
    ]);
  });

  it('crosses a year boundary', () => {
    // 2027-01-01 is a Friday.
    const week = weekOf('2027-01-01');
    expect(week[0]).toBe('2026-12-27');
    expect(week[6]).toBe('2027-01-02');
  });

  it('handles a leap day', () => {
    // 2028-02-29 is a Tuesday; the week has to run through it, not around.
    expect(weekOf('2028-02-29')).toContain('2028-02-29');
    expect(weekOf('2028-02-29')[0]).toBe('2028-02-27');
  });

  it('always contains the day it was asked about', () => {
    for (let i = 0; i < 40; i++) {
      const day = addDays('2026-09-07', i * 9);
      expect(`${day}:${weekOf(day).includes(day)}`).toBe(`${day}:true`);
    }
  });
});
