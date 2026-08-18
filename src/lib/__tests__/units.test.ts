import {
  convertDistance,
  convertWeight,
  formatDuration,
  partsToSeconds,
  roundForDisplay,
  secondsToParts,
} from '../units';

describe('convertWeight', () => {
  it('returns the value untouched when the units match', () => {
    // Not just an optimisation: it guarantees no floating-point drift is
    // introduced on the common path where nothing needs converting.
    expect(convertWeight(102.5, 'kg', 'kg')).toBe(102.5);
    expect(convertWeight(102.5, 'lb', 'lb')).toBe(102.5);
  });

  it('converts kg to lb and back', () => {
    expect(convertWeight(100, 'kg', 'lb')).toBeCloseTo(220.462, 3);
    expect(convertWeight(220.462, 'lb', 'kg')).toBeCloseTo(100, 3);
  });

  it('round-trips without meaningful loss', () => {
    // The property that actually matters: a weight logged in one unit and
    // displayed in the other must not drift as preferences get toggled.
    const original = 87.5;
    const roundTripped = convertWeight(convertWeight(original, 'kg', 'lb'), 'lb', 'kg');
    expect(roundTripped).toBeCloseTo(original, 10);
  });

  it('handles zero', () => {
    expect(convertWeight(0, 'kg', 'lb')).toBe(0);
  });
});

describe('convertDistance', () => {
  it('returns the value untouched when the units match', () => {
    expect(convertDistance(5.5, 'km', 'km')).toBe(5.5);
  });

  it('converts km to mi and back', () => {
    expect(convertDistance(10, 'km', 'mi')).toBeCloseTo(6.2137, 4);
    expect(convertDistance(6.2137, 'mi', 'km')).toBeCloseTo(10, 3);
  });

  it('round-trips without meaningful loss', () => {
    const original = 42.195;
    const roundTripped = convertDistance(convertDistance(original, 'km', 'mi'), 'mi', 'km');
    expect(roundTripped).toBeCloseTo(original, 10);
  });
});

describe('roundForDisplay', () => {
  it('rounds to one decimal place', () => {
    expect(roundForDisplay(220.46226)).toBe(220.5);
    expect(roundForDisplay(1.04)).toBe(1);
  });

  it('rounds half away from zero for positives', () => {
    expect(roundForDisplay(1.05)).toBe(1.1);
  });

  it('leaves an already-short value alone', () => {
    expect(roundForDisplay(5)).toBe(5);
    expect(roundForDisplay(5.5)).toBe(5.5);
  });
});

describe('secondsToParts', () => {
  it('splits a duration into hours, minutes and seconds', () => {
    expect(secondsToParts(5025)).toEqual({ hours: 1, minutes: 23, seconds: 45 });
  });

  it('handles durations under a minute', () => {
    expect(secondsToParts(45)).toEqual({ hours: 0, minutes: 0, seconds: 45 });
  });

  it('handles exact hours', () => {
    expect(secondsToParts(3600)).toEqual({ hours: 1, minutes: 0, seconds: 0 });
  });

  it('clamps negatives to zero rather than emitting negative parts', () => {
    expect(secondsToParts(-100)).toEqual({ hours: 0, minutes: 0, seconds: 0 });
  });

  it('rounds fractional seconds', () => {
    expect(secondsToParts(59.6)).toEqual({ hours: 0, minutes: 1, seconds: 0 });
  });
});

describe('partsToSeconds', () => {
  it('composes parts back into a total', () => {
    expect(partsToSeconds(1, 23, 45)).toBe(5025);
  });

  it('treats negative parts as zero instead of subtracting time', () => {
    expect(partsToSeconds(-1, 30, 0)).toBe(1800);
    expect(partsToSeconds(0, -5, -5)).toBe(0);
  });

  it('is the inverse of secondsToParts', () => {
    // The pair backs one duration input, so a value entered, split across
    // three fields and recombined has to survive the trip unchanged.
    for (const total of [0, 45, 330, 3600, 5025, 86399]) {
      const { hours, minutes, seconds } = secondsToParts(total);
      expect(partsToSeconds(hours, minutes, seconds)).toBe(total);
    }
  });
});

describe('formatDuration', () => {
  it('formats hours and minutes, dropping seconds', () => {
    expect(formatDuration(5025)).toBe('1h 23m');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(330)).toBe('5m 30s');
  });

  it('formats seconds alone', () => {
    expect(formatDuration(45)).toBe('45s');
  });

  it('shows 0s rather than an empty string for a zero duration', () => {
    expect(formatDuration(0)).toBe('0s');
  });

  it('keeps a zero-minute hour visible', () => {
    expect(formatDuration(3600)).toBe('1h 0m');
  });
});
