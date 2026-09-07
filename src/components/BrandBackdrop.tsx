import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { darkColors, gradients } from '../theme/tokens';

/**
 * The two pieces the app's full-screen brand moments are built from: a
 * flame-gradient band and a field of outline glyphs drifting upward on a
 * near-black ground.
 *
 * Shared rather than copied because there are two of these moments now --
 * the workout-saved takeover and the first-run intro -- and they have to
 * be recognisably the same surface. A second copy is how the intro ends up
 * with the band from before someone adjusted it.
 *
 * What is deliberately *not* shared is the choreography. The takeover
 * wipes a band up from the button and lets it settle; the intro slides two
 * in and re-poses them per slide. Those are different motions over the
 * same drawing, so each screen owns its own animation and this owns what
 * gets painted.
 */

/** The ground both moments sit on, in both themes -- see BrandBackdrop's note. */
export const BACKDROP = darkColors.background;

/**
 * Band dimensions for a screen of this size.
 *
 * Wider than the screen on purpose, so a band always runs off both edges
 * rather than ending somewhere a viewer can see -- what makes it read as a
 * stripe passing through rather than a shape sitting on the page.
 */
export function bandSize(width: number, height: number) {
  return { width: width * 1.8, height: height * 0.2 };
}

interface GradientBandProps {
  width: number;
  height: number;
  /** Transform and opacity. The caller animates; this just draws. */
  style?: Animated.WithAnimatedValue<StyleProp<ViewStyle>>;
}

export function GradientBand({ width, height, style }: GradientBandProps) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width,
          height,
          borderRadius: height / 2,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <LinearGradient
        colors={gradients.flame}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

interface DriftPiece {
  icon: keyof typeof Ionicons.glyphMap;
  size: number;
  left: number;
  startTop: number;
  drift: number;
  wobble: number;
  peakOpacity: number;
  delay: number;
  duration: number;
}

const DRIFT_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'barbell-outline',
  'flame-outline',
  'trophy-outline',
  'thumbs-up-outline',
];

function generatePieces(width: number, height: number, spanMs: number): DriftPiece[] {
  const count = Math.round(width / 34);
  return Array.from({ length: count }, (_, i) => ({
    icon: DRIFT_ICONS[i % DRIFT_ICONS.length],
    size: 18 + Math.random() * 14,
    left: Math.random() * width,
    // Starts anywhere from mid-screen to well below it, so pieces keep
    // entering from the bottom rather than all drifting past at once.
    startTop: height * 0.4 + Math.random() * height * 0.9,
    drift: height * 0.35 + Math.random() * height * 0.35,
    wobble: (Math.random() - 0.5) * 40,
    peakOpacity: 0.35 + Math.random() * 0.35,
    delay: Math.random() * Math.max(0, spanMs - 700),
    duration: 1000 + Math.random() * 700,
  }));
}

interface DriftingIconFieldProps {
  width: number;
  height: number;
  /**
   * How long the field has to fill. Start delays are spread across it, so
   * a two-second takeover gets everything moving at once and a screen
   * someone reads at their own pace keeps producing new pieces.
   */
  spanMs: number;
  /** Replay with fresh pieces when this changes. */
  generation?: number;
}

/**
 * Icons animating only transform and opacity, which is what keeps the
 * whole field on the compositor thread -- the same constraint
 * WelcomeBackMoment documents, and the reason the confetti this grew out
 * of stopped using a physics-simulated particle library.
 */
export function DriftingIconField({ width, height, spanMs, generation = 0 }: DriftingIconFieldProps) {
  // Keyed remount rather than regenerating in place: every piece owns an
  // Animated.Value mid-flight, and swapping the array under them leaves
  // the old values driving views that no longer exist.
  return (
    <DriftBatch key={generation} width={width} height={height} spanMs={spanMs} />
  );
}

function DriftBatch({ width, height, spanMs }: { width: number; height: number; spanMs: number }) {
  // Lazy initializer: called once per mount and cached, the documented
  // escape hatch for one-time non-deterministic setup that isn't expected
  // to be a pure function of props the way useMemo's callback is.
  const [pieces] = useState(() => generatePieces(width, height, spanMs));
  const [progress] = useState(() => pieces.map(() => new Animated.Value(0)));

  useEffect(() => {
    Animated.parallel(
      pieces.map((piece, i) =>
        Animated.timing(progress[i], {
          toValue: 1,
          duration: piece.duration,
          delay: piece.delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      )
    ).start();
  }, [pieces, progress]);

  return (
    <>
      {pieces.map((piece, i) => {
        const translateY = progress[i].interpolate({ inputRange: [0, 1], outputRange: [0, -piece.drift] });
        const translateX = progress[i].interpolate({ inputRange: [0, 1], outputRange: [0, piece.wobble] });
        const opacity = progress[i].interpolate({
          inputRange: [0, 0.15, 0.75, 1],
          outputRange: [0, piece.peakOpacity, piece.peakOpacity, 0],
        });
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: piece.left,
              top: piece.startTop,
              opacity,
              transform: [{ translateY }, { translateX }],
            }}
          >
            <Ionicons name={piece.icon} size={piece.size} color={darkColors.textPrimary} />
          </Animated.View>
        );
      })}
    </>
  );
}

const BACKDROP_FADE_MS = 140;
const SKIP_DELAY_MS = 250;
const SKIP_FADE_MS = 260;
const EXIT_MS = 260;

interface BrandMomentProps {
  /**
   * Time on screen before it starts leaving, measured from mount. Includes
   * whatever entrance the caller draws -- this owns when the moment ends,
   * not how it arrives.
   */
  durationMs: number;
  onDone: () => void;
  /** Bands and centred content. Drawn over the backdrop, under the skip control. */
  children: ReactNode;
}

/**
 * The lifecycle every full-screen brand moment shares: it covers the app,
 * darkens, lets someone leave early, and leaves on its own.
 *
 * Two screens do this -- the workout-saved takeover and the sign-in
 * greeting -- and what they share is not the choreography (one wipes a
 * band up from a button, the other settles a pair in) but everything
 * around it. That includes the part worth not writing twice: `onDone` is
 * consumed by callers who navigate or unmount on it, so firing it twice is
 * a real bug, and both the timer and the skip control can fire it.
 *
 * In a Modal because "takeover" has to mean the whole screen. As a plain
 * absolute layer this sits inside the navigator's content area, leaving the
 * header lit above it and the floating tab bar below it, which reads as a
 * panel over a page rather than the app handing the moment over.
 */
export function BrandMoment({ durationMs, onDone, children }: BrandMomentProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [backdrop] = useState(() => new Animated.Value(0));
  const [skip] = useState(() => new Animated.Value(0));
  const [exit] = useState(() => new Animated.Value(1));

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards the one thing that must happen exactly once. Skip fires it, and
  // so does the timer -- pressing skip in the same frame the hold expires
  // would otherwise run two exit animations and call onDone twice.
  const leavingRef = useRef(false);

  const leave = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    Animated.timing(exit, { toValue: 0, duration: EXIT_MS, useNativeDriver: true }).start(() => onDone());
  }, [exit, onDone]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdrop, {
        toValue: 1,
        duration: BACKDROP_FADE_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(skip, {
        toValue: 1,
        duration: SKIP_FADE_MS,
        delay: SKIP_DELAY_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    timeoutRef.current = setTimeout(leave, durationMs);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [backdrop, skip, leave, durationMs]);

  return (
    <Modal visible transparent statusBarTranslucent animationType="none" onRequestClose={() => {}}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: exit, alignItems: 'center', justifyContent: 'center' }]}
      >
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: BACKDROP, opacity: backdrop }]}
        />

        {children}

        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
          <DriftingIconField width={width} height={height} spanMs={durationMs} />
        </View>

        {/* Fades in rather than appearing at once: during the entrance
            there is nothing yet to skip past, and a control that arrives
            before the thing it dismisses reads as an error message. Hit
            slop well past its own box because it is small text on a screen
            that is about to leave on its own anyway. */}
        <Animated.View
          style={{ position: 'absolute', top: insets.top + 8, right: 12, opacity: skip }}
        >
          <Pressable
            onPress={leave}
            hitSlop={16}
            accessibilityRole="button"
            accessibilityLabel="Skip"
            style={({ pressed }) => ({
              paddingHorizontal: 14,
              paddingVertical: 8,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '600' }}>Skip</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
