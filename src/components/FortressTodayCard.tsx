import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { useFortressToday, type FortressToday } from '../hooks/useFortressToday';
import { useTheme } from '../theme/useTheme';

interface Line {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  onPress: () => void;
  accessibilityLabel: string;
}

interface FortressTodayCardProps {
  /** Where each line goes. Home owns the routes; this component owns the copy. */
  onOpenPrograms: () => void;
  onOpenGoals: () => void;
  onOpenRecords: () => void;
  onOpenGroups: () => void;
}

/**
 * What the member's Fortress tier has to say today, on the screen that opens
 * on launch.
 *
 * Home carried exactly one paid card and it was a Valhalla teaser for
 * nutrition coaching, which is not built -- so the launch screen advertised
 * the one thing that does not exist and none of the ten that do. Someone
 * paying for Fortress could open the app every day for a week and see
 * nothing they bought.
 *
 * Only lines with something to say are drawn, and the card disappears
 * entirely when none of them do. A permanent card reading "no goals, no
 * records, not in a group" would be a worse advert for the tier than no card
 * at all -- it would list, every launch, everything the member is not doing.
 */
function buildLines(data: FortressToday, props: FortressTodayCardProps): Line[] {
  const lines: Line[] = [];

  if (data.program) {
    const { dayName, programName, position, cycleLength } = data.program;
    lines.push({
      icon: 'calendar-number-outline',
      text: `Next up: ${dayName} · day ${position} of ${cycleLength} on ${programName}`,
      onPress: props.onOpenPrograms,
      accessibilityLabel: `Next program session, ${dayName}, day ${position} of ${cycleLength} on ${programName}. Opens programs.`,
    });
  }

  if (data.newRecords > 0) {
    lines.push({
      icon: 'trophy-outline',
      text:
        data.newRecords === 1
          ? 'You set a personal record this week'
          : `You set ${data.newRecords} personal records this week`,
      onPress: props.onOpenRecords,
      accessibilityLabel: `${data.newRecords} personal records set this week. Opens your records.`,
    });
  }

  if (data.goal) {
    const { exerciseName, current, target, unit, daysLeft } = data.goal;
    // The gap, not the percentage. "12 kg to go" is the shape of the
    // question someone actually has about a goal.
    const remaining = Math.max(0, Math.round((target - current) * 10) / 10);
    lines.push({
      icon: 'flag-outline',
      text:
        remaining === 0
          ? `${exerciseName}: target reached`
          : `${exerciseName}: ${remaining} ${unit} to go, ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`,
      onPress: props.onOpenGoals,
      accessibilityLabel: `Goal for ${exerciseName}. Opens goal forecast.`,
    });
  }

  if (data.group && data.group.memberCount > 1) {
    // Suppressed in a group of one. "1st of 1" is not a standing, and a
    // group you have just made and not yet shared would otherwise
    // congratulate you every launch.
    const { groupName, rank, memberCount } = data.group;
    lines.push({
      icon: 'people-circle-outline',
      text: `${rank} of ${memberCount} in ${groupName} this week`,
      onPress: props.onOpenGroups,
      accessibilityLabel: `Ranked ${rank} of ${memberCount} in ${groupName} this week. Opens groups.`,
    });
  }

  return lines;
}

export function FortressTodayCard(props: FortressTodayCardProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const { data } = useFortressToday();

  if (!data) return null;
  const lines = buildLines(data, props);
  if (lines.length === 0) return null;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
        {/* Named as the tier rather than "Your summary": this card exists to
            make the thing being paid for visible, and a neutral heading
            would defeat that. */}
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.8,
          }}
        >
          FORTRESS TODAY
        </Text>
      </View>

      {lines.map((line) => (
        <AnimatedPressable
          key={line.text}
          onPress={line.onPress}
          scaleTo={0.98}
          accessibilityRole="button"
          accessibilityLabel={line.accessibilityLabel}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Ionicons name={line.icon} size={17} color={colors.textMuted} />
            <Text
              style={[typography.body, { flex: 1, minWidth: 0, color: colors.textPrimary }]}
              numberOfLines={2}
            >
              {line.text}
            </Text>
            <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
          </View>
        </AnimatedPressable>
      ))}
    </View>
  );
}
