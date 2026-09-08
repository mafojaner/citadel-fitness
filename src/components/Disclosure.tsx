import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface DisclosureProps {
  label: string;
  /** Shown beside the label while closed, for what is inside without opening it. */
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
}

const TURN_MS = 200;

/**
 * A labelled row that opens to reveal what is under it.
 *
 * Exists because the programme screen had one card carrying seven things at
 * once -- the session, its exercises, the cycle jump, a goal shortcut, an
 * explanation and a leave button -- with no ranking between them. The
 * session is what someone opens the screen for every time; the rest is what
 * they need occasionally, and occasional things earn a line rather than a
 * permanent block.
 *
 * The chevron turns rather than swapping icon, and only the chevron
 * animates: content that grows by measured height needs a layout animation,
 * which is the one thing the app's motion rule (transform and opacity, on
 * the compositor) cannot express. Mounting the children outright and
 * turning the arrow is honest about that rather than half-animating it.
 */
export function Disclosure({ label, hint, icon, children }: DisclosureProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const [open, setOpen] = useState(false);
  const [turn] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(turn, {
      toValue: open ? 1 : 0,
      duration: TURN_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, turn]);

  const rotate = turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View style={{ gap: open ? spacing.md : 0 }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={hint ? `${label}. ${hint}` : label}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: pressed ? colors.border : 'transparent',
        })}
      >
        {icon ? <Ionicons name={icon} size={16} color={colors.textMuted} /> : null}
        <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]}>
          {label}
        </Text>
        {hint ? (
          <Text style={[typography.caption, { color: colors.textMuted, flex: 1, minWidth: 0 }]} numberOfLines={1}>
            {hint}
          </Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        </Animated.View>
      </Pressable>

      {open ? <View style={{ gap: spacing.md }}>{children}</View> : null}
    </View>
  );
}
