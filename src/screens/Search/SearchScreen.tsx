import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { Card } from '../../components/Card';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { ProfileIconButton } from '../../components/ProfileIconButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SearchField } from '../../components/SearchField';
import {
  CATEGORY_GRADIENTS,
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_GRADIENT,
  DEFAULT_CATEGORY_ICON,
} from '../../constants/categories';
import { useExercises } from '../../hooks/useExercises';
import { todayISO } from '../../lib/analytics';
import { useTheme } from '../../theme/useTheme';
import { useWorkoutDraftStore } from '../../state/workoutDraftStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Exercise } from '../../types/models';
import type { SearchStackParamList } from '../../navigation/stacks/SearchStack';

/**
 * The app's one search surface — reached via the Search tab instead of a
 * cramped header field, so the whole screen is free to be the result list.
 * Scoped to exercises (the one search that was actually functional before
 * this moved), since newsletter search is a separate, page-scoped feature
 * that stays on the Learn tab.
 */
export function SearchScreen() {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<SearchStackParamList>>();
  const { exercises } = useExercises();
  const ensureDraftFor = useWorkoutDraftStore((s) => s.ensureDraftFor);
  const addExercise = useWorkoutDraftStore((s) => s.addExercise);
  const [query, setQuery] = useState('');

  const trimmed = query.trim();
  const results = trimmed
    ? exercises.filter((e) => e.name.toLowerCase().includes(trimmed.toLowerCase()))
    : [];

  const onSelect = (exercise: Exercise) => {
    // Append to today's draft rather than replacing it, so picking a second
    // exercise (or returning to an unsaved workout) doesn't wipe the first.
    ensureDraftFor(todayISO());
    addExercise(exercise);
    navigation.navigate('AddWorkout');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          backgroundColor: colors.navBackground,
          paddingTop: insets.top + spacing.sm,
          paddingBottom: spacing.sm,
          paddingHorizontal: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <View style={{ flex: 1 }}>
          <SearchField
            placeholder="Search exercises..."
            value={query}
            onChangeText={setQuery}
            size="large"
            autoFocus
          />
        </View>
        <ProfileIconButton />
      </View>

      <ScreenContainer>
        {!trimmed ? (
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Search for an exercise to add it to today&apos;s workout.
          </Text>
        ) : results.length === 0 ? (
          <Card>
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              No exercises match &quot;{trimmed}&quot;.
            </Text>
          </Card>
        ) : (
          <View style={{ gap: spacing.sm }}>
            {results.map((exercise) => (
              <AnimatedPressable key={exercise.id} onPress={() => onSelect(exercise)} scaleTo={0.98}>
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
              </AnimatedPressable>
            ))}
          </View>
        )}
      </ScreenContainer>
    </View>
  );
}
