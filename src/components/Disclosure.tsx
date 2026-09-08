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
  /**
   * The fill behind the revealed content.
   *
   * `recessed` for a disclosure that already lives inside a card, where a
   * second surface-coloured panel would be white on white; `raised` for one
   * sitting on the page, where the panel is the card.
   */
  contentTone?: 'raised' | 'recessed';
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
  contentTone = 'raised',
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
    <View style={{ gap: open ? spacing.md : 0 }}>
      {/* A surface with a tinted disc, not a hairline outline round some
          muted text. The first version was drawn as quietly as possible so
          it would not compete with the session above it, and overshot --
          two of the screen's three controls were the two hardest things on
          it to see. This is the same object a card head is, at row height:
          the glyph carries the colour, the label is ink, and the row has a
          fill of its own so the eye lands on it. */}
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
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
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

      {/* The contents get a panel of their own rather than spilling loose
          under the header. Open, the old version left its rows floating
          against whatever they happened to sit on, so the boundary of the
          thing you had just opened was wherever its longest line ended.
          The panel is the boundary. */}
      {open ? (
        <View
          style={{
            gap: spacing.md,
            padding: spacing.md,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: contentTone === 'recessed' ? colors.background : colors.surface,
          }}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}
