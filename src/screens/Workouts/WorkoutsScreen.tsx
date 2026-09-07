import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { FortressTodayCard } from '../../components/FortressTodayCard';
import { PaidFeatureCard } from '../../components/PaidFeatureCard';
import { GradientButton } from '../../components/GradientButton';
import { IconWell } from '../../components/IconWell';
import { HeaderSearchBar } from '../../components/HeaderSearchBar';
import { PendingSyncNotice } from '../../components/PendingSyncNotice';
import { ScreenContainer } from '../../components/ScreenContainer';
import { WaterIntakeCard } from '../../components/WaterIntakeCard';
import { StatChip } from '../../components/StatChip';
import {
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_ICON,
} from '../../constants/categories';
import { useOpenWorkoutDraft } from '../../hooks/useOpenWorkoutDraft';
import { todayISO } from '../../lib/analytics';
import { fetchWorkoutForDate, type WorkoutDetailExercise } from '../../lib/workouts';
import { useAuthStore } from '../../state/authStore';
import { useTheme } from '../../theme/useTheme';
import type { Category } from '../../types/models';
import type { WorkoutsStackParamList } from '../../navigation/stacks/WorkoutsStack';
import type { MainTabsParamList } from '../../navigation/MainTabs';

/**
 * Composite, because the Fortress card sends three of its four lines to
 * screens inside the Activity tab. A plain stack prop only knows about this
 * stack's own routes, so those would not type-check — the same shape Home
 * uses, and for the same reason.
 *
 * The Omit is what Home does not need. `Workouts` is a key in both param
 * lists: `undefined` in this stack, `NavigatorScreenParams<…>` at the tab
 * level. A composite intersects the two, and those two intersect to
 * `never`, which then poisons every navigate call on the prop rather than
 * just the ambiguous one. Home escapes it because its overlapping key,
 * `Home`, is `undefined` on both sides.
 *
 * Dropping the tab-level entry is also the honest resolution: this screen
 * is already inside the Workouts tab, so it never needs to navigate to it.
 */
type WorkoutsNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<WorkoutsStackParamList>,
  BottomTabNavigationProp<Omit<MainTabsParamList, 'Workouts'>>
>;

function summarize(exercises: WorkoutDetailExercise[]) {
  const byCategory = new Map<Category, number>();
  for (const e of exercises) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + 1);
  }
  return Array.from(byCategory.entries());
}

export function WorkoutsScreen() {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<WorkoutsNavigationProp>();
  const openWorkoutDraft = useOpenWorkoutDraft();
  const userId = useAuthStore((s) => s.session?.user.id);
  const today = todayISO();
  const [dayExercises, setDayExercises] = useState<WorkoutDetailExercise[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [entering, setEntering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDay = useCallback(
    async (dateString: string) => {
      if (!userId) return;
      setLoading(true);
      setError(null);
      try {
        const result = await fetchWorkoutForDate(userId, dateString);
        setDayExercises(result);
      } catch (err) {
        setDayExercises(null);
        setError(err instanceof Error ? err.message : 'Failed to load this day');
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  const reload = useCallback(() => {
    loadDay(today);
  }, [loadDay, today]);

  useFocusEffect(reload);

  const onEnterWorkout = async () => {
    if (entering) return;
    setEntering(true);
    try {
      await openWorkoutDraft(today);
      navigation.navigate('AddWorkout');
    } finally {
      setEntering(false);
    }
  };

  const summary = dayExercises ? summarize(dayExercises) : [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderSearchBar title="Workouts" showSearch={false} />
      <ScreenContainer>
      {/* Same notice as Home, on the screen where workouts are the
          subject. Both are cheap: it reads the queue already in
          memory and renders nothing when it is empty. */}
      <PendingSyncNotice />
      {/* Full width at every size, matching Home's CTA — see the note there. */}
      <GradientButton
        label={dayExercises && dayExercises.length > 0 ? 'Edit workout' : 'Enter a workout'}
        loading={entering}
        onPress={onEnterWorkout}
      />

      {/* Directly under the primary action, the position it held on Home.
          Draws nothing below Fortress and nothing when the tier has nothing
          to say today, so it costs a free account neither a row nor a
          request.

          Programs is a plain stack navigate here rather than the tab-level
          one Home needed: this screen is already inside the Workouts stack
          that owns that route. The other three still cross to Activity. */}
      <FortressTodayCard
        onOpenPrograms={() => navigation.navigate('Programs')}
        onOpenGoals={() => navigation.navigate('Activity', { screen: 'GoalForecast' })}
        onOpenRecords={() => navigation.navigate('Activity', { screen: 'PersonalRecords' })}
        onOpenGroups={() => navigation.navigate('Activity', { screen: 'Groups' })}
      />

      {error ? <ErrorNotice message={error} onRetry={reload} /> : null}

      <AnimatedPressable
        onPress={() => navigation.navigate('DayDetail', { date: today })}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={`${'Today'}, view details`}
      >
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[typography.subheading, { color: colors.textPrimary }]}>
              {'Today'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : error ? (
            <Text style={[typography.body, { color: colors.danger }]}>
              Couldn&apos;t load this day.
            </Text>
          ) : summary.length === 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <IconWell icon="calendar" size={44} />
              <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
                <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>
                  No workout logged
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Tap to log one for this day
                </Text>
              </View>
            </View>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {summary.map(([category, count]) => (
                <View key={category} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <IconWell icon={CATEGORY_ICONS[category] ?? DEFAULT_CATEGORY_ICON} size={28} />
                  <Text style={[typography.body, { color: colors.textPrimary, flex: 1, minWidth: 0 }]}>
                    {category[0].toUpperCase() + category.slice(1)}
                  </Text>
                  <StatChip icon="barbell-outline" value={`${count} exercise${count === 1 ? '' : 's'}`} />
                </View>
              ))}
            </View>
          )}
        </Card>
      </AnimatedPressable>

      {/* Under the day it belongs to. Water is the other thing logged daily,
          so it sits with the selected day rather than above the calendar
          that chooses one — and ahead of the Programs card below, which is
          an upsell rather than something to log. */}
      <WaterIntakeCard />

      {/* Below the calendar rather than above it: this is an alternative to
          building a day one workout at a time, so it reads better after
          you've seen how that manual flow works than before it. */}
      <PaidFeatureCard
        featureId="structured-programs"
        onOpen={() => navigation.navigate('Programs')}
      />

      {/* Last on the screen, as it was on Home. Nutrition still has no
          logging surface of its own to attach to; this is the screen where
          the day's logging happens, which is the closest thing it has to
          one. A teaser for an unbuilt Valhalla feature is a reasonable
          thing to show near the bottom and an indefensible thing to put
          near the top. */}
      <PaidFeatureCard featureId="nutrition-coaching" />
      </ScreenContainer>
    </View>
  );
}
