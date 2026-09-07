import { ActivityIndicator, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { DayActivityCard } from '../../components/DayActivityCard';
import { ErrorNotice } from '../../components/ErrorNotice';
import { HeaderSearchBar } from '../../components/HeaderSearchBar';
import { PendingSyncNotice } from '../../components/PendingSyncNotice';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useActivityFeed } from '../../hooks/useActivityFeed';
import { todayISO } from '../../lib/analytics';
import { useTheme } from '../../theme/useTheme';

/**
 * Home is a record of what you have done: one card per day, newest first,
 * carrying everything logged on that day.
 *
 * It used to be a hub -- a log button, two summary cards, a category grid,
 * and whichever paid teaser was current. Every one of those was a way to go
 * somewhere else, on the screen you see most, and none of them showed you
 * what you had actually done. They have gone to the places that own them:
 * logging is the centre tab, the Fortress and nutrition cards and the water
 * control are on Workouts, and browsing exercises is the Search tab.
 *
 * What is left is deliberately read-only. Nothing here edits anything, so
 * there is one place to change a day and a separate place to look back at
 * them.
 *
 * Days with nothing on them are not rendered. A feed of empty cards would
 * be a feed of cards saying nothing, and the gap between two entries
 * already says a week was missed.
 */
export function HomeScreen() {
  const { colors, spacing, typography } = useTheme();
  const { days, loading, error, reload } = useActivityFeed();
  const today = todayISO();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderSearchBar title="Home" showSearch={false} />
      <ScreenContainer>
        {/* Kept, though nothing else was. It draws nothing while the queue
            is empty, which is almost always, and what it reports is work
            that has not reached the server yet -- the one thing on this
            screen that is not simply a record of the past. */}
        <PendingSyncNotice />

        {loading && days.length === 0 ? (
          <ActivityIndicator color={colors.primary} />
        ) : error ? (
          <ErrorNotice message={error} onRetry={reload} />
        ) : days.length === 0 ? (
          <Card>
            <Text style={[typography.subheading, { color: colors.textPrimary }]}>Nothing logged yet</Text>
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>
              Days you train will show up here, newest first, with every set you logged. Tap the
              plus in the middle of the bar below to log your first one.
            </Text>
          </Card>
        ) : (
          days.map((day) => <DayActivityCard key={day.date} day={day} today={today} />)
        )}
      </ScreenContainer>
    </View>
  );
}
