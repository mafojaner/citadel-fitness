import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { IconWell } from './IconWell';
import { useTheme } from '../theme/useTheme';

interface DisclosureProps {
  label: string;
  /** Shown under the label while closed, for what is inside without opening it. */
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** The glyph's ink. Gives the row the same weight as a card head. */
  tint?: string;
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
export function Disclosure({
  label,
  hint,
  icon,
  tint,
  children,
}: DisclosureProps) {
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
    /* Header and contents in one bordered shape, not two stacked ones.
       Open, the header sat as its own rounded row with a gap under it and
       the panel floating below -- so the control and the thing it had just
       revealed read as two unrelated objects, and the one that looked most
       like a card was the one with nothing in it. One border round both,
       and a rule where they meet, makes it a card with a head. */
    <View
      style={{
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        // Clips the header's press fill to the rounded corners, which it
        // would otherwise square off now that the radius lives out here.
        overflow: 'hidden',
      }}
    >
      {/* The same object a card head is, at row height: the glyph carries
          the colour, the label is ink, and the row has a fill of its own so
          the eye lands on it. An earlier version was drawn as quietly as
          possible so as not to compete with the session above it, and
          overshot -- two of the screen's three controls were the two
          hardest things on it to see. */}
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={hint ? `${label}. ${hint}` : label}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.md,
          backgroundColor: pressed ? colors.border : colors.background,
        })}
      >
        {icon ? <IconWell icon={icon} size={34} tint={tint} /> : null}
        <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]}>
            {label}
          </Text>
          {hint ? (
            <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
              {hint}
            </Text>
          ) : null}
        </View>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
        </Animated.View>
      </Pressable>

      {open ? (
        <View
          style={{
            gap: spacing.md,
            padding: spacing.md,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          }}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}
