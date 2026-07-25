import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';

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
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              borderRadius: radius.pill,
              alignItems: 'center',
              backgroundColor: active ? colors.primary : colors.background,
              borderWidth: 1,
              borderColor: active ? colors.primary : colors.border,
            }}
          >
            <Text
              style={[
                typography.body,
                { color: active ? colors.surface : colors.textSecondary, fontWeight: active ? '700' : '400' },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
