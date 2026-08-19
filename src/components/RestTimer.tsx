import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { formatDuration } from '../lib/units';
import { useTheme } from '../theme/useTheme';

interface RestTimerProps {
  /** Starting duration in seconds. */
  seconds: number;
  onChangeSeconds: (seconds: number) => void;
}

const ADJUST_STEP = 15;
const MIN_SECONDS = 15;
const MAX_SECONDS = 600;

/**
 * A rest countdown for between sets.
 *
 * Deliberately not persisted anywhere. A timer that survives leaving the
 * screen would keep counting through a workout you've finished and a phone
 * you've pocketed, and the only honest thing it could do on return is show
 * a number nobody was watching. Rest is a live prompt, not a record.
 *
 * setInterval rather than an animation: this ticks once a second for a
 * couple of minutes, so the cost is irrelevant and a real interval keeps
 * working when the JS thread is busy laying out set rows.
 */
export function RestTimer({ seconds, onChangeSeconds }: RestTimerProps) {
  const { colors, spacing, radius, typography } = useTheme();
  // Three phases rather than a running flag plus a synced countdown. While
  // idle the display simply *is* the configured duration, so adjusting it
  // needs no effect to copy the new value across — which is both simpler and
  // what this project's lint rules require of state that mirrors a prop.
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const running = phase === 'running';

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          setPhase('done');
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const done = phase === 'done';
  const displayed = phase === 'idle' ? seconds : remaining;
  const adjust = (delta: number) =>
    onChangeSeconds(Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, seconds + delta)));

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.sm,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: done ? colors.success : colors.border,
        backgroundColor: colors.surface,
      }}
    >
      <Ionicons name="timer-outline" size={18} color={done ? colors.success : colors.textMuted} />

      <Text
        style={[
          typography.subheading,
          { color: done ? colors.success : colors.textPrimary, minWidth: 62 },
        ]}
        accessibilityLiveRegion="polite"
      >
        {done ? 'Rest done' : formatDuration(displayed)}
      </Text>

      <View style={{ flex: 1 }} />

      {!running ? (
        <>
          <Pressable
            onPress={() => adjust(-ADJUST_STEP)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`Decrease rest by ${ADJUST_STEP} seconds`}
          >
            <Ionicons name="remove-circle-outline" size={22} color={colors.textMuted} />
          </Pressable>
          <Pressable
            onPress={() => adjust(ADJUST_STEP)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`Increase rest by ${ADJUST_STEP} seconds`}
          >
            <Ionicons name="add-circle-outline" size={22} color={colors.textMuted} />
          </Pressable>
        </>
      ) : null}

      <Pressable
        onPress={() => {
          if (running) {
            setPhase('idle');
          } else {
            setRemaining(seconds);
            setPhase('running');
          }
        }}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={running ? 'Stop rest timer' : 'Start rest timer'}
      >
        <Ionicons
          name={running ? 'stop-circle' : 'play-circle'}
          size={28}
          color={colors.primary}
        />
      </Pressable>
    </View>
  );
}
