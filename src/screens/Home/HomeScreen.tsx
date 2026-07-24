import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Card } from '../../components/Card';
import { ScreenContainer } from '../../components/ScreenContainer';
import { CATEGORY_FILTERS, CATEGORY_ICONS, DEFAULT_CATEGORY_ICON } from '../../constants/categories';
import { useExercises } from '../../hooks/useExercises';
import { useWorkoutDraftStore } from '../../state/workoutDraftStore';
import { useTheme } from '../../theme/useTheme';
import type { Category } from '../../types/models';
import type { HomeStackParamList } from '../../navigation/stacks/HomeStack';

export function HomeScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const resetDraft = useWorkoutDraftStore((s) => s.reset);
  const { exercises } = useExercises();

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

      <Card title="Activity Summary">
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Streak and progress snapshot coming soon.
        </Text>
      </Card>

      <Card title="Workout Summary">
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Recent and upcoming logged workouts will appear here.
        </Text>
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
