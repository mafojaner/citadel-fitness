/**
 * The maths behind the logging widget's dial.
 *
 * Separated from the component because it is the part that can be quietly
 * wrong: an arc that drifts a degree, a detent that rounds the wrong way, or
 * an angle that jumps by a full turn when a drag crosses due-left are all
 * invisible in a screenshot and obvious in a test.
 */

/**
 * Screen coordinates, so y grows downward and angles measured from the +x
 * axis run clockwise. -90 is straight up, -180 is straight left.
 *
 * The widget lives in the bottom-right corner, so the only quadrant a ring
 * around it can occupy is the one between those two. A full circle would
 * put five of its eight items off-screen.
 */
export const TRACK_START_DEGREES = -90;
export const TRACK_SWEEP_DEGREES = 90;

/**
 * Where the aimed item sits, as a position on the track.
 *
 * One step in from the top, which is a compromise and worth naming as one.
 *
 * A list has two ends and the arc holds five, so wherever the detent sits,
 * one end of the list runs out before the arc does. Centred, the aimed item
 * has two behind it and two ahead -- lovely in the middle, and only three
 * shortcuts on screen the moment it opens, which is where everyone starts.
 * Hard against the top it opens with all five, and then the last item
 * arrives alone on an otherwise empty ring, which reads as broken rather
 * than as finished.
 *
 * One step in is the balance: four on open, five through the middle, two at
 * the end, and every shortcut can still be brought to the detent and named.
 *
 * Fixed wherever it sits: the items rotate through it, the way a scroll
 * wheel's selection line does not move.
 */
export const DETENT = 0.34;

/**
 * Track distance between neighbouring items, as a fraction of the sweep.
 *
 * At the radius the widget uses this is one disc plus a small gap, which
 * puts five of them across the quadrant with a sixth fading off the end.
 * Tightening it further would pack more on and start them touching; the
 * remaining ones are what the scrolling is for.
 */
export const STEP = 0.2;

/** Beyond this either side of the track the item has faded out entirely. */
const FADE_EDGE = 0.06;

export interface Point {
  x: number;
  y: number;
}

/**
 * A point on the track, relative to the widget's centre.
 *
 * `t` is 0 at the top of the sweep and 1 at the far end; values outside
 * that are still meaningful and are what an item scrolled off the ring is
 * given, so it travels off rather than jumping.
 */
export function arcPoint(t: number, radius: number): Point {
  const radians = ((TRACK_START_DEGREES - t * TRACK_SWEEP_DEGREES) * Math.PI) / 180;
  return { x: radius * Math.cos(radians), y: radius * Math.sin(radians) };
}

/** Where item `index` sits when the ring is turned to `offset`. */
export function trackPosition(index: number, offset: number): number {
  return DETENT + (index - offset) * STEP;
}

/**
 * Where the position dot for `index` sits, as a track position.
 *
 * Spread across the whole sweep rather than sitting under the items they
 * stand for. The items move and the dots do not: the point of the track is
 * to show how much list there is and where in it you are, and a row that
 * slid along with the ring would show neither.
 *
 * A single shortcut gets its dot at the detent, though nothing renders the
 * track at that point -- one dot is not a scale.
 */
export function dotPosition(index: number, count: number): number {
  if (count <= 1) return DETENT;
  return index / (count - 1);
}

/**
 * How solid an item is at track position `t`: 1 across the visible arc,
 * ramping to 0 just past each end.
 *
 * Ramped rather than switched, so an item leaving the ring dissolves at the
 * edge instead of blinking out one frame after it was still tappable.
 */
export function trackOpacity(t: number): number {
  if (t < -FADE_EDGE || t > 1 + FADE_EDGE) return 0;
  if (t < 0) return 1 - t / -FADE_EDGE;
  if (t > 1) return 1 - (t - 1) / FADE_EDGE;
  return 1;
}

/**
 * How much larger the item at `t` is drawn, given the detent is fixed.
 *
 * Proportional to how close it is rather than a flag on the nearest one, so
 * the emphasis grows as you turn the ring towards an item instead of
 * snapping between two of them halfway through a drag.
 */
export function trackScale(t: number, peak = 0.2): number {
  const distance = Math.abs(t - DETENT) / STEP;
  return 1 + peak * Math.max(0, 1 - distance);
}

/**
 * The shortest way round from `from` to `to`, in radians.
 *
 * Without this, a drag that crosses the seam where atan2 flips from +pi to
 * -pi reports very nearly a full turn in the opposite direction, and the
 * ring snaps to its far end mid-gesture. The seam sits at due-left, which
 * is one end of this very track.
 */
export function angleDelta(from: number, to: number): number {
  let delta = to - from;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  return delta;
}

/**
 * The ring offset a drag has reached.
 *
 * Later items queue towards the far end of the sweep -- down and to the
 * left of the widget -- so sweeping them up into the detent is what brings
 * them forward, and up is where the angle increases. Hence no negation: a
 * finger travelling anticlockwise around the widget on screen turns the
 * ring forwards.
 *
 * Divided by the step as well as the sweep, so one step's worth of arc
 * advances exactly one item however many are on the ring: the gesture is in
 * the same units as the thing it moves.
 */
export function offsetFromDrag(
  startOffset: number,
  startAngle: number,
  currentAngle: number,
  count: number
): number {
  const swept = (angleDelta(startAngle, currentAngle) * 180) / Math.PI;
  return clampOffset(startOffset + swept / TRACK_SWEEP_DEGREES / STEP, count);
}

/** Held on the ring: there is nothing before the first item or after the last. */
export function clampOffset(offset: number, count: number): number {
  if (count <= 1) return 0;
  return Math.max(0, Math.min(offset, count - 1));
}

/** The item a released ring settles on. */
export function nearestDetent(offset: number, count: number): number {
  return Math.round(clampOffset(offset, count));
}

/**
 * The driver samples an interpolation needs to trace the arc.
 *
 * `Animated.Value.interpolate` is piecewise linear, and an arc is not, so
 * the curve is handed over as points and the interpolation joins them up.
 * Enough of them that the chord error is a fraction of a pixel, which is
 * what keeps the whole ring on the compositor: the alternative is computing
 * cos and sin per frame in JavaScript and writing transforms from there.
 */
export function arcSamples(
  index: number,
  count: number,
  radius: number,
  samples = 48
): { input: number[]; x: number[]; y: number[] } {
  const input: number[] = [];
  const x: number[] = [];
  const y: number[] = [];
  const last = Math.max(count - 1, 1);

  for (let i = 0; i <= samples; i += 1) {
    const offset = (i / samples) * last;
    const point = arcPoint(trackPosition(index, offset), radius);
    input.push(offset);
    x.push(point.x);
    y.push(point.y);
  }
  return { input, x, y };
}
