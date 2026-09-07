import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Easing, Text, View, useWindowDimensions } from 'react-native';
import { BrandMoment, GradientBand, bandSize } from './BrandBackdrop';
import { darkColors, iconInk } from '../theme/tokens';

export interface SavedRecord {
  exerciseName: string;
  weight: number;
  reps: number;
}

interface WorkoutSavedAnimationProps {
  onDone: () => void;
  /**
   * Personal records set by the workout just saved.
   *
   * Setting one is the most motivating thing that happens in this app, and
   * it used to be discoverable only by leaving this screen, opening the
   * records vault and reading dates. This is the moment it happened.
   */
  records?: SavedRecord[];
  /** The unit the weights are already in. */
  weightUnit?: string;
  /**
   * Optional line under the headline. Used when the save went to the
   * offline queue rather than the server: the workout is recorded either
   * way, but saying so is the difference between "done" and "done, and it
   * will upload itself".
   */
  caption?: string;
}

/**
 * The motion is deliberately quicker than the time on screen.
 *
 * These were each roughly half again as long, which spent the first second
 * of a two-second celebration still arriving -- the headline landed about
 * when you were ready to leave. Shortening the travel without shortening
 * the hold buys the same total length with the moving part over sooner, so
 * what you spend the time on is reading the thing rather than watching it
 * assemble. `holdMs` below absorbs the difference exactly, which is why
 * the totals are unchanged at 2050ms, or 3850ms with a record.
 */
const WIPE_MS = 380;
const BAND_B_DELAY_MS = 150;
const BAND_B_MS = 300;
const CONTENT_DELAY_MS = 250;
const CONTENT_MS = 260;
const HOLD_MS = 1670;
/**
 * Longer when there is a record to read.
 *
 * A record needs enough time to actually be read ("New personal record,
 * Bench Press, 70 kg x 5"), not just glimpsed between two motions. Records
 * are rare enough that this is an occasional reward rather than a tax on
 * every save -- and the skip control is there for when it isn't wanted.
 */
const HOLD_WITH_RECORD_MS = 3470;

/**
 * The full-screen takeover shown when a workout saves.
 *
 * Replaced a badge-and-burst overlay on the still-visible form with a wipe
 * that covers the whole screen and a dedicated "Nice work." beat, after a
 * clip of Strava's own completion screen: the button's colour floods the
 * screen, resolves into a settled diagonal band, and a name-brand icon
 * field drifts upward behind the headline while it holds.
 *
 * Two bands rather than one continuously morphing shape — this app has
 * react-native-svg but nothing that animates an SVG path's `d` attribute,
 * and Animated only drives transform and opacity anyway (see
 * WelcomeBackMoment's note on why: it's what keeps this on the compositor
 * thread). Band A starts oversized and centred, covering the screen on its
 * own; it then shrinks and slides to its resting diagonal while Band B
 * slides up from off-screen to complete the pair, together reading as one
 * S-curve at rest without either ever animating anything but scale,
 * translate and opacity.
 */
export function WorkoutSavedAnimation({
  onDone,
  caption,
  records = [],
  weightUnit = 'kg',
}: WorkoutSavedAnimationProps) {
  const { width, height } = useWindowDimensions();
  const hasRecords = records.length > 0;
  const holdMs = hasRecords ? HOLD_WITH_RECORD_MS : HOLD_MS;

  const [wipe] = useState(() => new Animated.Value(0));
  const [bandB] = useState(() => new Animated.Value(0));
  const [content] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // Quintic-out: the same distance covered with more of it spent early,
    // which is what makes the arrival read as quick without the band ever
    // looking like it snapped into place. React Native has no `Easing.quint`
    // the way CSS vocabulary does; the fifth-power curve comes from poly(5).
    //
    // Built here rather than as a module constant, which is what it was
    // first. `Easing.out(f)` returns `t => 1 - f(1 - t)` without ever
    // calling `f`, so an `Easing` that isn't initialised yet at module-eval
    // time produces a closure that looks fine and throws "easing is not a
    // function" later, when the animation actually starts.
    const snap = Easing.out(Easing.poly(5));
    Animated.parallel([
      Animated.timing(wipe, {
        toValue: 1,
        duration: WIPE_MS,
        easing: snap,
        useNativeDriver: true,
      }),
      Animated.timing(bandB, {
        toValue: 1,
        duration: BAND_B_MS,
        delay: BAND_B_DELAY_MS,
        easing: snap,
        useNativeDriver: true,
      }),
      Animated.timing(content, {
        toValue: 1,
        duration: CONTENT_MS,
        delay: CONTENT_DELAY_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [wipe, bandB, content]);

  // Sized well past the screen in both dimensions at rest (before either
  // band moves at all) so that centring either one, unscaled, already
  // covers corner to corner — the "wipe" is this same shape starting
  // smaller and off to the side, not a separately-built cover shape.
  const band = bandSize(width, height);
  const bandRotation = '-26deg';

  const bandAScale = wipe.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0.3, 1.5, 1] });
  const bandATranslateX = wipe.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, 0, width * 0.25] });
  const bandATranslateY = wipe.interpolate({
    inputRange: [0, 0.55, 1],
    outputRange: [0, 0, -height * 0.3],
  });

  const bandBTranslateY = bandB.interpolate({
    inputRange: [0, 1],
    outputRange: [height * 1.4, height * 0.36],
  });

  const contentOpacity = content;
  const contentTranslateY = content.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  return (
    <BrandMoment durationMs={WIPE_MS + holdMs} onDone={onDone}>
      <GradientBand
        width={band.width}
        height={band.height}
        style={{
          transform: [
            { translateX: bandATranslateX },
            { translateY: bandATranslateY },
            { rotate: bandRotation },
            { scale: bandAScale },
          ],
        }}
      />

      <GradientBand
        width={band.width}
        height={band.height}
        style={{
          transform: [
            { translateX: -width * 0.25 },
            { translateY: bandBTranslateY },
            { rotate: bandRotation },
          ],
        }}
      />

      <Animated.View
        pointerEvents="none"
        style={{
          opacity: contentOpacity,
          transform: [{ translateY: contentTranslateY }],
          alignItems: 'center',
          paddingHorizontal: 32,
        }}
      >
        <Ionicons name="barbell-outline" size={40} color={darkColors.textPrimary} style={{ marginBottom: 14 }} />
        <Text style={{ color: darkColors.textPrimary, fontSize: 30, fontWeight: '800', letterSpacing: 0.2 }}>Nice work.</Text>

        {hasRecords ? (
          <View style={{ alignItems: 'center', marginTop: 22, gap: 6 }}>
            <Text style={{ color: iconInk.gold, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 }}>
              {records.length === 1 ? 'NEW PERSONAL RECORD' : `${records.length} NEW PERSONAL RECORDS`}
            </Text>
            {records.slice(0, 3).map((record) => (
              <Text
                key={record.exerciseName}
                style={{ color: darkColors.textPrimary, fontSize: 17, fontWeight: '700', textAlign: 'center' }}
                numberOfLines={1}
              >
                {record.exerciseName} · {record.weight} {weightUnit} × {record.reps}
              </Text>
            ))}
            {/* Capped at three. A session that sets five records is a first
                week, not a milestone, and a wall of them stops reading as an
                achievement. */}
            {records.length > 3 ? (
              <Text style={{ color: darkColors.textSecondary, fontSize: 13 }}>and {records.length - 3} more</Text>
            ) : null}
          </View>
        ) : null}

        {caption ? (
          <Text style={{ marginTop: 20, color: 'rgba(255,255,255,0.75)', fontSize: 14, textAlign: 'center' }}>
            {caption}
          </Text>
        ) : null}
      </Animated.View>
    </BrandMoment>
  );
}
