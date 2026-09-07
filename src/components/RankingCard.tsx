import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { Card } from './Card';
import { IconWell } from './IconWell';
import { RankAvatar } from './RankAvatar';
import { useLeaderboard } from '../hooks/useLeaderboard';
import { useAuthStore } from '../state/authStore';
import { useTheme } from '../theme/useTheme';
import { iconInk } from '../theme/tokens';

interface RankingCardProps {
  /**
   * Where the card goes. The host owns the route and this owns the copy --
   * the same split FortressTodayCard uses, and the reason this could move
   * screens at all: the leaderboard lives in the Activity stack, so Home
   * reaches it through the tab and Activity reaches it directly.
   */
  onPress: () => void;
}

/**
 * This week's public ranking, as a card.
 *
 * Extracted from ActivityScreen, where it was a local function and
 * therefore stuck on that screen. It is a summary of where you stand rather
 * than a tool for looking into it, which is the same kind of thing the two
 * cards above it on Home are, so that is where it now sits.
 */
export function RankingCard({ onPress }: RankingCardProps) {
  const { colors, spacing, typography } = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { entries, loading, error } = useLeaderboard();

  const myRank = entries.findIndex((e) => e.userId === userId);
  const top = entries.slice(0, 3);

  return (
    <AnimatedPressable
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel="Open leaderboard"
    >
      {/* Card, where this was a hand-rolled View with its own shadow. That
          existed to clip an amber-to-white gradient wash and to carry a
          gold-tinted glow; both went when colour became the mark of a paid
          feature, and what was left was a description of Card. */}
      <Card style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, minWidth: 0 }}>
            <IconWell icon="trophy" size={44} tint={iconInk.amber} />
            <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
              <Text style={[typography.subheading, { color: colors.textPrimary }]}>Activity ranking</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                {loading
                  ? 'Loading...'
                  : error
                    ? "Couldn't load the ranking"
                    : entries.length === 0
                      ? 'Log a workout to enter this week'
                      : myRank >= 0
                        ? `You're #${myRank + 1} this week`
                        : `${entries.length} member${entries.length === 1 ? '' : 's'} ranked this week`}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>

        {!loading && !error && top.length > 0 ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-evenly' }}>
            {top.map((entry, index) => (
              <View key={entry.userId} style={{ alignItems: 'center', gap: spacing.xs, maxWidth: 92 }}>
                <RankAvatar rank={index + 1} avatarUrl={entry.avatarUrl} size={40} />
                <Text
                  style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}
                  numberOfLines={1}
                >
                  {entry.userId === userId ? 'You' : entry.displayName}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card>
    </AnimatedPressable>
  );
}
