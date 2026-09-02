import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { useTheme } from '../theme/useTheme';

interface InfoNoteProps {
  text: string;
  label?: string;
}

/**
 * A tap-to-reveal explanation for a rule that's otherwise invisible in the
 * UI (e.g. "this always logs today"). Same interaction as HelpScreen's FAQ
 * accordion, compacted to a single inline icon trigger rather than a
 * full-width row, so it can sit next to a label instead of owning its own
 * line.
 *
 * The revealed paragraph is a sibling of the icon, which means it takes the
 * width of whatever contains the trigger. That is right in a full-width
 * block and wrong in a narrow one: given a fixed 46px column the text lays
 * out at its intrinsic width and spills sideways across everything to its
 * right, which is exactly what it did in the RPE header. Where the trigger
 * has to live somewhere narrow, use InfoNoteTrigger and InfoNoteText as two
 * pieces and put the text somewhere that has room for it.
 */
export function InfoNote({ text, label = 'More info' }: InfoNoteProps) {
  const { spacing } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ gap: spacing.xs }}>
      <InfoNoteTrigger open={open} onPress={() => setOpen((v) => !v)} label={label} />
      {open ? <InfoNoteText text={text} /> : null}
    </View>
  );
}

interface InfoNoteTriggerProps {
  open: boolean;
  onPress: () => void;
  label?: string;
  /** Rendered before the icon, as part of the same tap target. */
  children?: ReactNode;
}

/**
 * The icon on its own, for callers that place the text themselves.
 *
 * `children` share the tap target rather than sitting beside it, so a column
 * heading can be the thing you press. An 18px icon next to a word is a tap
 * target smaller than a fingertip; the whole label is not.
 */
export function InfoNoteTrigger({
  open,
  onPress,
  label = 'More info',
  children,
}: InfoNoteTriggerProps) {
  const { colors } = useTheme();

  return (
    <AnimatedPressable
      onPress={onPress}
      scaleTo={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded: open }}
      hitSlop={8}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
    >
      {children}
      <Ionicons
        name={open ? 'information-circle' : 'information-circle-outline'}
        size={15}
        color={open ? colors.primary : colors.textMuted}
      />
    </AnimatedPressable>
  );
}

/** The revealed paragraph on its own. Needs the width of a block, not a cell. */
export function InfoNoteText({ text }: { text: string }) {
  const { colors, typography } = useTheme();
  return <Text style={[typography.caption, { color: colors.textSecondary }]}>{text}</Text>;
}
