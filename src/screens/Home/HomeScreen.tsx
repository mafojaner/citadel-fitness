import { Ionicons } from '@expo/vector-icons';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { GradientButton } from '../../components/GradientButton';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { ScreenContainer } from '../../components/ScreenContainer';
import { StatChip } from '../../components/StatChip';
import {
  CATEGORY_FILTERS,
  CATEGORY_GRADIENTS,
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_GRADIENT,
  DEFAULT_CATEGORY_ICON,
} from '../../constants/categories';
import { useActivityAnalytics } from '../../hooks/useActivityAnalytics';
import { useExercises } from '../../hooks/useExercises';
import { useRecentWorkouts } from '../../hooks/useRecentWorkouts';
import { todayISO } from '../../lib/analytics';
import { useProfileStore } from '../../state/profileStore';
import { useWorkoutDraftStore } from '../../state/workoutDraftStore';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { Category, Exercise } from '../../types/models';
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
  const navigation = useNavigation<HomeNavigationProp>();
  const ensureDraftFor = useWorkoutDraftStore((s) => s.ensureDraftFor);
  const addExercise = useWorkoutDraftStore((s) => s.addExercise);
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
  const [query, setQuery] = useState('');

  const categoryCounts = new Map<Category, number>();
  for (const e of exercises) {
    categoryCounts.set(e.category, (categoryCounts.get(e.category) ?? 0) + 1);
  }

  const onSelectCategory = (category: Category) => {
    ensureDraftFor(today);
    navigation.navigate('ExerciseCatalogue', { initialCategory: category, standalone: true });
  };

  const isSearching = query.trim().length > 0;
  const searchResults = isSearching
    ? exercises.filter((e) => e.name.toLowerCase().includes(query.trim().toLowerCase()))
    : [];

  const onSelectSearchResult = (exercise: Exercise) => {
    // Append to today's draft rather than replacing it, so picking a second
    // exercise (or returning to an unsaved workout) doesn't wipe the first.
    ensureDraftFor(today);
    addExercise(exercise);
    navigation.navigate('AddWorkout');
  };

  return (
    <ScreenContainer>
      <TextInput
        placeholder="Search exercises..."
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          padding: spacing.md,
          color: colors.textPrimary,
        }}
      />

      {isSearching ? (
        searchResults.length === 0 ? (
          <Card>
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              No exercises match "{query.trim()}".
            </Text>
          </Card>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {searchResults.map((exercise) => (
              <Pressable key={exercise.id} onPress={() => onSelectSearchResult(exercise)}>
                <Card>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <GradientIconBadge
                      icon={CATEGORY_ICONS[exercise.category] ?? DEFAULT_CATEGORY_ICON}
                      colors={CATEGORY_GRADIENTS[exercise.category] ?? DEFAULT_CATEGORY_GRADIENT}
                      size={36}
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[typography.subheading, { color: colors.textPrimary }]}>
                        {exercise.name}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textMuted }]}>
                        {exercise.category}
                      </Text>
                    </View>
                    <Ionicons name="add-circle" size={26} color={colors.primary} />
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        )
      ) : (
        <>
      <Pressable
        onPress={() => navigation.navigate('Activity')}
        accessibilityRole="button"
        accessibilityLabel="Open Activity"
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <GradientIconBadge icon="flame" colors={gradients.flame} size={44} />
            <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
              <Text style={[typography.subheading, { color: colors.textPrimary }]}>Activity Summary</Text>
              {activityLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : activityError ? (
                <Text style={[typography.caption, { color: colors.danger }]}>
                  Couldn't load your activity.
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
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Select to view your full activity breakdown
          </Text>
        </Card>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate('Workouts')}
        accessibilityRole="button"
        accessibilityLabel="Open Workouts"
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Card>
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
              No workouts logged yet. Tap "Log workout" to get started.
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
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Select to view your full workout history
          </Text>
        </Card>
      </Pressable>

      <GradientButton
        label="Log workout"
        onPress={() => {
          ensureDraftFor(today);
          navigation.navigate('AddWorkout');
        }}
      />

      <Text style={[typography.subheading, { color: colors.textPrimary }]}>Browse by category</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {CATEGORY_FILTERS.filter((c) => c.value !== 'all').map((c) => {
          const category = c.value as Category;
          return (
            <Pressable
              key={c.value}
              onPress={() => onSelectCategory(category)}
              style={{ width: '47%' }}
            >
              <Card>
                <View style={{ alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.sm }}>
                  <GradientIconBadge
                    icon={CATEGORY_ICONS[category] ?? DEFAULT_CATEGORY_ICON}
                    colors={CATEGORY_GRADIENTS[category] ?? DEFAULT_CATEGORY_GRADIENT}
                    size={40}
                  />
                  <Text style={[typography.heading, { color: colors.textPrimary }]}>{c.label}</Text>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    {categoryCounts.get(category) ?? 0} exercise
                    {(categoryCounts.get(category) ?? 0) === 1 ? '' : 's'}
                  </Text>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
        </>
      )}
    </ScreenContainer>
  );
}
