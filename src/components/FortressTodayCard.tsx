import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { Card } from './Card';
import { PremiumHeader, PremiumRow } from './PremiumCard';
import { useFortressToday, type FortressToday } from '../hooks/useFortressToday';
import { iconInk } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

interface Line {
  icon: keyof typeof Ionicons.glyphMap;
  /**
   * The glyph's ink, matched to the feature each line opens: the programme
   * line is the same colour as the Structured programs card, the records
   * line the same as the records vault. A member reaching one of these from
   * two directions sees one colour for it.
   */
  tint: string;
  /** The short, scannable half. Never wraps. */
  title: string;
  /** The qualifying half, muted under it. */
  detail: string;
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
 * Ordinal, because "1 of 5" reads as a count and "1st of 5" reads as a
 * placing, which is the whole point of a leaderboard line.
 */
function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/**
 * What the member's Fortress tier has to say today, on the screen that opens
 * on launch.
 *
 * Home carried exactly one paid card and it was a Valhalla teaser for
 * nutrition coaching, which is not built -- so the launch screen advertised
 * the one thing that does not exist and none of the ten that do.
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
      icon: 'calendar-number',
      tint: iconInk.ember,
      title: dayName,
      detail: `Day ${position} of ${cycleLength} · ${programName}`,
      onPress: props.onOpenPrograms,
      accessibilityLabel: `Next program session, ${dayName}, day ${position} of ${cycleLength} on ${programName}. Opens programs.`,
    });
  }

  if (data.newRecords > 0) {
    lines.push({
      icon: 'trophy',
      tint: iconInk.amber,
      title:
        data.newRecords === 1 ? 'New personal record' : `${data.newRecords} new personal records`,
      detail: 'Set in the last seven days',
      onPress: props.onOpenRecords,
      accessibilityLabel: `${data.newRecords} personal records set in the last seven days. Opens your records.`,
    });
  }

  if (data.goal) {
    const { exerciseName, current, target, unit, daysLeft } = data.goal;
    // The gap, not a percentage. "12 kg to go" is the shape of the question
    // someone actually has about a goal.
    const remaining = Math.max(0, Math.round((target - current) * 10) / 10);
    lines.push({
      icon: 'flag',
      tint: iconInk.amber,
      title: exerciseName,
      detail:
        remaining === 0
          ? `Target of ${target} ${unit} reached`
          : `${remaining} ${unit} to go · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`,
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
      icon: 'people-circle',
      tint: iconInk.rose,
      title: `${ordinal(rank)} of ${memberCount}`,
      detail: `${groupName} · this week`,
      onPress: props.onOpenGroups,
      accessibilityLabel: `Ranked ${ordinal(rank)} of ${memberCount} in ${groupName} this week. Opens groups.`,
    });
  }

  return lines;
}

export function FortressTodayCard(props: FortressTodayCardProps) {
  const { colors, spacing } = useTheme();
  const { data } = useFortressToday();

  if (!data) return null;
  const lines = buildLines(data, props);
  if (lines.length === 0) return null;

  return (
    /* An ordinary card, where this used to be an inverted slab -- near-black
       on the light theme, white on the dark one.

       The slab existed to say "this one is different", and it did, but it
       said it by ignoring the scheme: a black panel is not the light
       theme's colour and a white one is not the dark theme's. The shield
       and the tier name already do that job in a way that survives a theme
       switch, so what is left is the surface, hairline and shadow every
       other card on this screen is made of -- which is Card. */
    <Card>
      {/* Named as the tier rather than "Your summary": this card exists to
          make the thing being paid for visible, and a neutral heading would
          defeat that. */}
      <PremiumHeader label="FORTRESS TODAY" />

      {lines.map((line, index) => (
        <View key={line.title + line.detail}>
          {index > 0 ? (
            <View
              style={{
                height: 1,
                backgroundColor: colors.border,
                marginBottom: spacing.sm,
              }}
            />
          ) : null}
          <AnimatedPressable
            onPress={line.onPress}
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel={line.accessibilityLabel}
          >
            <PremiumRow
              icon={line.icon}
              tint={line.tint}
              title={line.title}
              detail={line.detail}
            />
          </AnimatedPressable>
        </View>
      ))}
    </Card>
  );
}
