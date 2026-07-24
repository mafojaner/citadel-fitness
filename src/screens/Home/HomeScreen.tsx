import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Card } from '../../components/Card';
import { ScreenContainer } from '../../components/ScreenContainer';
import { CATEGORY_FILTERS, CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from '../../constants/categories';
import { useActivityAnalytics } from '../../hooks/useActivityAnalytics';
import { useExercises } from '../../hooks/useExercises';
import { useRecentWorkouts } from '../../hooks/useRecentWorkouts';
import { useWorkoutDraftStore } from '../../state/workoutDraftStore';
import { useTheme } from '../../theme/useTheme';
import type { Category } from '../../types/models';
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
  const { exercises } = useExercises();
  const { currentStreakDays, workoutsThisWeek, loading: activityLoading } = useActivityAnalytics('all');
  const { workouts: recentWorkouts, loading: recentLoading } = useRecentWorkouts(3);
  const today = new Date().toISOString().slice(0, 10);

  const categoryCounts = new Map<Category, number>();
  for (const e of exercises) {
    categoryCounts.set(e.category, (categoryCounts.get(e.category) ?? 0) + 1);
  }

  const onSelectCategory = (category: Category) => {
    resetDraft();
    navigation.navigate('ExerciseCatalogue', { initialCategory: category, standalone: true });
  };

  return (
    <ScreenContainer>
      <TextInput
        placeholder="Search exercises, workouts..."
        placeholderTextColor={colors.textMuted}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          padding: spacing.md,
          color: colors.textPrimary,
        }}
      />

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="flame-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
            <Text style={[typography.subheading, { color: colors.textPrimary }]}>Activity Summary</Text>
            {activityLoading ? (
              <ActivityIndicator color={colors.primary} />
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

      <Card title="Workout Summary">
        {recentLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : recentWorkouts.length === 0 ? (
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            No workouts logged yet. Tap "Log workout" to get started.
          </Text>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {recentWorkouts.map((w) => (
              <View
                key={w.date}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <Text style={[typography.body, { color: colors.textPrimary }]}>
                  {formatShortDate(w.date, today)}
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {w.totalExercises} exercise{w.totalExercises === 1 ? '' : 's'}
                  {w.categories.length > 0
                    ? ` · ${w.categories.map((c) => c[0].toUpperCase() + c.slice(1)).join(', ')}`
                    : ''}
                </Text>
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
                  <Ionicons
                    name={CATEGORY_ICONS[category] ?? DEFAULT_CATEGORY_ICON}
                    size={32}
                    color={colors.primary}
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

      <Pressable
        onPress={() => {
          resetDraft();
          navigation.navigate('AddWorkout');
        }}
        style={({ pressed }) => ({
          backgroundColor: colors.primary,
          borderRadius: radius.md,
          padding: spacing.md,
          alignItems: 'center',
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <View>
          <Text style={{ color: colors.surface, fontWeight: '700' }}>Log workout</Text>
        </View>
      </Pressable>
    </ScreenContainer>
  );
}
