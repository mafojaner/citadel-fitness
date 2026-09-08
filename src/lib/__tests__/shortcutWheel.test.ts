import {
  DETENT,
  STEP,
  TRACK_SWEEP_DEGREES,
  angleDelta,
  arcPoint,
  arcSamples,
  clampOffset,
  nearestDetent,
  offsetFromDrag,
  trackOpacity,
  trackPosition,
  trackScale,
} from '../shortcutWheel';

/** Screen coordinates: x right, y down, so "up" is negative y. */
const UP = 0;
const LEFT = 1;

describe('the track', () => {
  it('starts straight up and ends straight left', () => {
    // The widget lives in the bottom-right corner, so this quadrant is the
    // only one a ring around it can occupy without leaving the screen.
    const up = arcPoint(UP, 100);
    expect(up.x).toBeCloseTo(0, 6);
    expect(up.y).toBeCloseTo(-100, 6);

    const left = arcPoint(LEFT, 100);
    expect(left.x).toBeCloseTo(-100, 6);
    expect(left.y).toBeCloseTo(0, 6);
  });

  it('stays on the circle the whole way round', () => {
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const point = arcPoint(t, 132);
      expect(Math.hypot(point.x, point.y)).toBeCloseTo(132, 6);
    }
  });

  it('never crosses into the quadrant the screen edge is in', () => {
    // x must not go positive (right of the widget, where there is no room)
    // and y must not go positive (below it, where the tab bar is).
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const point = arcPoint(t, 132);
      expect(point.x).toBeLessThanOrEqual(1e-9);
      expect(point.y).toBeLessThanOrEqual(1e-9);
    }
  });

  it('puts the item the ring is turned to on the detent', () => {
    expect(trackPosition(0, 0)).toBeCloseTo(DETENT, 6);
    expect(trackPosition(3, 3)).toBeCloseTo(DETENT, 6);
  });

  it('queues the rest either side of it', () => {
    // Both sides, which is what makes it read as a wheel rather than a list
    // that happens to be curved: what is coming next is visible, and so is
    // what has just gone by.
    expect(trackPosition(1, 0)).toBeGreaterThan(DETENT);
    expect(trackPosition(0, 1)).toBeLessThan(DETENT);
  });

  it('shows about five at once', () => {
    // The number the radius was chosen for. Fewer and the wheel is a fan;
    // more and the discs touch.
    const onTrack = [0, 1, 2, 3, 4, 5, 6, 7].filter(
      (index) => trackOpacity(trackPosition(index, 2)) > 0
    );
    expect(onTrack.length).toBe(5);
  });
});

describe('fading at the ends', () => {
  it('is solid across the visible arc', () => {
    expect(trackOpacity(0)).toBe(1);
    expect(trackOpacity(DETENT)).toBe(1);
    expect(trackOpacity(1)).toBe(1);
  });

  it('ramps rather than switching, so nothing blinks out', () => {
    const justOff = trackOpacity(-0.03);
    expect(justOff).toBeGreaterThan(0);
    expect(justOff).toBeLessThan(1);
  });

  it('is gone once well past either end', () => {
    expect(trackOpacity(-0.5)).toBe(0);
    expect(trackOpacity(1.5)).toBe(0);
  });
});

describe('emphasis', () => {
  it('is largest exactly on the detent', () => {
    expect(trackScale(DETENT)).toBeCloseTo(1.2, 6);
  });

  it('falls away smoothly rather than snapping between neighbours', () => {
    const near = trackScale(DETENT + STEP * 0.25);
    const far = trackScale(DETENT + STEP * 0.75);
    expect(near).toBeGreaterThan(far);
    expect(far).toBeGreaterThan(1);
  });

  it('is back to normal size a full step away', () => {
    expect(trackScale(DETENT + STEP)).toBeCloseTo(1, 6);
    expect(trackScale(DETENT - STEP)).toBeCloseTo(1, 6);
  });
});

describe('angleDelta', () => {
  it('measures a small turn as a small turn', () => {
    expect(angleDelta(0, 0.2)).toBeCloseTo(0.2, 6);
    expect(angleDelta(0.2, 0)).toBeCloseTo(-0.2, 6);
  });

  it('takes the short way round the seam', () => {
    // atan2 flips from +pi to -pi at due-left, which is one end of this very
    // track. Without unwrapping, a drag crossing it reports very nearly a
    // full turn the other way and the ring bolts to its far end mid-gesture.
    const justBefore = Math.PI - 0.05;
    const justAfter = -Math.PI + 0.05;
    expect(angleDelta(justBefore, justAfter)).toBeCloseTo(0.1, 6);
    expect(angleDelta(justAfter, justBefore)).toBeCloseTo(-0.1, 6);
  });

  it('never reports more than half a turn', () => {
    for (let from = -Math.PI; from < Math.PI; from += 0.3) {
      for (let to = -Math.PI; to < Math.PI; to += 0.3) {
        expect(Math.abs(angleDelta(from, to))).toBeLessThanOrEqual(Math.PI + 1e-9);
      }
    }
  });
});

describe('dragging the ring', () => {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;

  it('turns towards later items when swept anticlockwise on screen', () => {
    // Screen y grows downward, so sweeping from due-left towards straight-up
    // is the direction a finger travels going up and to the right around the
    // widget. That should bring later items to the detent.
    const swept = offsetFromDrag(0, radians(-180), radians(-180 + TRACK_SWEEP_DEGREES / 2), 8);
    expect(swept).toBeGreaterThan(0);
  });

  it('turns back the other way', () => {
    const swept = offsetFromDrag(4, radians(-90), radians(-90 - TRACK_SWEEP_DEGREES / 2), 8);
    expect(swept).toBeLessThan(4);
  });

  it('moves one item for one step of arc', () => {
    // The gesture is in the same units as the thing it moves: sweeping
    // exactly one step's worth of arc advances exactly one item, whatever
    // the radius or the number of them.
    const oneStep = radians(TRACK_SWEEP_DEGREES * STEP);
    expect(offsetFromDrag(2, 0, oneStep, 8)).toBeCloseTo(3, 6);
    expect(offsetFromDrag(2, 0, -oneStep, 8)).toBeCloseTo(1, 6);
  });

  it('stops at the ends rather than running off the ring', () => {
    expect(offsetFromDrag(0, 0, radians(-90), 8)).toBe(0);
    expect(offsetFromDrag(7, 0, radians(90), 8)).toBe(7);
    // And the clamp is the only thing stopping it: unclamped, that sweep is
    // nearly four items past the end.
    expect(offsetFromDrag(7, 0, radians(45), 8)).toBe(7);
  });
});

describe('settling', () => {
  it('lands on the nearest item', () => {
    expect(nearestDetent(2.4, 8)).toBe(2);
    expect(nearestDetent(2.6, 8)).toBe(3);
  });

  it('cannot settle past either end', () => {
    expect(nearestDetent(-3, 8)).toBe(0);
    expect(nearestDetent(99, 8)).toBe(7);
  });

  it('holds still with a single item', () => {
    expect(clampOffset(5, 1)).toBe(0);
    expect(nearestDetent(5, 1)).toBe(0);
  });
});

describe('arcSamples', () => {
  it('traces the same curve the arc does', () => {
    // The samples are what an Animated interpolation is handed, so a drift
    // here is a ring that does not sit on its own circle.
    const { input, x, y } = arcSamples(3, 8, 132);
    for (let i = 0; i < input.length; i += 1) {
      const exact = arcPoint(trackPosition(3, input[i]), 132);
      expect(x[i]).toBeCloseTo(exact.x, 6);
      expect(y[i]).toBeCloseTo(exact.y, 6);
    }
  });

  it('covers the whole range the ring can be turned to', () => {
    const { input } = arcSamples(0, 8, 132);
    expect(input[0]).toBe(0);
    expect(input[input.length - 1]).toBe(7);
  });

  it('rises monotonically, which interpolate requires of its input', () => {
    const { input } = arcSamples(0, 8, 132);
    for (let i = 1; i < input.length; i += 1) {
      expect(input[i]).toBeGreaterThan(input[i - 1]);
    }
  });

  it('is fine enough that the straight lines between samples read as a curve', () => {
    // Animated.interpolate joins the points with straight lines, so the
    // error that matters is the gap between chord and arc at the midpoint
    // of a segment. A fraction of a pixel is invisible; a whole one is a
    // ring with flat spots.
    const { input, x, y } = arcSamples(0, 8, 132);
    for (let i = 1; i < input.length; i += 1) {
      const midpoint = arcPoint(trackPosition(0, (input[i - 1] + input[i]) / 2), 132);
      const chordX = (x[i - 1] + x[i]) / 2;
      const chordY = (y[i - 1] + y[i]) / 2;
      expect(Math.hypot(chordX - midpoint.x, chordY - midpoint.y)).toBeLessThan(0.5);
    }
  });

  it('does not divide by zero on a single-item ring', () => {
    expect(() => arcSamples(0, 1, 132)).not.toThrow();
  });
});
