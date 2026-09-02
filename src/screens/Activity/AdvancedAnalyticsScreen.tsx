import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { ErrorNotice } from '../../components/ErrorNotice';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { GradientPill } from '../../components/GradientPill';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Sparkline } from '../../components/Sparkline';
import { StatChip } from '../../components/StatChip';
import {
  CATEGORY_GRADIENTS,
  DEFAULT_CATEGORY_GRADIENT,
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_ICON,
} from '../../constants/categories';
import { useAdvancedAnalytics } from '../../hooks/useAdvancedAnalytics';
import { useProfileStore } from '../../state/profileStore';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { ActivityStackParamList } from '../../navigation/stacks/ActivityStack';

const PERIODS: { label: string; days: number | null }[] = [
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: 'All time', days: null },
];

/**
 * The two questions the free Activity screen can't answer: where the work is
 * actually going, and whether the lifts are moving. Volume alone answers
 * neither — it rises just as well by adding easy sets to what you already do.
 */
export function AdvancedAnalyticsScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ActivityStackParamList>>();
  const weightUnit = useProfileStore((s) => s.preferences.units);
  const [periodIndex, setPeriodIndex] = useState(0);
  const period = PERIODS[periodIndex];
  const { balance, progressions, totalSets, activeDays, loading, error, reload } =
    useAdvancedAnalytics(period.days);

  const empty = !loading && !error && balance.length === 0;

  return (
    <ScreenContainer>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {PERIODS.map((p, i) => (
          <GradientPill
            key={p.label}
            label={p.label}
            active={i === periodIndex}
            onPress={() => setPeriodIndex(i)}
            flex
          />
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : error ? (
        <ErrorNotice message={error} onRetry={reload} />
      ) : empty ? (
        <EmptyState
          icon="trending-up"
          colors={gradients.volume}
          title="Nothing logged in this period"
          detail="Try a longer range, or log a workout and come back."
        />
      ) : (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            <StatChip icon="calendar-outline" value={`${activeDays} active day${activeDays === 1 ? '' : 's'}`} />
            <StatChip icon="layers-outline" value={`${totalSets} set${totalSets === 1 ? '' : 's'}`} />
          </View>

          <Card title="Muscle group balance">
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Share of work per group. Strength counts volume; cardio counts minutes, so a
              running week doesn&apos;t read as an empty one.
            </Text>
            {balance.map((entry) => (
              <View key={entry.category} style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <GradientIconBadge
                    icon={CATEGORY_ICONS[entry.category] ?? DEFAULT_CATEGORY_ICON}
                    colors={CATEGORY_GRADIENTS[entry.category] ?? DEFAULT_CATEGORY_GRADIENT}
                    size={26}
                  />
                  <Text style={[typography.body, { color: colors.textPrimary, flex: 1, minWidth: 0 }]}>
                    {entry.category[0].toUpperCase() + entry.category.slice(1)}
                  </Text>
                  <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]}>
                    {Math.round(entry.share * 100)}%
                  </Text>
                </View>
                <View
                  style={{
                    height: 8,
                    borderRadius: radius.pill,
                    backgroundColor: colors.background,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      width: `${Math.max(entry.share * 100, 1)}%`,
                      height: '100%',
                      borderRadius: radius.pill,
                      backgroundColor:
                        (CATEGORY_GRADIENTS[entry.category] ?? DEFAULT_CATEGORY_GRADIENT)[1],
                    }}
                  />
                </View>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {entry.sets} set{entry.sets === 1 ? '' : 's'}
                </Text>
              </View>
            ))}
          </Card>

          <Card title="Strength progression">
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Estimated one-rep max, first to latest session in this period. Lifts logged on
              only one day are left out, since there&apos;s no trend in a single point.
            </Text>
            {progressions.length === 0 ? (
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                No lift has two separate days in this period yet.
              </Text>
            ) : (
              progressions.map((p) => {
                const up = p.changePct > 0;
                const flat = p.changePct === 0;
                const tint = flat ? colors.textMuted : up ? colors.success : colors.danger;
                return (
                  <AnimatedPressable
                    key={p.exerciseId}
                    onPress={() =>
                      navigation.navigate('LiftDetail', {
                        exerciseId: p.exerciseId,
                        exerciseName: p.exerciseName,
                      })
                    }
                    scaleTo={0.99}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.exerciseName}, ${p.changePct} percent. Opens this lift's record, goal and progression.`}
                  >
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[typography.body, { color: colors.textPrimary }]} numberOfLines={1}>
                        {p.exerciseName}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textMuted }]}>
                        {p.first} → {p.latest} {weightUnit} · {p.points.length} sessions
                      </Text>
                    </View>
                    {/* The middle of the series, which was already being
                        computed and then reduced to its two ends. A steady
                        climb and a lift that spiked early then slid produce
                        the same first, latest and percentage; only the shape
                        tells them apart. */}
                    <Sparkline
                      values={p.points.map((point) => point.estimatedOneRepMax)}
                      color={tint}
                      accessibilityLabel={`${p.exerciseName} across ${p.points.length} sessions, ${p.first} to ${p.latest} ${weightUnit}`}
                    />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <Ionicons
                        name={flat ? 'remove' : up ? 'arrow-up' : 'arrow-down'}
                        size={14}
                        color={tint}
                      />
                      <Text style={{ color: tint, fontWeight: '700' }}>
                        {Math.abs(p.changePct)}%
                      </Text>
                    </View>
                  </View>
                  </AnimatedPressable>
                );
              })
            )}
          </Card>
        </>
      )}
    </ScreenContainer>
  );
}
