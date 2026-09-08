import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from 'react-native';
import {
  DETENT,
  arcPoint,
  arcSamples,
  clampOffset,
  nearestDetent,
  offsetFromDrag,
  trackOpacity,
  trackPosition,
  trackScale,
} from '../lib/shortcutWheel';
import { useTheme } from '../theme/useTheme';

/**
 * Smaller than the 56 a floating action button conventionally gets. The
 * convention assumes the button is the screen's whole reason for existing;
 * here it sits over screens full of their own content, and at 56 it was
 * covering more of the card behind it than it needed to be noticed.
 */
export const LOG_WIDGET_SIZE = 48;

/** Big enough to stay a comfortable target once it is one of several on a ring. */
const OPTION_SIZE = 44;

/**
 * How far the ring sits from the widget's centre.
 *
 * Set by how many items should be legible at once rather than by taste: the
 * usable sweep is a quarter turn, and five discs plus their gaps need about
 * this much arc to sit along it without touching.
 */
const RADIUS = 132;

/** The label sits just outside the ring, on the detent's own line. */
const LABEL_RADIUS = RADIUS + 34;
const LABEL_MAX_WIDTH = 158;

/** Past this a touch is a turn of the ring rather than a tap on an item. */
const DRAG_THRESHOLD = 6;
/** Inside this the angle about the centre is too unstable to steer by. */
const DEAD_ZONE = 44;

const OPEN_MS = 240;
const CLOSE_MS = 180;

export interface WheelShortcut {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  /**
   * Locked shortcuts still appear, and open plans instead. Hiding them
   * would make the ring a different shape per membership, so a member who
   * upgraded would find their muscle memory wrong.
   */
  locked?: boolean;
  run: () => void;
}

interface LogShortcutWidgetProps {
  /** Distance from the bottom of the screen to the widget's own bottom edge. */
  bottom: number;
  /** Distance from the right of the screen to the widget's right edge. */
  right: number;
  shortcuts: WheelShortcut[];
}

/**
 * The logging shortcut: a plus in the bottom-right corner that opens a ring
 * of the things worth reaching without first navigating to the screen that
 * owns them.
 *
 * Every item on it is a shortcut and nothing on it is a new entry point.
 * Each one goes to a screen that already exists, by the same route the app
 * already takes to it -- which is a stronger constraint than it sounds, and
 * the reason two of the repo's guard tests point at this file's callers.
 *
 * Its colour is `ctaFill`, the mirrored pair the primary button already
 * uses -- near-black on the light theme, white on the dark one. That is
 * "black in light mode" without introducing a second near-black that would
 * then have to be kept in step with the first, and it means the widget is
 * the same object as the app's other primary action rather than a new one.
 *
 * The open state is a Modal rather than an absolute layer, for the reason
 * the workout takeover records: as a plain overlay it would sit inside the
 * navigator's content area, leaving the header lit above it and the tab bar
 * below it, so a blur that is supposed to cover the app would visibly stop
 * short of both ends.
 *
 * The options ride an arc now, where they used to stack vertically. That
 * stack existed because labels radiating from a corner overlap each other
 * and run off the right edge -- a real objection, answered here rather than
 * ignored: the ring carries icons only, and exactly one label is on screen
 * at a time, at the detent, which never moves.
 */
export function LogShortcutWidget({ bottom, right, shortcuts }: LogShortcutWidgetProps) {
  const { colors, radius, typography, scheme } = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  // Kept mounted through the closing animation, so the ring fades out
  // rather than vanishing the instant one is chosen.
  const [visible, setVisible] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));
  // The ring's rotation, in items. Drives every transform on the compositor.
  const [spin] = useState(() => new Animated.Value(0));
  /**
   * The same rotation, in plain JavaScript.
   *
   * An Animated.Value driving native transforms has no public reader, and
   * its JS listener is batched -- close enough for a label, wrong for the
   * snap on release, which has to start from exactly where the finger left
   * the ring. Every write below sets both, so this is not a cache that can
   * go stale: it is the value, and `spin` is its animated shadow.
   */
  const offsetRef = useRef(0);
  // Which item is at the detent. Text cannot be driven by Animated, so it
  // is written here -- once per detent crossed, not per frame.
  const [aimed, setAimed] = useState(0);

  const count = shortcuts.length;

  const turnTo = useCallback(
    (next: number) => {
      offsetRef.current = next;
      spin.setValue(next);
      setAimed((current) => {
        const detent = nearestDetent(next, count);
        return current === detent ? current : detent;
      });
    },
    [spin, count]
  );

  const settle = useCallback(() => {
    const detent = nearestDetent(offsetRef.current, count);
    offsetRef.current = detent;
    setAimed(detent);
    Animated.spring(spin, {
      toValue: detent,
      useNativeDriver: true,
      friction: 9,
      tension: 70,
    }).start();
  }, [spin, count]);

  // Mounting is done by whoever opens it, not here: setting state
  // synchronously inside an effect is a cascading render, and the Modal has
  // to exist before the animation starts anyway. The effect only drives the
  // animation, and only unmounts on the way out -- which happens in the
  // completion callback, where state is allowed.
  useEffect(() => {
    Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: open ? OPEN_MS : CLOSE_MS,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !open) setVisible(false);
    });
  }, [open, progress]);

  const close = useCallback(() => setOpen(false), []);
  const openMenu = useCallback(() => {
    // Back to the first item each time. The ring is a shortcut, so it should
    // be in the same place every time it is opened rather than wherever the
    // last gesture left it -- muscle memory is most of what makes a shortcut
    // faster than navigating.
    turnTo(0);
    setVisible(true);
    setOpen(true);
  }, [turnTo]);

  const choose = useCallback(
    (shortcut: WheelShortcut) => {
      setOpen(false);
      // After the close, not with it: navigating mid-animation unmounts the
      // Modal under its own exit and the blur snaps away rather than lifting.
      setTimeout(shortcut.run, CLOSE_MS);
    },
    []
  );

  /** The widget's centre in screen coordinates, which the drag steers about. */
  const centre = useMemo(
    () => ({
      x: screenWidth - right - LOG_WIDGET_SIZE / 2,
      y: screenHeight - bottom - LOG_WIDGET_SIZE / 2,
    }),
    [screenWidth, screenHeight, right, bottom]
  );

  /**
   * Where the current drag began, and whether it is steering the ring.
   *
   * Raw responder props rather than a PanResponder, which would have to be
   * built during render and closed over mutable locals -- both of which the
   * hook rules refuse, and rightly: everything a gesture remembers belongs
   * in a ref that only its own handlers touch. PanResponder is a wrapper
   * over exactly these props, so nothing is lost but the factory.
   */
  const dragRef = useRef({ x: 0, y: 0, angle: 0, offset: 0, steering: false, moved: false });

  const angleAt = (x: number, y: number) => Math.atan2(y - centre.y, x - centre.x);

  /** Records the touch down without claiming it, so a tap still reaches an item. */
  const onTouchStart = (event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    // Too near the middle and a small movement of the finger is a large
    // change of angle, so the ring would bolt on the first frame.
    dragRef.current = {
      x: pageX,
      y: pageY,
      angle: angleAt(pageX, pageY),
      offset: offsetRef.current,
      steering: Math.hypot(pageX - centre.x, pageY - centre.y) > DEAD_ZONE,
      moved: false,
    };
    return false;
  };

  /**
   * Claims the gesture once it is clearly a drag rather than a tap.
   *
   * In the capture phase, so it can be taken back off an item's Pressable:
   * a finger that lands on a shortcut and then turns the ring is turning
   * the ring, not pressing the shortcut.
   */
  const onMoveShouldSetResponderCapture = (event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    const drag = dragRef.current;
    return drag.steering && Math.hypot(pageX - drag.x, pageY - drag.y) > DRAG_THRESHOLD;
  };

  const onResponderMove = (event: GestureResponderEvent) => {
    const drag = dragRef.current;
    if (!drag.steering) return;
    const { pageX, pageY } = event.nativeEvent;
    drag.moved = true;
    turnTo(offsetFromDrag(drag.offset, drag.angle, angleAt(pageX, pageY), count));
  };

  /**
   * A turn settles; a tap on empty space closes.
   *
   * The two arrive at the same handler because they are the same touch
   * until it moves, and the backdrop is no longer a separate pressable it
   * could land on instead -- see the note on the container below.
   */
  const onResponderEnd = () => {
    const drag = dragRef.current;
    drag.steering = false;
    if (drag.moved) {
      drag.moved = false;
      settle();
      return;
    }
    close();
  };

  /** Nudged one detent at a time, for anything that cannot swipe an arc. */
  const step = useCallback(
    (delta: number) => {
      offsetRef.current = clampOffset(nearestDetent(offsetRef.current, count) + delta, count);
      settle();
    },
    [settle, count]
  );

  // A plus that becomes a cross. The same glyph rotated is one object
  // changing state; swapping to a different icon would be two.
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  const widgetFace = (
    <View
      style={{
        width: LOG_WIDGET_SIZE,
        height: LOG_WIDGET_SIZE,
        borderRadius: LOG_WIDGET_SIZE / 2,
        backgroundColor: colors.ctaFill,
        alignItems: 'center',
        justifyContent: 'center',
        // Matches the primary button's split: a shadow under a white
        // control on a near-black page is invisible work.
        shadowColor: '#000',
        shadowOpacity: scheme === 'dark' ? 0 : 0.24,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 5 },
        elevation: scheme === 'dark' ? 0 : 6,
      }}
    >
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Ionicons name="add" size={26} color={colors.ctaText} />
      </Animated.View>
    </View>
  );

  const labelPoint = arcPoint(DETENT, LABEL_RADIUS);
  const aimedShortcut = shortcuts[aimed];

  return (
    <>
      <Pressable
        onPress={openMenu}
        accessibilityRole="button"
        accessibilityLabel="Shortcuts"
        accessibilityHint={`Opens a dial of ${count} shortcuts`}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => ({
          position: 'absolute',
          right,
          bottom,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        })}
      >
        {widgetFace}
      </Pressable>

      <Modal
        visible={visible}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={close}
      >
        {/* One surface for the whole overlay: the backdrop, the ring and
            the gesture that turns it.
            *
            * The backdrop used to be its own Pressable and the ring a
            * `box-none` layer above it -- which is exactly why the first
            * version did not turn at all. `box-none` means the view is
            * never itself the target of a touch, so responder props on it
            * can never fire. Merging the two gives the drag somewhere to
            * live, and costs only that dismissing-by-tapping-away is now a
            * release with no movement rather than a separate button.
            *
            * The claim is in the bubble phase, so a child gets first
            * refusal and a tap on a shortcut is still a tap on that
            * shortcut. Only the move handler captures, which is what lets a
            * finger that landed on an item change its mind and turn the
            * ring instead. */}
        <View
          style={StyleSheet.absoluteFill}
          onStartShouldSetResponder={() => true}
          onStartShouldSetResponderCapture={onTouchStart}
          onMoveShouldSetResponderCapture={onMoveShouldSetResponderCapture}
          onResponderMove={onResponderMove}
          onResponderRelease={onResponderEnd}
          onResponderTerminate={onResponderEnd}
          onResponderTerminationRequest={() => false}
          accessibilityRole="adjustable"
          accessibilityLabel="Shortcut dial"
          accessibilityValue={{ text: aimedShortcut ? aimedShortcut.label : '' }}
          accessibilityActions={[
            { name: 'increment', label: 'Next shortcut' },
            { name: 'decrement', label: 'Previous shortcut' },
          ]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'increment') step(1);
            if (event.nativeEvent.actionName === 'decrement') step(-1);
          }}
        >
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { opacity: progress }]}
          >
            <BlurView
              intensity={28}
              tint={scheme === 'dark' ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
            {/* Under the blur on platforms where it resolves to very little
                -- the point is that the app behind stops competing for
                attention, and a blur alone does not always achieve that. */}
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: scheme === 'dark' ? 'rgba(11,14,20,0.4)' : 'rgba(11,14,20,0.18)' },
              ]}
            />
          </Animated.View>

          {/* The label, at the detent, which does not move. One at a time is
              what makes labels possible on an arc at all. */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: right + LOG_WIDGET_SIZE / 2 - labelPoint.x - LABEL_MAX_WIDTH / 2,
              bottom: bottom + LOG_WIDGET_SIZE / 2 - labelPoint.y,
              width: LABEL_MAX_WIDTH,
              alignItems: 'center',
              opacity: progress,
              transform: [{ scale: progress }],
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: colors.surface,
                borderRadius: radius.pill,
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderWidth: 1,
                borderColor: colors.border,
                maxWidth: LABEL_MAX_WIDTH,
              }}
            >
              {aimedShortcut?.locked ? (
                <Ionicons name="lock-closed" size={12} color={colors.textMuted} />
              ) : null}
              <Text
                style={[
                  typography.body,
                  { color: colors.textPrimary, fontWeight: '700', flexShrink: 1 },
                ]}
                numberOfLines={1}
              >
                {aimedShortcut?.label ?? ''}
              </Text>
            </View>
          </Animated.View>

          {shortcuts.map((shortcut, index) => {
            const samples = arcSamples(index, count, RADIUS);
            const translateX = spin.interpolate({
              inputRange: samples.input,
              outputRange: samples.x,
              extrapolate: 'clamp',
            });
            const translateY = spin.interpolate({
              inputRange: samples.input,
              outputRange: samples.y,
              extrapolate: 'clamp',
            });

            // Opacity and scale are piecewise linear in the offset already,
            // so they need no sampling -- one segment per item position.
            const positions = shortcuts.map((_, i) => i);
            const ringOpacity = spin.interpolate({
              inputRange: positions,
              outputRange: positions.map((offset) => trackOpacity(trackPosition(index, offset))),
              extrapolate: 'clamp',
            });
            const scale = spin.interpolate({
              inputRange: positions,
              outputRange: positions.map((offset) => trackScale(trackPosition(index, offset))),
              extrapolate: 'clamp',
            });

            const off = Math.abs(index - aimed) > 2;

            return (
              <Animated.View
                key={shortcut.key}
                // Only what is on the arc can be tapped. An item faded to
                // nothing is still in the tree, and a tap landing on it
                // would be a tap on something invisible.
                pointerEvents={off ? 'none' : 'box-none'}
                style={{
                  position: 'absolute',
                  right: right + LOG_WIDGET_SIZE / 2 - OPTION_SIZE / 2,
                  bottom: bottom + LOG_WIDGET_SIZE / 2 - OPTION_SIZE / 2,
                  opacity: Animated.multiply(ringOpacity, progress),
                  transform: [
                    { translateX },
                    // Straight through, not negated. `bottom` above grows
                    // upward and translateY grows downward, which is easy to
                    // conflate -- but they are different coordinate systems:
                    // `bottom` only sets where the untransformed element
                    // sits, and the transform then moves it in screen space,
                    // where the arc's own negative y already means up.
                    { translateY },
                    { scale: Animated.multiply(scale, progress) },
                  ],
                }}
              >
                <Pressable
                  onPress={() => choose(shortcut)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    shortcut.locked ? `${shortcut.label}, locked. Opens plans.` : shortcut.label
                  }
                  style={({ pressed }) => ({
                    width: OPTION_SIZE,
                    height: OPTION_SIZE,
                    borderRadius: OPTION_SIZE / 2,
                    backgroundColor: index === aimed ? colors.ctaFill : colors.surface,
                    borderWidth: 1,
                    borderColor: index === aimed ? colors.ctaFill : colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Ionicons
                    name={shortcut.icon}
                    size={20}
                    color={index === aimed ? colors.ctaText : colors.textPrimary}
                  />
                  {shortcut.locked ? (
                    <View
                      style={{
                        position: 'absolute',
                        right: -1,
                        bottom: -1,
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="lock-closed" size={8} color={colors.textMuted} />
                    </View>
                  ) : null}
                </Pressable>
              </Animated.View>
            );
          })}

          {/* The widget itself, redrawn at the same coordinates so it does
              not appear to move when the ring opens. The real one is behind
              the blur; this is the one that rotates. */}
          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Close shortcuts"
            style={{ position: 'absolute', right, bottom }}
          >
            {widgetFace}
          </Pressable>
        </View>
      </Modal>
    </>
  );
}
