import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { GradientButton } from './GradientButton';
import { GradientNumberBadge } from './GradientNumberBadge';
import { GradientPill } from './GradientPill';
import { useArmedAction } from '../hooks/useArmedAction';
import { useAuthStore } from '../state/authStore';
import {
  CHALLENGE_LENGTHS,
  CHALLENGE_METRICS,
  cancelGroupChallenge,
  createGroupChallenge,
  metricUnit,
  type ChallengeMetric,
  type GroupChallenge,
} from '../lib/groupChallenges';
import { gradients } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

const RANK_GRADIENTS = [gradients.rankGold, gradients.rankSilver, gradients.rankBronze];

interface GroupChallengeCardProps {
  groupId: string;
  challenge: GroupChallenge | null;
  onChanged: () => void;
}

/**
 * The challenge the plans page has been selling.
 *
 * What shipped was a rolling 7/30/90-day window that resets every day and
 * never concludes -- so nothing was ever won and there was no reason to come
 * back on a particular day. This has the three things that window lacked: a
 * name, an end, and a result that stays visible after it closes.
 *
 * Sits inside the group card rather than on its own, because a challenge
 * belongs to exactly one group and a panel floating above several would
 * leave you guessing which.
 */
export function GroupChallengeCard({ groupId, challenge, onChanged }: GroupChallengeCardProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);
  const [composing, setComposing] = useState(false);
  const [name, setName] = useState('');
  const [metric, setMetric] = useState<ChallengeMetric>('days');
  const [lengthDays, setLengthDays] = useState(CHALLENGE_LENGTHS[0].days);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    if (!userId || name.trim().length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await createGroupChallenge(groupId, userId, name.trim(), metric, lengthDays);
      setName('');
      setComposing(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start that challenge');
    } finally {
      setBusy(false);
    }
  }, [userId, groupId, name, metric, lengthDays, onChanged]);

  const cancel = useCallback(async () => {
    if (!challenge) return;
    setBusy(true);
    setError(null);
    try {
      await cancelGroupChallenge(challenge.id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not call that off');
    } finally {
      setBusy(false);
    }
  }, [challenge, onChanged]);

  // Declared after `cancel`, which it takes as its argument. Disarms itself
  // after a few seconds, like every other destructive control in the app now
  // does.
  const { armed: confirmingCancel, trigger: triggerCancel } = useArmedAction(cancel);

  const panel = {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  } as const;

  // ---------------------------------------------------------------- form
  if (composing || !challenge) {
    return (
      <View style={panel}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="flash" size={14} color={colors.primary} />
          <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', letterSpacing: 0.8 }}>
            CHALLENGE
          </Text>
        </View>

        {!composing ? (
          <>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              A challenge is the standings with an end date. Pick what counts and how long
              it runs, and whoever is top when it closes wins it.
            </Text>
            <GradientButton
              label="Start a challenge"
              variant="outline"
              onPress={() => setComposing(true)}
            />
          </>
        ) : (
          <>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name it — “October Push”"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Challenge name"
              style={{
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radius.md,
                padding: spacing.md,
                color: colors.textPrimary,
              }}
            />

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {CHALLENGE_METRICS.map((m) => (
                <GradientPill
                  key={m.value}
                  label={m.label}
                  active={metric === m.value}
                  onPress={() => setMetric(m.value)}
                />
              ))}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {CHALLENGE_LENGTHS.map((l) => (
                <GradientPill
                  key={l.label}
                  label={l.label}
                  active={lengthDays === l.days}
                  onPress={() => setLengthDays(l.days)}
                />
              ))}
            </View>

            {error ? (
              <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text>
            ) : null}

            <GradientButton
              label={busy ? 'Starting…' : 'Start it'}
              loading={busy}
              disabled={name.trim().length === 0 || busy}
              onPress={start}
            />
            <GradientButton
              label="Cancel"
              variant="outline"
              onPress={() => {
                setComposing(false);
                setError(null);
              }}
            />
          </>
        )}
      </View>
    );
  }

  // ------------------------------------------------------------ standings
  const unit = metricUnit(challenge.metric);
  const leader = challenge.standings[0];
  // Only a real score wins. A challenge everyone sat out has no winner, and
  // announcing the alphabetically-first member as one would be worse than
  // saying nothing.
  const hasWinner = challenge.finished && leader && leader.score > 0;

  return (
    <View style={panel}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Ionicons
          name={challenge.finished ? 'flag-outline' : 'flash'}
          size={16}
          color={challenge.finished ? colors.textMuted : colors.primary}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[typography.subheading, { color: colors.textPrimary }]} numberOfLines={1}>
            {challenge.name}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {challenge.finished
              ? `Finished · ${CHALLENGE_METRICS.find((m) => m.value === challenge.metric)?.label}`
              : `${challenge.daysLeft} day${challenge.daysLeft === 1 ? '' : 's'} left · ${
                  CHALLENGE_METRICS.find((m) => m.value === challenge.metric)?.label
                }`}
          </Text>
        </View>
      </View>

      {hasWinner ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            backgroundColor: colors.primaryMuted,
            borderRadius: radius.md,
            padding: spacing.sm,
          }}
        >
          <Ionicons name="trophy" size={16} color={colors.primary} />
          <Text style={[typography.body, { flex: 1, minWidth: 0, color: colors.primary, fontWeight: '700' }]}>
            {leader.name} won with {leader.score} {unit}
          </Text>
        </View>
      ) : null}

      {challenge.standings.map((standing, index) => (
        <View
          key={standing.user_id}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
        >
          <GradientNumberBadge
            value={index + 1}
            colors={RANK_GRADIENTS[index] ?? gradients.action}
            size={26}
            fontSize={12}
          />
          <Text
            style={[
              typography.body,
              {
                flex: 1,
                minWidth: 0,
                color: colors.textPrimary,
                fontWeight: standing.user_id === userId ? '800' : '400',
              },
            ]}
            numberOfLines={1}
          >
            {standing.name}
            {standing.user_id === userId ? ' (you)' : ''}
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            {standing.score} {unit}
          </Text>
        </View>
      ))}

      {error ? <Text style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}

      {challenge.finished ? (
        <GradientButton
          label="Start another"
          variant="outline"
          onPress={() => setComposing(true)}
        />
      ) : challenge.startedByMe ? (
        // Two taps, like every other destructive control in the app: calling
        // off a running challenge deletes it for everyone in the group.
        <GradientButton
          label={confirmingCancel ? 'Tap again to call it off' : 'Call it off'}
          variant="outline"
          disabled={busy}
          onPress={triggerCancel}
        />
      ) : null}
    </View>
  );
}
