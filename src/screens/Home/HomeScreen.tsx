import { Ionicons } from '@expo/vector-icons';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { Card } from '../../components/Card';
import { CategoryGridCard } from '../../components/CategoryGridCard';
import { ErrorNotice } from '../../components/ErrorNotice';
import { FortressTodayCard } from '../../components/FortressTodayCard';
import { GradientButton } from '../../components/GradientButton';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { PaidFeatureCard } from '../../components/PaidFeatureCard';
import { HeaderSearchBar } from '../../components/HeaderSearchBar';
import { MiniProgressChart } from '../../components/MiniProgressChart';
import { ScreenContainer } from '../../components/ScreenContainer';
import { WaterIntakeCard } from '../../components/WaterIntakeCard';
import { StatChip } from '../../components/StatChip';
import { WelcomeBackBanner } from '../../components/WelcomeBackBanner';
import {
  CATEGORY_FILTERS,
  CATEGORY_GRADIENTS,
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_GRADIENT,
  DEFAULT_CATEGORY_ICON,
} from '../../constants/categories';
import { useActivityAnalytics } from '../../hooks/useActivityAnalytics';
import { useExercises } from '../../hooks/useExercises';
import { useOpenWorkoutDraft } from '../../hooks/useOpenWorkoutDraft';
import { useRecentWorkouts } from '../../hooks/useRecentWorkouts';
import { useCategoryColumns, useIsDesktop } from '../../hooks/useResponsiveLayout';
import { todayISO } from '../../lib/analytics';
import { useProfileStore } from '../../state/profileStore';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { Category } from '../../types/models';
import type { HomeStackParamList } from '../../navigation/stacks/HomeStack';
import type { MainTabsParamList } from '../../navigation/MainTabs';

type HomeNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList>,
  BottomTabNavigationProp<MainTabsParamList>
>;

function formatShortDate(dateString: string, today: string) {
  if (dateString === today) return 'Today';
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function HomeScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const isDesktop = useIsDesktop();
  const categoryColumns = useCategoryColumns();
  const navigation = useNavigation<HomeNavigationProp>();
  const openWorkoutDraft = useOpenWorkoutDraft();
  const [openingDraft, setOpeningDraft] = useState(false);
  const { exercises } = useExercises();
  const weightUnit = useProfileStore((s) => s.preferences.units);
  const {
    currentStreakDays,
    workoutsThisWeek,
    loading: activityLoading,
    error: activityError,
  } = useActivityAnalytics('all', weightUnit);
  const {
    workouts: recentWorkouts,
    loading: recentLoading,
    error: recentError,
  } = useRecentWorkouts(3);
  const today = todayISO();

  const categoryCounts = new Map<Category, number>();
  for (const e of exercises) {
    categoryCounts.set(e.category, (categoryCounts.get(e.category) ?? 0) + 1);
  }

  const onSelectCategory = async (category: Category) => {
    if (openingDraft) return;
    setOpeningDraft(true);
    try {
      // Checks the database before opening the draft, so exercises already
      // saved to today through another entry point (e.g. the Workouts
      // calendar) aren't silently treated as if they don't exist.
      await openWorkoutDraft(today);
      navigation.navigate('ExerciseCatalogue', { initialCategory: category, standalone: true });
    } finally {
      setOpeningDraft(false);
    }
  };

  const onLogWorkout = async () => {
    if (openingDraft) return;
    setOpeningDraft(true);
    try {
      await openWorkoutDraft(today);
      navigation.navigate('AddWorkout');
    } finally {
      setOpeningDraft(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderSearchBar title="Home" showSearch={false} />
      <ScreenContainer>
      {/* The action people actually open this screen for leads, rather than
          sitting below two read-only summary cards. Full width at every size:
          it spans the pair of summary cards below it, which keeps the column
          reading as one block instead of a small button floating above it. */}
      <GradientButton label="Log workout" loading={openingDraft} onPress={onLogWorkout} />

      {/* Directly under the primary action, above the two read-only
          summaries.

          Every Fortress feature used to live at least one tab away, and the
          only paid card on this screen was a Valhalla teaser for nutrition
          coaching -- which is not built. So the screen that opens on launch
          advertised the one thing that does not exist and none of the ten
          that do. This draws nothing at all below Fortress, and nothing when
          the tier has nothing to say today, so it costs a free account
          neither a row nor a request. */}
      <FortressTodayCard
        onOpenPrograms={() => navigation.navigate('Workouts', { screen: 'Programs' })}
        onOpenGoals={() => navigation.navigate('Activity', { screen: 'GoalForecast' })}
        onOpenRecords={() => navigation.navigate('Activity', { screen: 'PersonalRecords' })}
        onOpenGroups={() => navigation.navigate('Activity', { screen: 'Groups' })}
      />

      {/* Side by side once there's width for it: these are two peer summaries,
          and stacking them on desktop pushes the category grid below the fold
          for no reason. Stretched to equal height, with the cards told to fill
          their pressable so their bottom edges line up whichever one happens
          to be taller — and so neither leaves a slab of tappable dead space
          below itself. */}
      <View
        style={{
          flexDirection: isDesktop ? 'row' : 'column',
          alignItems: 'stretch',
          gap: spacing.md,
        }}
      >
      <AnimatedPressable
        onPress={() => navigation.navigate('Activity', { screen: 'Activity' })}
        accessibilityRole="button"
        accessibilityLabel="Open Activity"
        scaleTo={0.98}
        style={isDesktop ? { flex: 1, minWidth: 0 } : undefined}
      >
        <Card style={isDesktop ? { flex: 1 } : undefined}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <GradientIconBadge icon="flame" colors={gradients.flame} size={44} />
            <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
              <Text style={[typography.subheading, { color: colors.textPrimary }]}>Activity Summary</Text>
              {activityLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : activityError ? (
                <Text style={[typography.caption, { color: colors.danger }]}>
                  Couldn&apos;t load your activity.
                </Text>
              ) : currentStreakDays === 0 && workoutsThisWeek === 0 ? (
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Log your first workout to start a streak.
                </Text>
              ) : (
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {currentStreakDays} day{currentStreakDays === 1 ? '' : 's'} streak · {workoutsThisWeek}{' '}
                  workout{workoutsThisWeek === 1 ? '' : 's'} this week
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
          {/* Desktop only: this card is two lines tall next to the workout
              list beside it, leaving the column half empty. The trend is the
              natural thing to fill it with, and it's the same data the card
              already summarises in words. */}
          {isDesktop ? <MiniProgressChart /> : null}
          {/* Pinned to the bottom of the stretched card so both captions sit
              on the same line, rather than one trailing its content with the
              leftover height dangling below it. */}
          <Text style={[typography.caption, { color: colors.textMuted }, isDesktop && { marginTop: 'auto' }]}>
            Select to view your full activity breakdown
          </Text>
        </Card>
      </AnimatedPressable>

      <AnimatedPressable
        onPress={() => navigation.navigate('Workouts', { screen: 'Workouts' })}
        accessibilityRole="button"
        accessibilityLabel="Open Workouts"
        scaleTo={0.98}
        style={isDesktop ? { flex: 1, minWidth: 0 } : undefined}
      >
        <Card style={isDesktop ? { flex: 1 } : undefined}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <GradientIconBadge icon="calendar" colors={gradients.calendar} size={44} />
            <Text style={[typography.subheading, { color: colors.textPrimary, flex: 1, minWidth: 0 }]}>
              Workout Summary
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>

          {recentLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : recentError ? (
            <ErrorNotice message={recentError} />
          ) : recentWorkouts.length === 0 ? (
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              No workouts logged yet. Tap &quot;Log workout&quot; to get started.
            </Text>
          ) : (
            <View style={{ gap: spacing.md, paddingTop: spacing.sm }}>
              {recentWorkouts.map((w) => (
                <View
                  key={w.date}
                  style={{
                    gap: spacing.xs,
                    paddingTop: spacing.sm,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]}>
                      {formatShortDate(w.date, today)}
                    </Text>
                    <StatChip
                      icon="barbell-outline"
                      value={`${w.totalExercises} exercise${w.totalExercises === 1 ? '' : 's'}`}
                    />
                  </View>
                  {w.categories.length > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                      {w.categories.map((cat) => (
                        <View
                          key={cat}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: colors.primaryMuted,
                            borderRadius: radius.pill,
                            paddingHorizontal: spacing.sm,
                            paddingVertical: 3,
                          }}
                        >
                          <Ionicons
                            name={CATEGORY_ICONS[cat] ?? DEFAULT_CATEGORY_ICON}
                            size={12}
                            color={colors.primary}
                          />
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '600',
                              color: colors.primary,
                              textTransform: 'capitalize',
                            }}
                          >
                            {cat}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
          <Text style={[typography.caption, { color: colors.textMuted }, isDesktop && { marginTop: 'auto' }]}>
            Select to view your full workout history
          </Text>
        </Card>
      </AnimatedPressable>
      </View>

      <WaterIntakeCard />

      {/* Discovery section: category browsing into the same task (find
          something to log) people come here for — full-text search now
          lives on its own tab, which has room to be the whole screen. */}
      <Text style={[typography.subheading, { color: colors.textPrimary }]}>Find an exercise</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {CATEGORY_FILTERS.filter((c) => c.value !== 'all').map((c) => {
          const category = c.value as Category;
          return (
            <CategoryGridCard
              key={c.value}
              icon={CATEGORY_ICONS[category] ?? DEFAULT_CATEGORY_ICON}
              gradientColors={CATEGORY_GRADIENTS[category] ?? DEFAULT_CATEGORY_GRADIENT}
              label={c.label}
              count={categoryCounts.get(category) ?? 0}
              columns={categoryColumns}
              onPress={() => onSelectCategory(category)}
            />
          );
        })}
      </View>

      {/* Nutrition has no logging surface anywhere in the app to attach
          this to, so it sits here instead: Home is the "what's next for
          you" screen, which is the closest thing it has to a natural home. */}
      {/* Kept, but no longer the only paid thing on the screen. It is a
          teaser for an unbuilt Valhalla feature, which is a reasonable thing
          to show a Fortress member near the bottom of Home and was an
          indefensible thing to be the sole representative of a paid tier. */}
      <PaidFeatureCard featureId="nutrition-coaching" />
      </ScreenContainer>

      {/* Last child so it layers over the header and content. Lives on Home
          because that's where signing in always lands, and because the streak
          it reads is already loaded here. */}
      <WelcomeBackBanner streakDays={currentStreakDays} />
    </View>
  );
}
