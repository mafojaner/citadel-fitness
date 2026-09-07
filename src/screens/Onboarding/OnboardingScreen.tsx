import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BACKDROP, DriftingIconField, GradientBand, bandSize } from '../../components/BrandBackdrop';
import { ErrorNotice } from '../../components/ErrorNotice';
import { FadeInView } from '../../components/FadeInView';
import { GradientButton } from '../../components/GradientButton';
import { trackEvent } from '../../lib/telemetry';
import { useAuthStore } from '../../state/authStore';
import { useProfileStore } from '../../state/profileStore';
import { motion } from '../../theme/motion';
import { darkColors, layout, spacing } from '../../theme/tokens';

type SlideIcon =
  | { family: 'ionicon'; name: keyof typeof Ionicons.glyphMap }
  | { family: 'material-community'; name: keyof typeof MaterialCommunityIcons.glyphMap };

interface Slide {
  icon: SlideIcon;
  title: string;
  description: string;
  /**
   * Where the two bands sit while this slide is up, as fractions of the
   * screen. Advancing re-poses them, which is what gives moving through
   * the intro something to move.
   */
  bandA: { x: number; y: number };
  bandB: { x: number; y: number };
}

const SLIDES: Slide[] = [
  {
    icon: { family: 'ionicon', name: 'barbell' },
    title: 'Welcome to Citadel Fitness',
    description: 'Log every set, rep, and rest day in seconds, and build a training history you can actually see.',
    bandA: { x: 0.25, y: -0.42 },
    bandB: { x: -0.25, y: 0.44 },
  },
  {
    icon: { family: 'ionicon', name: 'book' },
    title: 'A complete exercise catalogue',
    description: 'Dozens of exercises across every muscle group, each with a tap-to-open guide when you need it.',
    bandA: { x: -0.28, y: -0.46 },
    bandB: { x: 0.24, y: 0.4 },
  },
  {
    icon: { family: 'ionicon', name: 'trending-up' },
    title: 'See your progress',
    description: 'Streaks, volume, and activity trends update automatically every time you log a workout.',
    bandA: { x: 0.2, y: -0.4 },
    bandB: { x: -0.3, y: 0.48 },
  },
  {
    icon: { family: 'material-community', name: 'chess-rook' },
    title: 'Fortress and Valhalla are coming',
    description:
      'Two paid plans are on the way: Fortress for deeper analysis of your training, Valhalla for coaching from a real person on top. Join the waitlist to be first in line.',
    bandA: { x: -0.22, y: -0.44 },
    bandB: { x: 0.28, y: 0.42 },
  },
];

const BAND_ROTATION = '-26deg';
const ENTER_MS = 620;
const REPOSE_MS = 520;
/**
 * How long the drifting field is told to fill.
 *
 * Unlike the takeover, this screen has no deadline -- someone can sit on a
 * slide as long as they like -- so the span is a slide's worth of unhurried
 * reading rather than a known duration, and each slide starts a fresh
 * batch. Without that the field runs out partway through slide one and the
 * rest of the intro is a still image.
 */
const DRIFT_SPAN_MS = 5200;

export function OnboardingScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore((s) => s.session?.user.id);
  const savePreferences = useProfileStore((s) => s.savePreferences);
  const [index, setIndex] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];
  const band = bandSize(width, height);

  // One value per band, moved to the current slide's pose. ValueXY rather
  // than four separate values so a pose is one `toValue` and the pair can
  // never end up half-moved between two slides.
  const [bandAPos] = useState(
    () => new Animated.ValueXY({ x: -width, y: SLIDES[0].bandA.y * height - height })
  );
  const [bandBPos] = useState(
    () => new Animated.ValueXY({ x: width, y: SLIDES[0].bandB.y * height + height })
  );

  useEffect(() => {
    const target = SLIDES[index];
    // Quintic-out, the same curve the takeover settles its band on, so the
    // two screens move alike as well as look alike.
    const settle = Easing.out(Easing.poly(5));
    Animated.parallel([
      Animated.timing(bandAPos, {
        toValue: { x: target.bandA.x * width, y: target.bandA.y * height },
        duration: index === 0 ? ENTER_MS : REPOSE_MS,
        easing: settle,
        useNativeDriver: true,
      }),
      Animated.timing(bandBPos, {
        toValue: { x: target.bandB.x * width, y: target.bandB.y * height },
        duration: index === 0 ? ENTER_MS : REPOSE_MS,
        easing: settle,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, bandAPos, bandBPos, width, height]);

  const finish = async () => {
    if (!userId) return;
    setFinishing(true);
    setError(null);
    try {
      await savePreferences(userId, { hasSeenOnboarding: true });
      // After the save, not before: a failure here leaves onboarding
      // unfinished, and reporting it as completed would overstate the
      // funnel exactly where it matters most.
      trackEvent({ name: 'onboarding_completed' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.');
      setFinishing(false);
    }
  };

  return (
    // Dark in both themes, like the workout-saved takeover it borrows its
    // vocabulary from. That is the inverted-slab argument again, and it
    // survives here for the reason it didn't there: a slab is a panel with
    // a page visible around it, and this is the whole screen with no page
    // to contrast against. It is also the only screen in the app someone
    // sees exactly once.
    <View style={{ flex: 1, backgroundColor: BACKDROP }}>
      {/* Centred, because a band's pose is expressed as an offset from the
          middle of the screen -- the same frame the takeover states its in.
          Without this the absolute positioning anchors at the top left and
          every pose lands a third of a screen higher than it reads, which
          is how the first draft put a band straight through the headline. */}
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
      >
        <GradientBand
          width={band.width}
          height={band.height}
          style={{ transform: [...bandAPos.getTranslateTransform(), { rotate: BAND_ROTATION }] }}
        />
        <GradientBand
          width={band.width}
          height={band.height}
          style={{ transform: [...bandBPos.getTranslateTransform(), { rotate: BAND_ROTATION }] }}
        />
      </View>

      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
        <DriftingIconField width={width} height={height} spanMs={DRIFT_SPAN_MS} generation={index} />
      </View>

      {/* A band is a wide shape rotated 26 degrees, so its vertical
          footprint is most of a screen however far out its pose is placed
          -- and unlike the takeover, which centres one short headline, this
          has an icon, a title and up to four lines of description to keep
          readable. Hand-tuning poses per slide only works until a longer
          string or a shorter phone, so the copy gets its own ground
          instead: opaque where the words are, gone by the edges, which
          leaves the bands doing what they are there for at top and bottom.
          Alpha on the backdrop's own colour rather than a second near-black
          picked to match it. */}
      <LinearGradient
        pointerEvents="none"
        colors={[`${BACKDROP}00`, `${BACKDROP}D6`, `${BACKDROP}D6`, `${BACKDROP}00`]}
        locations={[0, 0.34, 0.68, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <View style={{ alignItems: 'flex-end', padding: spacing.lg }}>
          <Pressable
            onPress={finish}
            disabled={finishing}
            hitSlop={16}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            accessibilityState={{ disabled: finishing }}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '600' }}>Skip</Text>
          </Pressable>
        </View>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
          <FadeInView
            key={index}
            duration={motion.duration.base}
            slideDistance={16}
            style={{ alignItems: 'center', gap: spacing.lg, width: '100%', maxWidth: layout.formMaxWidth }}
          >
            {/* A plain white glyph rather than the gradient disc this used
                to draw. The bands behind it are already the colour on this
                screen, and a vivid disc in front of them was two things
                competing to be looked at first. */}
            {slide.icon.family === 'ionicon' ? (
              <Ionicons name={slide.icon.name} size={52} color={darkColors.textPrimary} />
            ) : (
              <MaterialCommunityIcons name={slide.icon.name} size={52} color={darkColors.textPrimary} />
            )}

            <Text
              style={{
                color: darkColors.textPrimary,
                fontSize: 30,
                fontWeight: '800',
                letterSpacing: 0.2,
                textAlign: 'center',
              }}
            >
              {slide.title}
            </Text>
            <Text
              style={{
                color: darkColors.textSecondary,
                fontSize: 16,
                lineHeight: 24,
                textAlign: 'center',
              }}
            >
              {slide.description}
            </Text>
          </FadeInView>
        </View>

        <View style={{ padding: spacing.lg, gap: spacing.md, alignItems: 'center' }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              gap: spacing.xs,
              width: '100%',
              maxWidth: layout.formMaxWidth,
            }}
          >
            {SLIDES.map((s, i) => (
              <View
                key={s.title}
                style={{
                  width: i === index ? 20 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i === index ? darkColors.textPrimary : 'rgba(255,255,255,0.3)',
                }}
              />
            ))}
          </View>

          <View style={{ width: '100%', maxWidth: layout.formMaxWidth, gap: spacing.md }}>
            {error ? <ErrorNotice message={error} onRetry={finish} /> : null}

            <GradientButton
              label={isLast ? "Let's go" : 'Next'}
              loading={finishing}
              onDark
              onPress={() => (isLast ? finish() : setIndex((i) => i + 1))}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
