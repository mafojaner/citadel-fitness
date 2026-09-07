import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Card } from './Card';
import { GradientIconBadge } from './GradientIconBadge';
import { StatChip } from './StatChip';
import {
  CATEGORY_GRADIENTS,
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_GRADIENT,
  DEFAULT_CATEGORY_ICON,
} from '../constants/categories';
import type { DayActivity } from '../lib/activityFeed';
import { formatWaterAmount } from '../lib/water';
import { useProfileStore } from '../state/profileStore';
import { useTheme } from '../theme/useTheme';
import type { Category } from '../types/models';
import type { WorkoutDetailExercise } from '../lib/workouts';

interface DayActivityCardProps {
  day: DayActivity;
  /** Today's date, so the heading can say "Today" instead of the date. */
  today: string;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds === 0 ? `${minutes} min` : `${minutes}m ${seconds}s`;
}

/**
 * "Today", "Yesterday", then the date. The two relative labels are worth the
 * special case because they are the two a person reads most and the ones a
 * bare date makes them work out.
 */
function formatHeading(dateString: string, today: string): string {
  if (dateString === today) return 'Today';
  const [y, m, d] = today.split('-').map(Number);
  const yesterday = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
  if (dateString === yesterday) return 'Yesterday';
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * One day of logged activity.
 *
 * Read-only by design. The feed is a record of what happened, and every
 * control that used to sit on Home now lives where the thing is done: the
 * centre tab logs a workout, the Workouts screen holds water and the paid
 * cards. A card here that could be edited would be a second way to change
 * data, in the one place built for looking back at it.
 */
export function DayActivityCard({ day, today }: DayActivityCardProps) {
  const { colors, spacing, typography } = useTheme();
  const waterUnit = useProfileStore((s) => s.preferences.waterUnit);

  // Grouped the same way DayDetail groups them, so a day reads the same
  // whichever screen you meet it on.
  const grouped = useMemo(() => {
    const map = new Map<Category, WorkoutDetailExercise[]>();
    for (const exercise of day.exercises) {
      map.set(exercise.category, [...(map.get(exercise.category) ?? []), exercise]);
    }
    return Array.from(map.entries());
  }, [day.exercises]);

  const setCount = day.exercises.reduce((n, e) => n + e.sets.length, 0);

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm }}>
        <Text style={[typography.subheading, { color: colors.textPrimary, flex: 1, minWidth: 0 }]} numberOfLines={1}>
          {formatHeading(day.date, today)}
        </Text>
        {setCount > 0 ? (
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {setCount} {setCount === 1 ? 'set' : 'sets'}
          </Text>
        ) : null}
      </View>

      {grouped.map(([category, exercises]) => (
        <View
          key={category}
          style={{ gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <GradientIconBadge
              icon={CATEGORY_ICONS[category] ?? DEFAULT_CATEGORY_ICON}
              colors={CATEGORY_GRADIENTS[category] ?? DEFAULT_CATEGORY_GRADIENT}
              size={28}
            />
            <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]}>
              {category[0].toUpperCase() + category.slice(1)}
            </Text>
          </View>

          {exercises.map((exercise) => (
            <View key={exercise.id} style={{ gap: spacing.xs, paddingLeft: spacing.xs }}>
              <Text style={[typography.body, { color: colors.textPrimary }]}>{exercise.exerciseName}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {exercise.sets.map((set) => (
                  <View key={set.id} style={{ flexDirection: 'row', gap: spacing.xs }}>
                    {exercise.type === 'cardio' ? (
                      <>
                        <StatChip icon="time-outline" value={formatDuration(set.durationSeconds)} />
                        {set.distance ? (
                          <StatChip icon="navigate-outline" value={`${set.distance} ${set.distanceUnit}`} />
                        ) : null}
                      </>
                    ) : (
                      <StatChip
                        icon="barbell-outline"
                        value={`${set.weight} ${set.weightUnit} × ${set.reps}`}
                      />
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      ))}

      {/* The three non-workout entries share a row of their own. Each is one
          fact about the day rather than a nested list, so giving them the
          same treatment as an exercise would be more structure than they
          have content. */}
      {day.waterMl > 0 || day.nutrition.length > 0 || day.formChecks.length > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.xs,
            paddingTop: spacing.sm,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          {day.waterMl > 0 ? (
            <StatChip icon="water-outline" value={formatWaterAmount(day.waterMl, waterUnit)} />
          ) : null}
          {day.formChecks.map((check) => (
            <StatChip
              key={check.id}
              icon="videocam-outline"
              value={check.status === 'reviewed' ? 'Form check reviewed' : 'Form check sent'}
            />
          ))}
          {day.nutrition.map((intake) => (
            <StatChip
              key={intake.id}
              icon="nutrition-outline"
              value={intake.status === 'answered' ? 'Nutrition plan back' : 'Nutrition intake sent'}
            />
          ))}
        </View>
      ) : null}
    </Card>
  );
}
