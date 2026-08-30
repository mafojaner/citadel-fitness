import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { Card } from './Card';
import { GradientIconBadge } from './GradientIconBadge';
import {
  CATEGORY_GRADIENTS,
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_GRADIENT,
  DEFAULT_CATEGORY_ICON,
} from '../constants/categories';
import { useTheme } from '../theme/useTheme';
import type { Exercise } from '../types/models';

/**
 * One exercise in the catalogue list, extracted and memoised.
 *
 * It was inline JSX inside FlatList's renderItem, which meant a new function
 * identity on every parent render and a full re-render of every visible row
 * on every keystroke in the search field. Each of those rows draws a
 * GradientIconBadge, which is a LinearGradient -- not a free component to
 * throw away and rebuild ninety times while somebody types "bench".
 *
 * memo only helps if the props are referentially stable, so the callbacks
 * take the exercise as an argument and are useCallback'd by the parent.
 * Passing `() => onSelect(exercise)` from the parent would defeat the whole
 * thing while looking identical.
 *
 * This is the half of the 14 August performance item that was written down
 * and never actually done: the data was memoised, the rows were not.
 */
export const ExerciseRow = memo(function ExerciseRow({
  exercise,
  onSelect,
  onShowInfo,
}: {
  exercise: Exercise;
  onSelect: (exercise: Exercise) => void;
  onShowInfo: (exercise: Exercise) => void;
}) {
  const { colors, spacing, typography } = useTheme();

  return (
    <AnimatedPressable
      onPress={() => onSelect(exercise)}
      accessibilityRole="button"
      accessibilityLabel={exercise.name}
      scaleTo={0.98}
    >
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <GradientIconBadge
            icon={CATEGORY_ICONS[exercise.category] ?? DEFAULT_CATEGORY_ICON}
            colors={CATEGORY_GRADIENTS[exercise.category] ?? DEFAULT_CATEGORY_GRADIENT}
            size={36}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[typography.subheading, { color: colors.textPrimary }]}>{exercise.name}</Text>
            <Text
              style={[typography.caption, { color: colors.textMuted, textTransform: 'capitalize' }]}
            >
              {exercise.category}
            </Text>
          </View>
          <Pressable
            onPress={() => onShowInfo(exercise)}
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
  );
});
