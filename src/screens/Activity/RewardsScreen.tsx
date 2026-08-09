import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Text, View } from 'react-native';
import { ActivityCalendar } from '../../components/ActivityCalendar';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { InfoNote } from '../../components/InfoNote';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useRewards } from '../../hooks/useRewards';
import { fetchRewardEligibleWorkoutDates, fetchWorkoutDatesInRange } from '../../lib/workouts';
import { todayISO } from '../../lib/analytics';
import { useAuthStore } from '../../state/authStore';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

function monthRange(dateString: string) {
  const [year, month] = dateString.split('-').map(Number);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  return { start, end };
}

export function RewardsScreen() {
  const { colors, spacing, typography } = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);

  const {
    weeklyStreak,
    rewardsEarned,
    weeksIntoCurrentCycle,
    weeksPerReward,
    weeklyTargetDays,
    loading: rewardsLoading,
    error: rewardsError,
    reload: reloadRewards,
  } = useRewards();
  const weeksToGo = weeksPerReward - weeksIntoCurrentCycle;

  const today = todayISO();
  const [calendarDate, setCalendarDate] = useState(today);
  const [loggedDates, setLoggedDates] = useState<string[]>([]);
  const [rewardEligibleDates, setRewardEligibleDates] = useState<string[]>([]);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  const loadCalendarMonth = useCallback(
    async (dateString: string) => {
      if (!userId) return;
      const { start, end } = monthRange(dateString);
      try {
        const [logged, eligible] = await Promise.all([
          fetchWorkoutDatesInRange(userId, start, end),
          fetchRewardEligibleWorkoutDates(userId, start, end),
        ]);
        setLoggedDates(logged);
        setRewardEligibleDates(eligible);
      } catch (err) {
        setCalendarError(err instanceof Error ? err.message : 'Failed to load your calendar');
      }
    },
    [userId]
  );

  useFocusEffect(
    useCallback(() => {
      loadCalendarMonth(calendarDate);
    }, [loadCalendarMonth, calendarDate])
  );

  return (
    <ScreenContainer>
      <InfoNote
        label="About reward eligibility"
        text="Only workouts logged on their actual day count toward rewards. A day added later through the calendar won't count, even if the workout really happened that day."
      />

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <GradientIconBadge icon="diamond" colors={gradients.reward} size={44} />
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

      {rewardsError || calendarError ? (
        <ErrorNotice message={rewardsError ?? calendarError ?? ''} onRetry={reloadRewards} />
      ) : null}

      <ActivityCalendar
        selectedDate={calendarDate}
        onDayPress={setCalendarDate}
        onMonthChange={setCalendarDate}
        markedDates={loggedDates}
        ringedDates={rewardEligibleDates}
        showEligibility
      />

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <GradientIconBadge icon="pricetag" colors={gradients.reward} size={40} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={[typography.subheading, { color: colors.textPrimary }]}>
              {rewardsEarned > 0
                ? `${rewardsEarned} reward${rewardsEarned === 1 ? '' : 's'} earned`
                : 'No rewards earned yet'}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {rewardsLoading
                ? 'Loading...'
                : `${weeksIntoCurrentCycle} of ${weeksPerReward} weeks toward your next 10% off, ${weeksToGo} more complete week${weeksToGo === 1 ? '' : 's'} to go.`}
            </Text>
          </View>
        </View>
      </Card>

      <Text style={[typography.caption, { color: colors.textMuted }]}>
        Rewards track your consistency now. Redeeming 10% off a premium membership isn&apos;t live yet;
        we&apos;ll let you know here as soon as it is.
      </Text>
    </ScreenContainer>
  );
}
