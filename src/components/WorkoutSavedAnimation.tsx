import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { gradients } from '../theme/tokens';

interface WorkoutSavedAnimationProps {
  onDone: () => void;
  /**
   * Optional line under the badge. Used when the save went to the offline
   * queue rather than the server: the workout is recorded either way, but
   * saying so is the difference between "done" and "done, and it will
   * upload itself".
   */
  caption?: string;
}

interface ConfettiPiece {
  color: string;
  shape: 'rect' | 'dot';
  size: number;
  dx: number;
  dyBurst: number;
  dyFall: number;
  spin: number;
}

const PIECE_COUNT = 26;
const PIECE_COLORS = ['#FF5A36', '#FF3D81', '#FFC837', '#2FB380', '#8B5CF6'];
const HOLD_MS = 1050;
const FADE_OUT_MS = 250;
const SCRIM_OPACITY = 0.55;

function generateConfetti(): ConfettiPiece[] {
  return Array.from({ length: PIECE_COUNT }, (_, i) => {
    const angle = (i / PIECE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const distance = 70 + Math.random() * 60;
    return {
      color: PIECE_COLORS[i % PIECE_COLORS.length],
      shape: Math.random() < 0.6 ? 'rect' : 'dot',
      size: 5 + Math.random() * 5,
      dx: Math.cos(angle) * distance,
      // Burst outward first, then extra downward drift for a "burst, then
      // fall" arc instead of a flat radial spray — reads more like real
      // confetti settling under gravity.
      dyBurst: Math.sin(angle) * distance * 0.6,
      dyFall: 60 + Math.random() * 70,
      spin: 360 * (2 + Math.random() * 3) * (Math.random() < 0.5 ? -1 : 1),
    };
  });
}

/**
 * Replaces react-native-confetti-cannon, which rendered 120 individually
 * physics-simulated particles — visibly janky on web, where none of that
 * runs on a compositor thread. This is ~26 views animating only transform
 * and opacity (both native-driver-safe), so it stays smooth everywhere.
 */
export function WorkoutSavedAnimation({ onDone, caption }: WorkoutSavedAnimationProps) {
  const [badgeProgress] = useState(() => new Animated.Value(0));
  const [confetti] = useState(() => new Animated.Value(0));
  const [scrim] = useState(() => new Animated.Value(0));
  // Lazy initializer: React calls this exactly once per mount and caches
  // the result, which is the documented escape hatch for one-time
  // non-deterministic setup — unlike useMemo, it isn't expected to be a
  // pure function of its inputs on every render.
  const [pieces] = useState(generateConfetti);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scrim, {
        toValue: SCRIM_OPACITY,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.parallel([
        // The "breathe in" — a slow expand past its resting size and back,
        // like an inhale, rather than a snappy elastic bounce.
        Animated.sequence([
          Animated.timing(badgeProgress, {
            toValue: 1.08,
            duration: 480,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(badgeProgress, {
            toValue: 1,
            duration: 260,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(confetti, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const timeout = setTimeout(() => {
      Animated.timing(scrim, { toValue: 0, duration: FADE_OUT_MS, useNativeDriver: true }).start(onDone);
    }, HOLD_MS);
    return () => clearTimeout(timeout);
  }, [badgeProgress, confetti, scrim, onDone]);

  const badgeOpacity = badgeProgress.interpolate({
    inputRange: [0, 1.08],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      {/* Its own opacity layer, separate from the badge/confetti below —
          otherwise animating this to darken the background would also fade
          out the celebration content sitting on top of it. */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#0B0E14', opacity: scrim }]} />

      {pieces.map((piece, i) => {
        const translateX = confetti.interpolate({ inputRange: [0, 1], outputRange: [0, piece.dx] });
        const translateY = confetti.interpolate({
          inputRange: [0, 0.4, 1],
          outputRange: [0, piece.dyBurst, piece.dyBurst + piece.dyFall],
        });
        const rotate = confetti.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${piece.spin}deg`] });
        const opacity = confetti.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              width: piece.size,
              height: piece.shape === 'rect' ? piece.size * 0.55 : piece.size,
              borderRadius: piece.shape === 'rect' ? 1.5 : piece.size / 2,
              backgroundColor: piece.color,
              opacity,
              transform: [{ translateX }, { translateY }, { rotate }],
            }}
          />
        );
      })}

      <Animated.View
        style={{ opacity: badgeOpacity, transform: [{ scale: badgeProgress }] }}
      >
        <LinearGradient
          colors={gradients.flame}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: gradients.flame[0],
            shadowOpacity: 0.5,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
          }}
        >
          <Ionicons name="checkmark" size={52} color="#FFFFFF" />
        </LinearGradient>
      </Animated.View>

      {caption ? (
        <Animated.Text
          style={{
            marginTop: 20,
            color: '#FFFFFF',
            fontSize: 14,
            textAlign: 'center',
            paddingHorizontal: 32,
            opacity: scrim,
          }}
        >
          {caption}
        </Animated.Text>
      ) : null}
    </View>
  );
}
