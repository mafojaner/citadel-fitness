import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { Card } from '../../components/Card';
import { CategoryGridCard } from '../../components/CategoryGridCard';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { GradientPill } from '../../components/GradientPill';
import { PopInView } from '../../components/PopInView';
import { ProfileLoadBanner } from '../../components/ProfileLoadBanner';
import {
  CATEGORY_FILTERS,
  CATEGORY_GRADIENTS,
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_GRADIENT,
  DEFAULT_CATEGORY_ICON,
} from '../../constants/categories';
import { useExercises } from '../../hooks/useExercises';
import { FLOATING_TAB_BAR_CLEARANCE } from '../../navigation/FloatingTabBar';
import { useWorkoutDraftStore } from '../../state/workoutDraftStore';
import { useTheme } from '../../theme/useTheme';
import type { Category, Exercise } from '../../types/models';
import type { WorkoutsStackParamList } from '../../navigation/stacks/WorkoutsStack';

export function ExerciseCatalogueScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<WorkoutsStackParamList>>();
  const route = useRoute<RouteProp<WorkoutsStackParamList, 'ExerciseCatalogue'>>();
  const { exercises, loading, error } = useExercises();
  const addExercise = useWorkoutDraftStore((s) => s.addExercise);
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>(
    route.params?.initialCategory ?? 'all'
  );
  const [query, setQuery] = useState('');
  const [infoExercise, setInfoExercise] = useState<Exercise | null>(null);

  const isSearching = query.trim().length > 0;
  const showCategoryGrid = !isSearching && activeCategory === 'all';

  const categoryCards = useMemo(() => {
    const counts = new Map<Category, number>();
    for (const e of exercises) {
      counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
    }
    return CATEGORY_FILTERS.filter((c) => c.value !== 'all').map((c) => ({
      ...c,
      count: counts.get(c.value as Category) ?? 0,
    }));
  }, [exercises]);

  const filtered = useMemo(() => {
    return exercises.filter((e) => {
      const matchesCategory = activeCategory === 'all' || e.category === activeCategory;
      const matchesQuery = e.name.toLowerCase().includes(query.trim().toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [exercises, activeCategory, query]);

  const onSelect = (exercise: Exercise) => {
    addExercise(exercise);
    if (route.params?.standalone) {
      navigation.replace('AddWorkout');
    } else {
      navigation.goBack();
    }
  };

  // Only the filtered exercise list (up to ~90 rows with icons) needs
  // virtualizing — the category grid is a handful of fixed tiles, so it
  // renders as ordinary header content rather than FlatList data.
  const listData = loading || error || showCategoryGrid ? [] : filtered;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          padding: spacing.md,
          paddingBottom: spacing.md + FLOATING_TAB_BAR_CLEARANCE,
          flexGrow: 1,
        }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: listData.length > 0 ? spacing.md : 0 }}>
            <ProfileLoadBanner />
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
              {CATEGORY_FILTERS.map((c) => (
                <GradientPill
                  key={c.value}
                  label={c.label}
                  active={c.value === activeCategory}
                  onPress={() => setActiveCategory(c.value)}
                />
              ))}
            </View>

            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : error ? (
              <Card>
                <Text style={{ color: colors.danger }}>{error}</Text>
              </Card>
            ) : showCategoryGrid ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
                {categoryCards.map((c) => (
                  <CategoryGridCard
                    key={c.value}
                    icon={CATEGORY_ICONS[c.value as Category] ?? DEFAULT_CATEGORY_ICON}
                    gradientColors={CATEGORY_GRADIENTS[c.value as Category] ?? DEFAULT_CATEGORY_GRADIENT}
                    label={c.label}
                    count={c.count}
                    onPress={() => setActiveCategory(c.value)}
                  />
                ))}
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !loading && !error && !showCategoryGrid ? (
            <Card>
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                No exercises match your search.
              </Text>
            </Card>
          ) : null
        }
        renderItem={({ item: exercise }) => (
          <AnimatedPressable onPress={() => onSelect(exercise)} scaleTo={0.98}>
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
                <Pressable
                  onPress={() => setInfoExercise(exercise)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`About ${exercise.name}`}
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={24}
                    color={colors.textMuted}
                    style={{ opacity: 0.55 }}
                  />
                </Pressable>
                <Ionicons name="add-circle" size={26} color={colors.primary} />
              </View>
            </Card>
          </AnimatedPressable>
        )}
      />

      <Modal
        visible={!!infoExercise}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoExercise(null)}
      >
        <Pressable
          onPress={() => setInfoExercise(null)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            padding: spacing.lg,
          }}
        >
          <Pressable onPress={() => {}}>
            <PopInView key={infoExercise?.id}>
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <GradientIconBadge
                    icon={
                      infoExercise
                        ? CATEGORY_ICONS[infoExercise.category] ?? DEFAULT_CATEGORY_ICON
                        : DEFAULT_CATEGORY_ICON
                    }
                    colors={
                      infoExercise
                        ? CATEGORY_GRADIENTS[infoExercise.category] ?? DEFAULT_CATEGORY_GRADIENT
                        : DEFAULT_CATEGORY_GRADIENT
                    }
                    size={40}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[typography.subheading, { color: colors.textPrimary }]}>
                      {infoExercise?.name}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>
                      {infoExercise?.category}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setInfoExercise(null)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                  >
                    <Ionicons name="close" size={22} color={colors.textMuted} />
                  </Pressable>
                </View>
                <Text style={[typography.body, { color: colors.textSecondary }]}>
                  {infoExercise?.description ?? 'No description yet for this exercise.'}
                </Text>
              </Card>
            </PopInView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
