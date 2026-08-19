import { currentDay, nextPositionAfter, type Enrollment, type Program } from '../programs';

const program = (positions: number[]): Program => ({
  id: 'prog-1',
  slug: 'test',
  name: 'Test Program',
  description: '',
  days: positions.map((position) => ({
    id: `day-${position}`,
    position,
    name: `Day ${position}`,
    exercises: [],
  })),
});

const enrollment = (nextPosition: number): Enrollment => ({
  id: 'enr-1',
  programId: 'prog-1',
  startedOn: '2026-08-01',
  nextPosition,
});

describe('nextPositionAfter', () => {
  it('advances through the cycle', () => {
    expect(nextPositionAfter(1, 3)).toBe(2);
    expect(nextPositionAfter(2, 3)).toBe(3);
  });

  it('wraps back to the first day at the end', () => {
    // The whole point of a cycle: day 3 of 3 is followed by day 1, not by
    // day 4, which has no template and would strand the enrollment.
    expect(nextPositionAfter(3, 3)).toBe(1);
    expect(nextPositionAfter(2, 2)).toBe(1);
    expect(nextPositionAfter(4, 4)).toBe(1);
  });

  it('handles a single-day program', () => {
    expect(nextPositionAfter(1, 1)).toBe(1);
  });

  it('falls back to the first day for a program with no days', () => {
    // Guards a modulo by zero, which would produce NaN and persist it.
    expect(nextPositionAfter(1, 0)).toBe(1);
  });

  it('recovers from a position past the end of the cycle', () => {
    // If a program is shortened after someone enrolled, their stored
    // position can exceed the cycle; advancing must land back inside it
    // rather than climbing further out of range.
    expect(nextPositionAfter(7, 3)).toBe(2);
  });
});

describe('currentDay', () => {
  it('returns the day the enrollment points at', () => {
    const day = currentDay(program([1, 2, 3]), enrollment(2));
    expect(day?.position).toBe(2);
  });

  it('falls back to the first day when the position no longer exists', () => {
    // A shortened program must still offer a session rather than a blank
    // screen with no way forward.
    const day = currentDay(program([1, 2]), enrollment(5));
    expect(day?.position).toBe(1);
  });

  it('returns nothing without an enrollment', () => {
    expect(currentDay(program([1, 2]), null)).toBeNull();
  });

  it('returns nothing when the enrolled program is not loaded', () => {
    expect(currentDay(undefined, enrollment(1))).toBeNull();
  });

  it('returns nothing for a program with no days', () => {
    expect(currentDay(program([]), enrollment(1))).toBeNull();
  });
});
