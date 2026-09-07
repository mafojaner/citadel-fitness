import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, Easing, Image, Text, View, useWindowDimensions } from 'react-native';
import { BrandMoment, GradientBand, bandSize } from './BrandBackdrop';
import { useAuthStore } from '../state/authStore';
import { useProfileStore } from '../state/profileStore';
import { darkColors } from '../theme/tokens';

interface WelcomeBackMomentProps {
  /** Drives the subline. Passed in rather than fetched so this adds no request of its own. */
  streakDays: number;
}

const ENTER_MS = 420;
const CONTENT_DELAY_MS = 220;
const CONTENT_MS = 260;
/**
 * Longer than the workout takeover's 1670ms, because there is a name to
 * read here and a streak line under it, and the whole point of the beat is
 * being addressed rather than processed.
 */
const HOLD_MS = 1900;
const BAND_ROTATION = '-26deg';
const AVATAR = 72;

/**
 * The greeting shown when someone signs back in.
 *
 * This was a small gradient card that dropped in under the header and sat
 * there for three seconds. It read as a notification about the app rather
 * than a moment in it, and once the workout takeover and the first-run
 * intro both spoke the same language -- bands settling on a near-black
 * ground, a headline at 30/800, glyphs drifting up behind it -- a
 * rounded-rectangle toast in the corner was the odd one out.
 *
 * It is now the third of those, and shares their lifecycle wholesale: see
 * BrandMoment for the Modal, the skip control and the leave-exactly-once
 * guard. What is local is the choreography -- both bands travel in from
 * opposite corners rather than one wiping up from a button, since there is
 * no button here for a wipe to come from.
 *
 * Still plays once and leaves, and still nothing about it loops, so it
 * never becomes ambient motion. It costs about two and a half seconds and
 * only on an explicit sign-in: `markJustSignedIn` is called from
 * SignInScreen, not on a restored session, so opening the app to a live
 * session does not replay it.
 */
export function WelcomeBackMoment({ streakDays }: WelcomeBackMomentProps) {
  const { width, height } = useWindowDimensions();
  const name = useProfileStore((s) => s.name);
  const avatarUrl = useProfileStore((s) => s.avatarUrl);
  const clearJustSignedIn = useAuthStore((s) => s.clearJustSignedIn);

  // Read once at mount and drive visibility locally: the store flag is
  // consumed immediately below, and reading it live would unmount this
  // mid-animation the moment it cleared.
  const [shouldShow] = useState(() => useAuthStore.getState().justSignedIn);
  const [gone, setGone] = useState(false);

  const band = bandSize(width, height);
  const [bandAPos] = useState(() => new Animated.ValueXY({ x: -width, y: -height * 1.3 }));
  const [bandBPos] = useState(() => new Animated.ValueXY({ x: width, y: height * 1.36 }));
  const [content] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!shouldShow) return;
    clearJustSignedIn();

    // The same quintic-out the other two settle on, so all three arrive
    // with the same weight. Built here rather than at module scope --
    // `Easing.out(f)` never calls `f`, so an `Easing` not yet initialised
    // at module-eval time yields a closure that throws only once the
    // animation starts.
    const settle = Easing.out(Easing.poly(5));
    Animated.parallel([
      Animated.timing(bandAPos, {
        toValue: { x: width * 0.25, y: -height * 0.3 },
        duration: ENTER_MS,
        easing: settle,
        useNativeDriver: true,
      }),
      Animated.timing(bandBPos, {
        toValue: { x: -width * 0.25, y: height * 0.36 },
        duration: ENTER_MS,
        easing: settle,
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
  }, [shouldShow, clearJustSignedIn, bandAPos, bandBPos, content, width, height]);

  if (!shouldShow || gone) return null;

  const greeting = name ? `Welcome back, ${name.split(' ')[0]}` : 'Welcome back';
  const subline =
    streakDays > 0
      ? `${streakDays} day streak. Keep it going.`
      : "Good to see you. Let's log today's session.";
  const contentTranslateY = content.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  return (
    <BrandMoment durationMs={ENTER_MS + HOLD_MS} onDone={() => setGone(true)}>
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

      <Animated.View
        pointerEvents="none"
        style={{
          opacity: content,
          transform: [{ translateY: contentTranslateY }],
          alignItems: 'center',
          paddingHorizontal: 32,
        }}
      >
        {/* The one place a photo belongs in this vocabulary: the other two
            moments draw a white outline glyph because they are about a
            thing that happened, and this one is about a person. Falls back
            to the glyph when there is no photo rather than to initials,
            which would be the only place in the app drawing those. */}
        <View
          style={{
            width: AVATAR,
            height: AVATAR,
            borderRadius: AVATAR / 2,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.5)',
            marginBottom: 18,
          }}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={{ width: AVATAR, height: AVATAR }} />
          ) : (
            <Ionicons name="flame" size={34} color={darkColors.textPrimary} />
          )}
        </View>

        <Text
          style={{
            color: darkColors.textPrimary,
            fontSize: 30,
            fontWeight: '800',
            letterSpacing: 0.2,
            textAlign: 'center',
          }}
        >
          {greeting}
        </Text>
        <Text
          style={{
            marginTop: 10,
            color: darkColors.textSecondary,
            fontSize: 16,
            lineHeight: 22,
            textAlign: 'center',
          }}
        >
          {subline}
        </Text>
      </Animated.View>
    </BrandMoment>
  );
}
