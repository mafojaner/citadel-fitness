import { Ionicons } from '@expo/vector-icons';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { Card } from './Card';
import { GradientIconBadge } from './GradientIconBadge';
import { SettingsRow } from './SettingsRow';
import { APP_FEATURES } from '../constants/featureCatalog';
import { useIsFortress } from '../hooks/useIsFortress';
import { useTheme } from '../theme/useTheme';
import type { MainTabsParamList } from '../navigation/MainTabs';

interface FortressFeatureCardProps {
  /** id from APP_FEATURES — title, description, icon and colours all come from there. */
  featureId: string;
  /**
   * 'card' stands on its own among other cards. 'row' belongs inside a
   * SettingsSection, which already draws the surface and border — a Card in
   * there nests one bordered box inside another and gets its shadow clipped
   * by the section's overflow: hidden.
   */
  variant?: 'card' | 'row';
}

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabsParamList>,
  BottomTabNavigationProp<MainTabsParamList>
>;

/**
 * A premium feature shown where it will actually live, before it does
 * anything. Free accounts get a lock and a route to the Fortress page;
 * members get "Coming soon" instead, because telling someone who paid that
 * a feature is locked would be wrong.
 *
 * Copy is pulled from featureCatalog by id rather than passed in, so these
 * placements can't drift from the Fortress page's own list the way the
 * landing page's chips once did.
 */
export function FortressFeatureCard({ featureId, variant = 'card' }: FortressFeatureCardProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const navigation = useNavigation<Nav>();
  const isFortress = useIsFortress();

  const feature = APP_FEATURES.find((f) => f.id === featureId);
  if (!feature) return null;

  const badgeLabel = isFortress ? 'Coming soon' : 'Fortress';
  const openFortress = () =>
    navigation.navigate('Learn', { screen: 'Newsletter', params: { tab: 'fortress' } });

  const badge = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.primaryMuted,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
      }}
    >
      <Ionicons name={isFortress ? 'time-outline' : 'lock-closed'} size={10} color={colors.primary} />
      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>{badgeLabel}</Text>
    </View>
  );

  if (variant === 'row') {
    return (
      <SettingsRow
        icon={feature.icon}
        iconColors={feature.colors}
        title={feature.title}
        subtitle={feature.description}
        onPress={openFortress}
        // Both, because rightElement replaces the row's own chevron and this
        // still navigates somewhere.
        rightElement={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            {badge}
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        }
      />
    );
  }

  return (
    <AnimatedPressable
      onPress={openFortress}
      accessibilityRole="button"
      accessibilityLabel={`${feature.title}. ${
        isFortress ? 'Coming soon to Fortress.' : 'Fortress feature. Select to learn more.'
      }`}
      scaleTo={0.98}
    >
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          {/* Full colour rather than greyed out: this is advertising what the
              feature will be, not showing a disabled control. */}
          <GradientIconBadge icon={feature.icon} colors={feature.colors} size={40} />

          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={[typography.subheading, { color: colors.textPrimary }]} numberOfLines={1}>
                {feature.title}
              </Text>
              {badge}
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {feature.description}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </Card>
    </AnimatedPressable>
  );
}
