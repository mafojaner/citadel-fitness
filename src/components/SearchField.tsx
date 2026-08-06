import { BlurView } from 'expo-blur';
import { TextInput, View } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface SearchFieldProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  /** 'compact' fits the header row; 'large' is for a field standing on its own in page content. */
  size?: 'compact' | 'large';
}

/**
 * The app's one search-field look — a frosted-glass pill matching
 * FloatingTabBar's material (BlurView + navBorder + full pill radius) —
 * shared by the header search bar and any in-page search fields so they
 * all read as the same control rather than each screen inventing its own.
 */
export function SearchField({ placeholder = 'Search...', value, onChangeText, size = 'compact' }: SearchFieldProps) {
  const { colors, spacing, radius, scheme } = useTheme();
  const isLarge = size === 'large';

  return (
    <View
      style={{
        borderRadius: radius.pill,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.navBorder,
        shadowColor: '#000',
        shadowOpacity: scheme === 'dark' ? 0.35 : 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
      }}
    >
      <BlurView intensity={80} tint={scheme === 'dark' ? 'dark' : 'light'}>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          style={{
            paddingVertical: isLarge ? 14 : 7,
            paddingHorizontal: isLarge ? spacing.lg : spacing.md,
            color: colors.textPrimary,
            fontSize: isLarge ? 16 : 14,
          }}
        />
      </BlurView>
    </View>
  );
}
