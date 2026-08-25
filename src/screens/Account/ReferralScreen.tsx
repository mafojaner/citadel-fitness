import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Share, Text, TextInput, View } from 'react-native';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { GradientButton } from '../../components/GradientButton';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { ScreenContainer } from '../../components/ScreenContainer';
import { StatChip } from '../../components/StatChip';
import { useReferrals } from '../../hooks/useReferrals';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

export function ReferralScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const { summary, loading, busy, error, reload, redeem } = useReferrals();
  const [code, setCode] = useState('');

  const onShare = async () => {
    if (!summary) return;
    // React Native's own Share rather than expo-sharing: this is a string,
    // not a file, and Share is the one that reaches messaging apps.
    await Share.share({
      message: `Join me on Citadel Fitness. Use my code ${summary.code} when you sign up.`,
    });
  };

  const pending = summary?.referred.filter((r) => r.status === 'pending').length ?? 0;

  return (
    <ScreenContainer>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : error && !summary ? (
        <ErrorNotice message={error} onRetry={reload} />
      ) : summary ? (
        <>
          <Card title="Your code">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <GradientIconBadge icon="gift" colors={gradients.favorite} size={44} />
              <Text
                style={[
                  typography.title,
                  { color: colors.textPrimary, letterSpacing: 2, flex: 1, minWidth: 0 },
                ]}
                accessibilityLabel={`Your referral code is ${summary.code.split('').join(' ')}`}
              >
                {summary.code}
              </Text>
            </View>
            <GradientButton label="Share my code" onPress={onShare} />
          </Card>

          {/* Stated plainly rather than buried: the reward this feature
              advertises depends on memberships being purchasable, and they
              aren't yet. Recording a claim and saying nothing about when
              it pays out would be the dishonest version of this screen. */}
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
              <Ionicons name="time-outline" size={18} color={colors.textMuted} />
              <Text style={[typography.caption, { color: colors.textSecondary, flex: 1, minWidth: 0 }]}>
                Referrals are being recorded now, but the free month can&apos;t be granted until
                memberships go on sale. Everyone you refer before then is queued and will be
                honoured when they do.
              </Text>
            </View>
          </Card>

          <Card title="People you've referred">
            {summary.referred.length === 0 ? (
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                Nobody yet. Share your code and they&apos;ll appear here.
              </Text>
            ) : (
              <>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                  <StatChip icon="people-outline" value={`${summary.referred.length} joined`} />
                  {pending > 0 ? (
                    <StatChip icon="hourglass-outline" value={`${pending} reward${pending === 1 ? '' : 's'} pending`} />
                  ) : null}
                </View>
                {/* Deliberately no names or emails: someone who used your
                    code hasn't agreed to be listed to you by name. */}
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Shown as a count rather than a list, because people who use your code aren&apos;t
                  identified to you.
                </Text>
              </>
            )}
          </Card>

          <Card title="Were you referred?">
            {summary.redeemedCode ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={[typography.body, { color: colors.textSecondary }]}>
                  You joined with code{' '}
                  <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                    {summary.redeemedCode}
                  </Text>
                  .
                </Text>
              </View>
            ) : (
              <>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Enter a friend&apos;s code. You can only do this once.
                </Text>
                <TextInput
                  value={code}
                  onChangeText={(t) => setCode(t.toUpperCase())}
                  placeholder="ABC1234"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  accessibilityLabel="Friend's referral code"
                  style={{
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: radius.md,
                    padding: spacing.md,
                    color: colors.textPrimary,
                  }}
                />
                {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
                <GradientButton
                  label={busy ? 'Checking...' : 'Redeem code'}
                  loading={busy}
                  disabled={code.trim().length === 0 || busy}
                  onPress={async () => {
                    const ok = await redeem(code.trim());
                    if (ok) setCode('');
                  }}
                />
              </>
            )}
          </Card>
        </>
      ) : null}
    </ScreenContainer>
  );
}
