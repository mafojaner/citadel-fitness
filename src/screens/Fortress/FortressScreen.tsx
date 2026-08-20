import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { GradientButton } from '../../components/GradientButton';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { ScreenContainer } from '../../components/ScreenContainer';
import { APP_FEATURES } from '../../constants/featureCatalog';
import { tierAllows } from '../../lib/membership';
import { useFortressWaitlist } from '../../hooks/useFortressWaitlist';
import { isEmailValid } from '../../lib/email';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

// Everything paid, not just Fortress: the grid is the pitch for upgrading
// at all, and hiding the top tier's features would undersell it.
const FEATURES = APP_FEATURES.filter((feature) => feature.tier !== 'free');

// Derived by tier comparison rather than hardcoded booleans, so a feature
// moving between tiers updates every column at once — the drift this
// catalogue exists to prevent.
const COMPARISON_ROWS: { label: string; free: boolean; fortress: boolean; keep: boolean }[] =
  APP_FEATURES.filter((feature) => feature.showInComparison).map((feature) => ({
    label: feature.title,
    free: tierAllows('free', feature.tier),
    fortress: tierAllows('fortress', feature.tier),
    keep: tierAllows('keep', feature.tier),
  }));

function ComparisonMark({
  on,
  colors,
  width = 28,
}: {
  on: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
  width?: number;
}) {
  return (
    <View style={{ width, alignItems: 'center' }}>
      <Ionicons
        name={on ? 'checkmark-circle' : 'remove-circle-outline'}
        size={18}
        color={on ? colors.primary : colors.textMuted}
      />
    </View>
  );
}

interface WaitlistActionProps {
  accountEmail: string | undefined;
  joined: boolean;
  joinedEmail: string | undefined;
  loading: boolean;
  joining: boolean;
  leaving: boolean;
  error: string | null;
  onJoin: (email: string) => void;
  onLeave: () => void;
}

/** The join-the-waitlist control, shared by the top card and the closing CTA. */
function WaitlistAction({
  accountEmail,
  joined,
  joinedEmail,
  loading,
  joining,
  leaving,
  error,
  onJoin,
  onLeave,
}: WaitlistActionProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const [showForm, setShowForm] = useState(false);
  const [emailInput, setEmailInput] = useState(accountEmail ?? '');
  const [alreadyJoinedNotice, setAlreadyJoinedNotice] = useState(false);

  if (loading) {
    return <ActivityIndicator color={colors.primary} />;
  }

  const handlePress = () => {
    if (joined) {
      setAlreadyJoinedNotice(true);
      return;
    }
    setShowForm(true);
  };

  const trimmedEmail = emailInput.trim();
  const emailInvalid = trimmedEmail.length > 0 && !isEmailValid(trimmedEmail);
  // Once joined, the form should never show again — the button reappears as a
  // plain "check your status" affordance instead of a way to resubmit.
  const showingForm = showForm && !joined;

  return (
    <View style={{ gap: spacing.sm }}>
      {joined ? (
        <View
          style={{
            gap: spacing.sm,
            backgroundColor: `${colors.success}1A`,
            borderWidth: 1,
            borderColor: colors.success,
            borderRadius: radius.md,
            padding: spacing.md,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.success,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="checkmark" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={[typography.subheading, { color: colors.textPrimary }]}>You&apos;re on the list!</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                We&apos;ll email {joinedEmail ?? accountEmail ?? 'you'} the moment Fortress launches.
              </Text>
            </View>
          </View>
          <AnimatedPressable onPress={onLeave} disabled={leaving} scaleTo={0.96}>
            <Text style={[typography.caption, { color: colors.textMuted, textDecorationLine: 'underline' }]}>
              {leaving ? 'Leaving…' : 'Wrong email? Leave the waitlist and rejoin'}
            </Text>
          </AnimatedPressable>
          {error ? <ErrorNotice message={error} onRetry={onLeave} /> : null}
        </View>
      ) : null}

      {showingForm ? (
        <View style={{ gap: spacing.sm }}>
          <TextInput
            placeholder="Email address"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={emailInput}
            onChangeText={setEmailInput}
            editable={!joining}
            style={{
              backgroundColor: colors.surface,
              borderColor: emailInvalid ? colors.danger : colors.border,
              borderWidth: 1,
              borderRadius: radius.md,
              padding: spacing.md,
              color: colors.textPrimary,
            }}
          />
          {emailInvalid ? <Text style={{ color: colors.danger }}>Enter a valid email address</Text> : null}
          {error ? <ErrorNotice message={error} onRetry={() => onJoin(trimmedEmail)} /> : null}
          <GradientButton
            label={joining ? 'Signing up...' : 'Notify me'}
            colors={gradients.identity}
            loading={joining}
            disabled={!trimmedEmail || emailInvalid}
            onPress={() => onJoin(trimmedEmail)}
          />
        </View>
      ) : (
        <GradientButton label="Join the waitlist" colors={gradients.identity} onPress={handlePress} />
      )}

      {alreadyJoinedNotice && joined ? (
        <Text style={[typography.caption, { color: colors.success }]}>
          You&apos;re already signed up, sit tight, we&apos;ll be in touch.
        </Text>
      ) : null}
    </View>
  );
}

export function FortressScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const { accountEmail, joined, joinedEmail, loading, joining, leaving, error, join, leave } =
    useFortressWaitlist();

  return (
    <ScreenContainer>
      <LinearGradient
        colors={gradients.identity}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: radius.lg,
          padding: spacing.lg,
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: 'rgba(255,255,255,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialCommunityIcons name="chess-rook" size={34} color="#FFFFFF" />
        </View>
        <Text style={{ color: '#FFFFFF', fontSize: 26, fontWeight: '800' }}>Fortress</Text>
        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, textAlign: 'center' }}>
          Everything Citadel Fitness can be: training intelligence, coaching, and rewards, all in one
          membership.
        </Text>
      </LinearGradient>

      <Card title="Reserve your spot">
        <WaitlistAction
          accountEmail={accountEmail}
          joined={joined}
          joinedEmail={joinedEmail}
          loading={loading}
          joining={joining}
          leaving={leaving}
          error={error}
          onJoin={join}
          onLeave={leave}
        />
      </Card>

      <Text style={[typography.subheading, { color: colors.textPrimary }]}>What Fortress will unlock</Text>
      <View style={{ gap: spacing.sm }}>
        {FEATURES.map((feature) => (
          <Card key={feature.title}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <GradientIconBadge icon={feature.icon} colors={feature.colors} size={40} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={[typography.subheading, { color: colors.textPrimary }]}>{feature.title}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {feature.description}
                </Text>
              </View>
            </View>
          </Card>
        ))}
      </View>

      <Card title="Compare tiers">
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[typography.caption, { flex: 1, color: colors.textMuted }]} />
            <Text style={[typography.caption, { width: 28, textAlign: 'center', color: colors.textMuted }]}>
              Free
            </Text>
            <Text style={[typography.caption, { width: 52, textAlign: 'center', color: colors.primary }]}>
              Fortress
            </Text>
            <Text style={[typography.caption, { width: 36, textAlign: 'center', color: colors.primary }]}>
              Keep
            </Text>
          </View>
          {COMPARISON_ROWS.map((row) => (
            <View
              key={row.label}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingTop: spacing.sm,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <Text style={[typography.body, { flex: 1, minWidth: 0, color: colors.textPrimary }]}>
                {row.label}
              </Text>
              <ComparisonMark on={row.free} colors={colors} />
              <ComparisonMark on={row.fortress} colors={colors} width={52} />
              <ComparisonMark on={row.keep} colors={colors} width={36} />
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <GradientIconBadge icon="diamond" colors={gradients.favorite} size={40} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={[typography.subheading, { color: colors.textPrimary }]}>Earn your way in</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Log a workout 4 days a week for 4 weeks straight to unlock 10% off, applied automatically
              once Fortress launches. Track your streak on the Activity tab.
            </Text>
          </View>
        </View>
      </Card>

      <WaitlistAction
        accountEmail={accountEmail}
        joined={joined}
        joinedEmail={joinedEmail}
        loading={loading}
        joining={joining}
        leaving={leaving}
        error={error}
        onJoin={join}
        onLeave={leave}
      />
      <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
        Join the members already signed up to train smarter with Fortress.
      </Text>
    </ScreenContainer>
  );
}
