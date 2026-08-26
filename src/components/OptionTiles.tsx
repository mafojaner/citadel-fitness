import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';

export interface OptionTile<T extends string> {
  label: string;
  value: T;
  icon: keyof typeof Ionicons.glyphMap;
}

/**
 * A row of large pick-one tiles, each an icon above its label.
 *
 * The taller cousin of SegmentedControl, for a choice worth showing rather
 * than compressing. A theme picker is the case it was built for: the options
 * differ in how the app *looks*, so an icon carries real meaning there in a
 * way it would not on, say, kg versus lb.
 *
 * Selection is a filled tile with a brighter border rather than a colour.
 * The account centre is monochrome, and this is the one control on it big
 * enough that an accent fill would dominate the pane.
 */
export function OptionTiles<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly OptionTile<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors, spacing, radius, typography, scheme } = useTheme();

  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            style={(state) => {
              const hovered = (state as { hovered?: boolean }).hovered ?? false;
              return {
                // flexBasis 0 alongside flex 1 so the tiles are equal rather
                // than sized by their labels: "System" is twice the width of
                // "Dark", and without this the row would come out lopsided.
                flex: 1,
                flexBasis: 0,
                minWidth: 0,
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.sm,
                paddingVertical: spacing.lg,
                paddingHorizontal: spacing.sm,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: selected ? colors.textMuted : colors.border,
                backgroundColor: selected
                  ? colors.border
                  : hovered
                    ? scheme === 'dark'
                      ? colors.surface
                      : colors.background
                    : 'transparent',
              };
            }}
          >
            <Ionicons name={option.icon} size={22} color={colors.textPrimary} />
            <Text
              style={[typography.body, { color: colors.textPrimary, fontWeight: selected ? '700' : '500' }]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
