import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
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
import { useWorkoutDraftStore } from '../../state/workoutDraftStore';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { Category, Exercise } from '../../types/models';
import type { HomeStackParamList } from '../../navigation/stacks/HomeStack';

function formatShortDate(dateString: string, today: string) {
  if (dateString === today) return 'Today';
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function HomeScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const resetDraft = useWorkoutDraftStore((s) => s.reset);
  const addExercise = useWorkoutDraftStore((s) => s.addExercise);
  const { exercises } = useExercises();
  const {
    currentStreakDays,
    workoutsThisWeek,
    loading: activityLoading,
    error: activityError,
  } = useActivityAnalytics('all');
  const {
    workouts: recentWorkouts,
    loading: recentLoading,
    error: recentError,
  } = useRecentWorkouts(3);
  const today = new Date().toISOString().slice(0, 10);
  const [query, setQuery] = useState('');

  const categoryCounts = new Map<Category, number>();
  for (const e of exercises) {
    categoryCounts.set(e.category, (categoryCounts.get(e.category) ?? 0) + 1);
  }

  const onSelectCategory = (category: Category) => {
    resetDraft();
    navigation.navigate('ExerciseCatalogue', { initialCategory: category, standalone: true });
  };

  const isSearching = query.trim().length > 0;
  const searchResults = isSearching
    ? exercises.filter((e) => e.name.toLowerCase().includes(query.trim().toLowerCase()))
    : [];

  const onSelectSearchResult = (exercise: Exercise) => {
    resetDraft();
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
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <GradientIconBadge icon="calendar" colors={gradients.calendar} size={44} />
          <Text style={[typography.subheading, { color: colors.textPrimary }]}>Workout Summary</Text>
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
          <View style={{ gap: spacing.sm, paddingTop: spacing.sm }}>
            {recentWorkouts.map((w) => (
              <View
                key={w.date}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: spacing.sm,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
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
            ))}
          </View>
        )}
      </Card>

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

      <GradientButton
        label="Log workout"
        onPress={() => {
          resetDraft();
          navigation.navigate('AddWorkout');
        }}
      />
        </>
      )}
    </ScreenContainer>
  );
}
