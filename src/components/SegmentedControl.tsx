import type { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { GradientPill } from './GradientPill';

interface SegmentedControlProps<T extends string> {
  options: { label: string; value: T; icon?: keyof typeof Ionicons.glyphMap }[];
  value: T;
  onChange: (value: T) => void;
  /** Passed straight to the pills; see GradientPill. */
  tone?: 'gradient' | 'ink';
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  tone = 'gradient',
}: SegmentedControlProps<T>) {
  const { spacing } = useTheme();

  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {options.map((option) => (
        <GradientPill
          key={option.value}
          label={option.label}
          icon={option.icon}
          active={option.value === value}
          onPress={() => onChange(option.value)}
          tone={tone}
          flex
        />
      ))}
    </View>
  );
}
