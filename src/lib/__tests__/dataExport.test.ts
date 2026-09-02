import { escapeCsvCell, toCsv } from '../csv';
import { buildWorkoutCsv, rangeStart } from '../dataExport';

const workout = (date: string, name: string, sets: Record<string, unknown>[], over: Record<string, unknown> = {}) => ({
  date,
  logged_same_day: true,
  logged_exercises: [
    {
      exercises: { name, category: 'chest', type: 'strength' },
      set_entries: sets.map((s, i) => ({
        set_number: i + 1,
        reps: 10,
        weight: 100,
        weight_unit: 'kg',
        duration_seconds: null,
        distance: null,
        distance_unit: 'km',
        ...s,
      })),
    },
  ],
  ...over,
}) as never;

describe('escapeCsvCell', () => {
  it('leaves ordinary values alone', () => {
    expect(escapeCsvCell('Bench Press')).toBe('Bench Press');
    expect(escapeCsvCell(100)).toBe('100');
  });

  it('quotes a value containing a comma', () => {
    // Without this the cell splits in two and every later column shifts.
    expect(escapeCsvCell('Squat, high bar')).toBe('"Squat, high bar"');
  });

  it('doubles embedded quotes rather than backslash-escaping them', () => {
    // Backslash escaping is the common mistake; spreadsheets read it
    // literally and the quote survives into the data.
    expect(escapeCsvCell('The "big three"')).toBe('"The ""big three"""');
  });

  it('quotes values containing newlines', () => {
    expect(escapeCsvCell('line one\nline two')).toBe('"line one\nline two"');
    expect(escapeCsvCell('line one\r\nline two')).toBe('"line one\r\nline two"');
  });

  it('renders null and undefined as empty, not as the words', () => {
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
  });

  it('preserves zero rather than treating it as absent', () => {
    expect(escapeCsvCell(0)).toBe('0');
  });
});

describe('toCsv', () => {
  it('writes a header row followed by data, CRLF separated', () => {
    expect(toCsv(['a', 'b'], [[1, 2], [3, 4]])).toBe('a,b\r\n1,2\r\n3,4');
  });

  it('emits only headers when there are no rows', () => {
    expect(toCsv(['a', 'b'], [])).toBe('a,b');
  });
});

describe('buildWorkoutCsv', () => {
  it('writes one row per set with a header', () => {
    const csv = buildWorkoutCsv([workout('2026-08-01', 'Bench Press', [{}, {}])]);
    const lines = csv.split('\r\n');
    expect(lines[0].startsWith('date,exercise,category,type,set_number')).toBe(true);
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('2026-08-01,Bench Press,chest,strength,1,10,100,kg');
  });

  it('exports stored units without converting them', () => {
    // The point of an export is fidelity: a set logged in lb stays lb, so
    // the file doesn't depend on whichever preference was set that day.
    const csv = buildWorkoutCsv([
      workout('2026-08-01', 'Bench Press', [{ weight: 225, weight_unit: 'lb' }]),
    ]);
    expect(csv).toContain('225,lb');
  });

  it('orders workouts oldest first', () => {
    const csv = buildWorkoutCsv([
      workout('2026-08-10', 'Later', [{}]),
      workout('2026-08-01', 'Earlier', [{}]),
    ]);
    const lines = csv.split('\r\n');
    expect(lines[1]).toContain('Earlier');
    expect(lines[2]).toContain('Later');
  });

  it('orders sets within an exercise by set number', () => {
    const csv = buildWorkoutCsv([
      workout('2026-08-01', 'Bench Press', [
        { set_number: 3, reps: 3 },
        { set_number: 1, reps: 1 },
        { set_number: 2, reps: 2 },
      ]),
    ]);
    const reps = csv.split('\r\n').slice(1).map((l) => l.split(',')[5]);
    expect(reps).toEqual(['1', '2', '3']);
  });

  it('quotes an exercise name containing a comma', () => {
    const csv = buildWorkoutCsv([workout('2026-08-01', 'Squat, high bar', [{}])]);
    expect(csv).toContain('"Squat, high bar"');
    // Still the right number of columns despite the comma in the name.
    expect(csv.split('\r\n')[1].split(',')).toHaveLength(13);
  });

  it('writes empty cells for absent cardio fields rather than null', () => {
    const csv = buildWorkoutCsv([workout('2026-08-01', 'Bench Press', [{}])]);
    expect(csv).not.toContain('null');
  });

  it('includes cardio duration and distance when present', () => {
    const csv = buildWorkoutCsv([
      workout('2026-08-01', 'Running', [
        { reps: 0, weight: 0, duration_seconds: 1800, distance: 5, distance_unit: 'km' },
      ]),
    ]);
    expect(csv).toContain('1800,5,km');
  });

  it('produces a header-only file when nothing has been logged', () => {
    const csv = buildWorkoutCsv([]);
    expect(csv.split('\r\n')).toHaveLength(1);
    expect(csv).toContain('date,exercise');
  });
});

describe('rangeStart', () => {
  const today = new Date('2026-09-02T12:00:00Z');

  it('returns nothing for the whole history', () => {
    expect(rangeStart('all', today)).toBeNull();
  });

  it('counts inclusively, so 30 days means thirty including today', () => {
    // 2026-09-02 back 29 days is 2026-08-04, giving Aug 4 .. Sep 2 = 30 days.
    expect(rangeStart('30', today)).toBe('2026-08-04');
  });

  it('crosses a year boundary rather than clamping', () => {
    expect(rangeStart('365', new Date('2026-01-10T12:00:00Z'))).toBe('2025-01-11');
  });

  it('does not mutate the date it was given', () => {
    const origin = new Date('2026-09-02T12:00:00Z');
    rangeStart('90', origin);
    expect(origin.toISOString()).toBe('2026-09-02T12:00:00.000Z');
  });
});
