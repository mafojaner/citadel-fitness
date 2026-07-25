import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface ErrorNoticeProps {
  message: string;
  onRetry?: () => void;
}

/**
 * Shown when a fetch fails, so a load error is never mistaken for an
 * empty state (e.g. "no workouts logged yet").
 */
export function ErrorNotice({ message, onRetry }: ErrorNoticeProps) {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.danger,
        backgroundColor: colors.surface,
      }}
    >
      <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
      <Text style={[typography.caption, { color: colors.danger, flex: 1, minWidth: 0 }]}>
        {message}
      </Text>
      {onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry loading">
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
            Retry
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
