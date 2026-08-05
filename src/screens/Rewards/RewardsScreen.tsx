import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { InfoNote } from '../../components/InfoNote';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useRewards } from '../../hooks/useRewards';
import type { RewardDay, RewardWeek } from '../../lib/rewards';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const REWARD_DAY_HEADER_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * A logged-and-eligible day gets a green ring/fill — colors.success rather
 * than colors.primary — so it reads as its own "this counts toward your
 * reward" signal distinct from the app's general brand accent. RewardDay's
 * `logged` already means "logged same day" (fetchRewardEligibleWorkoutDates
 * excludes backdated entries), so this circle only ever lights up for days
 * that genuinely count. See supabase/migration_024_reward_eligibility.sql.
 */
function RewardDayCircle({ day }: { day: RewardDay }) {
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
          borderColor: colors.success,
          backgroundColor: day.logged
            ? `${colors.success}22`
            : isTodayUnlogged
              ? colors.textPrimary
              : 'transparent',
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

function RewardWeekRow({ week }: { week: RewardWeek }) {
  const { colors, spacing } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      {week.days.map((day) => (
        <RewardDayCircle key={day.date} day={day} />
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
    weeks: rewardWeeks,
    loading: rewardsLoading,
    error: rewardsError,
    reload: reloadRewards,
  } = useRewards();
  const weeksToGo = weeksPerReward - weeksIntoCurrentCycle;

  return (
    <ScreenContainer>
      <InfoNote
        label="About reward eligibility"
        text="Only workouts logged on their actual day count toward rewards — a day added later through the calendar won't count, even if the workout really happened that day."
      />

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

      {rewardsError ? <ErrorNotice message={rewardsError} onRetry={reloadRewards} /> : null}

      <Card title="This cycle">
        {rewardsLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              {REWARD_DAY_HEADER_LABELS.map((label, i) => (
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

            {rewardWeeks.map((week) => (
              <RewardWeekRow key={week.weekStart} week={week} />
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
        Rewards track your consistency now. Redeeming 10% off a premium membership isn&apos;t live yet —
        we&apos;ll let you know here as soon as it is.
      </Text>
    </ScreenContainer>
  );
}
