import { View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { GradientPill } from './GradientPill';

interface SegmentedControlProps<T extends string> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { spacing } = useTheme();

  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {options.map((option) => (
        <GradientPill
          key={option.value}
          label={option.label}
          active={option.value === value}
          onPress={() => onChange(option.value)}
          flex
        />
      ))}
    </View>
  );
}
