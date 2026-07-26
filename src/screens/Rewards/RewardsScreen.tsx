import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useRewards } from '../../hooks/useRewards';
import type { RewardDay, RewardWeek } from '../../lib/rewards';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const DAY_HEADER_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function DayCircle({ day }: { day: RewardDay }) {
  const { colors } = useTheme();

  const isTodayUnlogged = day.isToday && !day.logged;

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: day.logged ? 2 : 0,
          borderColor: colors.primary,
          backgroundColor: isTodayUnlogged ? colors.textPrimary : 'transparent',
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: day.logged ? '700' : '500',
            color: isTodayUnlogged ? colors.background : day.isFuture ? colors.textMuted : colors.textPrimary,
            opacity: day.isFuture ? 0.4 : 1,
          }}
        >
          {day.dayNumber}
        </Text>
      </View>
    </View>
  );
}

function WeekRow({ week }: { week: RewardWeek }) {
  const { colors, spacing } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      {week.days.map((day) => (
        <DayCircle key={day.date} day={day} />
      ))}
      <View
        style={{
          width: 44,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: week.complete ? colors.primary : 'transparent',
          borderWidth: week.complete ? 0 : 1,
          borderColor: colors.border,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: week.complete ? '#FFFFFF' : colors.textMuted,
          }}
        >
          {week.daysLogged}/{4}
        </Text>
      </View>
    </View>
  );
}

export function RewardsScreen() {
  const { colors, spacing, typography } = useTheme();
  const {
    weeklyStreak,
    rewardsEarned,
    weeksIntoCurrentCycle,
    weeksPerReward,
    weeklyTargetDays,
    weeks,
    loading,
    error,
    reload,
  } = useRewards();

  const weeksToGo = weeksPerReward - weeksIntoCurrentCycle;

  return (
    <ScreenContainer>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <GradientIconBadge icon="diamond" colors={gradients.flame} size={44} />
          <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
            <Text style={[typography.subheading, { color: colors.textPrimary }]}>
              {weeklyStreak} week streak
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Log a workout on {weeklyTargetDays} days a week to keep it going.
            </Text>
          </View>
        </View>
      </Card>

      {error ? <ErrorNotice message={error} onRetry={reload} /> : null}

      <Card title="This cycle">
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              {DAY_HEADER_LABELS.map((label, i) => (
                <Text
                  key={i}
                  style={[
                    typography.caption,
                    { flex: 1, textAlign: 'center', color: colors.textMuted },
                  ]}
                >
                  {label}
                </Text>
              ))}
              <View style={{ width: 44 }}>
                <Ionicons name="checkmark" size={16} color={colors.textMuted} style={{ alignSelf: 'center' }} />
              </View>
            </View>

            {weeks.map((week) => (
              <WeekRow key={week.weekStart} week={week} />
            ))}
          </View>
        )}
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <GradientIconBadge icon="pricetag" colors={gradients.identity} size={40} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={[typography.subheading, { color: colors.textPrimary }]}>
              {rewardsEarned > 0
                ? `${rewardsEarned} reward${rewardsEarned === 1 ? '' : 's'} earned`
                : 'No rewards earned yet'}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {weeksIntoCurrentCycle} of {weeksPerReward} weeks toward your next 10% off — {weeksToGo}{' '}
              more complete week{weeksToGo === 1 ? '' : 's'} to go.
            </Text>
          </View>
        </View>
      </Card>

      <Text style={[typography.caption, { color: colors.textMuted }]}>
        Rewards track your consistency now. Redeeming 10% off a premium membership isn't live yet —
        we'll let you know here as soon as it is.
      </Text>
    </ScreenContainer>
  );
}
