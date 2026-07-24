import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Card } from '../../components/Card';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useExercises } from '../../hooks/useExercises';
import { useWorkoutDraftStore } from '../../state/workoutDraftStore';
import { useTheme } from '../../theme/useTheme';
import type { Category } from '../../types/models';
import type { WorkoutsStackParamList } from '../../navigation/stacks/WorkoutsStack';

const CATEGORIES: { label: string; value: Category | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Chest', value: 'chest' },
  { label: 'Back', value: 'back' },
  { label: 'Legs', value: 'legs' },
  { label: 'Cardio', value: 'cardio' },
];

export function ExerciseCatalogueScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<WorkoutsStackParamList>>();
  const { exercises, loading, error } = useExercises();
  const addExercise = useWorkoutDraftStore((s) => s.addExercise);
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    return exercises.filter((e) => {
      const matchesCategory = activeCategory === 'all' || e.category === activeCategory;
      const matchesQuery = e.name.toLowerCase().includes(query.trim().toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [exercises, activeCategory, query]);

  const onSelect = (exercise: (typeof exercises)[number]) => {
    addExercise(exercise);
    navigation.goBack();
  };

  return (
    <ScreenContainer>
      <TextInput
        placeholder="Search exercises"
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

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {CATEGORIES.map((c) => {
          const active = c.value === activeCategory;
          return (
            <Pressable
              key={c.value}
              onPress={() => setActiveCategory(c.value)}
              style={{
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.md,
                borderRadius: radius.pill,
                backgroundColor: active ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
              }}
            >
              <Text style={{ color: active ? colors.surface : colors.textSecondary }}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : error ? (
        <Card>
          <Text style={{ color: colors.danger }}>{error}</Text>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            No exercises match your search.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {filtered.map((exercise) => (
            <Pressable key={exercise.id} onPress={() => onSelect(exercise)}>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
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
      )}
    </ScreenContainer>
  );
}
