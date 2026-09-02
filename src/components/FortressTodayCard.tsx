import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { useFortressToday, type FortressToday } from '../hooks/useFortressToday';
import { useTheme } from '../theme/useTheme';

interface Line {
  icon: keyof typeof Ionicons.glyphMap;
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
      title: dayName,
      detail: `Day ${position} of ${cycleLength} · ${programName}`,
      onPress: props.onOpenPrograms,
      accessibilityLabel: `Next program session, ${dayName}, day ${position} of ${cycleLength} on ${programName}. Opens programs.`,
    });
  }

  if (data.newRecords > 0) {
    lines.push({
      icon: 'trophy',
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
      title: `${ordinal(rank)} of ${memberCount}`,
      detail: `${groupName} · this week`,
      onPress: props.onOpenGroups,
      accessibilityLabel: `Ranked ${ordinal(rank)} of ${memberCount} in ${groupName} this week. Opens groups.`,
    });
  }

  return lines;
}

export function FortressTodayCard(props: FortressTodayCardProps) {
  const { colors, spacing, radius, typography, scheme } = useTheme();
  const { data } = useFortressToday();

  if (!data) return null;
  const lines = buildLines(data, props);
  if (lines.length === 0) return null;

  return (
    <View
      style={{
        // The inverse slab, which is this app's settled way of saying "this
        // one is different" -- the same treatment the paid feature cards
        // use. The first version of this card was a plain surface with a
        // hairline border, which made the summary of everything the member
        // pays for look exactly like the two read-only cards under it.
        backgroundColor: colors.inverseSurface,
        borderRadius: radius.lg,
        padding: spacing.md,
        gap: spacing.sm,
        ...shadowFor(scheme),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="shield-checkmark" size={13} color={colors.inverseText} />
        {/* Named as the tier rather than "Your summary": this card exists to
            make the thing being paid for visible, and a neutral heading
            would defeat that. Stepped back, because it labels the panel
            rather than competing with its contents. */}
        <Text
          style={{
            color: colors.inverseText,
            opacity: 0.65,
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 1,
          }}
        >
          FORTRESS TODAY
        </Text>
      </View>

      {lines.map((line, index) => (
        <View key={line.title + line.detail}>
          {index > 0 ? (
            <View
              style={{
                height: 1,
                backgroundColor: colors.inverseBorder,
                opacity: 0.5,
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: colors.inverseWell,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={line.icon} size={17} color={colors.inverseText} />
              </View>

              {/* Two parts rather than one sentence. The first version read
                  "Next up: Legs · day 3 of 3 on Push / Pull / Legs", which
                  wrapped onto a second line and left the row ragged. A short
                  title with the qualifier underneath scans in one glance and
                  cannot wrap. */}
              <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                <Text
                  style={[typography.body, { color: colors.inverseText, fontWeight: '700' }]}
                  numberOfLines={1}
                >
                  {line.title}
                </Text>
                <Text
                  style={[typography.caption, { color: colors.inverseText, opacity: 0.7 }]}
                  numberOfLines={1}
                >
                  {line.detail}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.inverseText}
                style={{ opacity: 0.55 }}
              />
            </View>
          </AnimatedPressable>
        </View>
      ))}
    </View>
  );
}

/**
 * A shadow under the dark slab on a light page, and none under the light
 * slab on a dark one -- where it would be invisible work. The same split
 * FloatingTabBar makes, rather than a second theming mechanism.
 */
function shadowFor(scheme: 'light' | 'dark') {
  return {
    shadowColor: '#000',
    shadowOpacity: scheme === 'dark' ? 0 : 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: scheme === 'dark' ? 0 : 4,
  };
}
