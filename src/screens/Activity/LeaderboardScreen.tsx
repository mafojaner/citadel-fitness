import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { InfoNote } from '../../components/InfoNote';
import { RankAvatar } from '../../components/RankAvatar';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { useAuthStore } from '../../state/authStore';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { LeaderboardEntry } from '../../lib/leaderboard';

/** Center-tallest podium order: 2nd, 1st, 3rd. */
const PODIUM_ORDER = [1, 0, 2];
const PODIUM_HEIGHTS = { 0: 96, 1: 72, 2: 56 } as const;
const PODIUM_AVATAR_SIZES = { 0: 64, 1: 48, 2: 48 } as const;
const PODIUM_GRADIENTS = [gradients.rankGold, gradients.rankSilver, gradients.rankBronze] as const;

function PodiumSlot({ entry, index, isMe }: { entry: LeaderboardEntry; index: number; isMe: boolean }) {
  const { colors, spacing, radius, typography } = useTheme();

  return (
    <View style={{ flex: 1, alignItems: 'center', gap: spacing.xs }}>
      <RankAvatar rank={index + 1} avatarUrl={entry.avatarUrl} size={PODIUM_AVATAR_SIZES[index as 0 | 1 | 2]} />
      <Text
        style={[typography.caption, { color: colors.textPrimary, fontWeight: '700', maxWidth: 88 }]}
        numberOfLines={1}
      >
        {isMe ? 'You' : entry.displayName}
      </Text>
      <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>
        {entry.daysLogged}/7 days
      </Text>
      <LinearGradient
        colors={PODIUM_GRADIENTS[index]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          width: '100%',
          height: PODIUM_HEIGHTS[index as 0 | 1 | 2],
          borderTopLeftRadius: radius.md,
          borderTopRightRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: spacing.xs,
        }}
      >
        <Text style={{ color: 'rgba(0,0,0,0.35)', fontWeight: '800', fontSize: 20 }}>{index + 1}</Text>
      </LinearGradient>
    </View>
  );
}

export function LeaderboardScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { entries, loading, error, reload } = useLeaderboard();

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <ScreenContainer>
      <InfoNote
        label="How ranking works"
        text="Ranked by distinct days logged in the last 7 — same-day only, so backdated entries don't count. Not a total-volume leaderboard, just consistency."
      />

      {error ? <ErrorNotice message={error} onRetry={reload} /> : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : entries.length === 0 ? (
        <Card>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Nobody has logged a workout in the last 7 days yet. Be the first.
          </Text>
        </Card>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
            {PODIUM_ORDER.filter((i) => i < podium.length).map((i) => (
              <PodiumSlot key={podium[i].userId} entry={podium[i]} index={i} isMe={podium[i].userId === userId} />
            ))}
          </View>

          {rest.length > 0 ? (
            <Card>
              <View style={{ gap: spacing.sm }}>
                {rest.map((entry, i) => {
                  const rank = i + 4;
                  const isMe = entry.userId === userId;
                  return (
                    <View
                      key={entry.userId}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.sm,
                        paddingVertical: spacing.xs,
                        paddingHorizontal: spacing.sm,
                        borderRadius: radius.md,
                        backgroundColor: isMe ? colors.primaryMuted : 'transparent',
                      }}
                    >
                      <View style={{ width: 24, alignItems: 'center' }}>
                        <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '700' }]}>
                          {rank}
                        </Text>
                      </View>

                      <RankAvatar rank={rank} avatarUrl={entry.avatarUrl} size={32} />

                      <Text
                        style={[
                          typography.body,
                          { color: colors.textPrimary, flex: 1, minWidth: 0, fontWeight: isMe ? '700' : '500' },
                        ]}
                        numberOfLines={1}
                      >
                        {isMe ? 'You' : entry.displayName}
                      </Text>

                      <Text style={[typography.caption, { color: colors.textSecondary }]}>
                        {entry.daysLogged}/7 days
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>
          ) : null}
        </>
      )}
    </ScreenContainer>
  );
}
