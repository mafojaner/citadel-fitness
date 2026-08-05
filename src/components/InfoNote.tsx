import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
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
 */
export function InfoNote({ text, label = 'More info' }: InfoNoteProps) {
  const { colors, spacing, typography } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ gap: spacing.xs }}>
      <AnimatedPressable
        onPress={() => setOpen((v) => !v)}
        scaleTo={0.85}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={8}
      >
        <Ionicons
          name={open ? 'information-circle' : 'information-circle-outline'}
          size={18}
          color={open ? colors.primary : colors.textMuted}
        />
      </AnimatedPressable>
      {open ? <Text style={[typography.caption, { color: colors.textSecondary }]}>{text}</Text> : null}
    </View>
  );
}
