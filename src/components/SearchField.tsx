import { TextInput, View } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface SearchFieldProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  /** 'compact' fits the header row; 'large' is for a field standing on its own in page content. */
  size?: 'compact' | 'large';
  autoFocus?: boolean;
}

/**
 * The app's one search-field look — a pill matching FloatingTabBar's
 * material (surface fill + navBorder + full pill radius) — shared by the
 * header search bar and any in-page search fields so they all read as the
 * same control rather than each screen inventing its own.
 *
 * Followed the tab bar off frosted glass deliberately. This is the other
 * half of "the same material", so leaving it blurred would have quietly
 * made that comment false. It also carried the same repaint bug in its
 * worse form: the tab bar at least remounted on a theme change, and this
 * only ever updated the `tint` prop that does not reliably repaint.
 */
export function SearchField({
  placeholder = 'Search...',
  value,
  onChangeText,
  size = 'compact',
  autoFocus,
}: SearchFieldProps) {
  const { colors, spacing, radius, scheme } = useTheme();
  const isLarge = size === 'large';

  return (
    <View
      style={{
        borderRadius: radius.pill,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.navBorder,
        backgroundColor: colors.surface,
        shadowColor: '#000',
        shadowOpacity: scheme === 'dark' ? 0.35 : 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      }}
    >
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          autoFocus={autoFocus}
          style={{
            paddingVertical: isLarge ? 14 : 7,
            paddingHorizontal: isLarge ? spacing.lg : spacing.md,
            color: colors.textPrimary,
            fontSize: isLarge ? 16 : 14,
          }}
        />
    </View>
  );
}
