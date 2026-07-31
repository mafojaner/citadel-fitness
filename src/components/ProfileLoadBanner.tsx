import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { FadeInView } from './FadeInView';
import { useAuthStore } from '../state/authStore';
import { useProfileStore } from '../state/profileStore';
import { useTheme } from '../theme/useTheme';

/**
 * Shown on every screen while the profile failed to load.
 *
 * Preferences drive the unit labels on every weight and distance in the
 * app, so falling back to defaults silently means a kg user reads lb. The
 * banner says so plainly rather than letting the wrong number stand.
 */
export function ProfileLoadBanner() {
  const { colors, spacing, radius, typography } = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);
  const error = useProfileStore((s) => s.error);
  const loading = useProfileStore((s) => s.loading);
  const load = useProfileStore((s) => s.load);

  if (!error) return null;

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
          Couldn&apos;t load your settings — units may be shown incorrectly.
        </Text>
        <AnimatedPressable
          onPress={() => userId && load(userId)}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Retry loading your settings"
          hitSlop={8}
          scaleTo={0.92}
        >
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
            {loading ? 'Retrying…' : 'Retry'}
          </Text>
        </AnimatedPressable>
      </View>
    </FadeInView>
  );
}
