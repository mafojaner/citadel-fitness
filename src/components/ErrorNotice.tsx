import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { FadeInView } from './FadeInView';
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
    <FadeInView duration={150} slideDistance={0}>
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
          <AnimatedPressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry loading" scaleTo={0.92}>
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
              Retry
            </Text>
          </AnimatedPressable>
        ) : null}
      </View>
    </FadeInView>
  );
}
