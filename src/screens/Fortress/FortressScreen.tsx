import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { GradientButton } from '../../components/GradientButton';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useFortressWaitlist } from '../../hooks/useFortressWaitlist';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

interface FortressFeature {
  icon: keyof typeof Ionicons.glyphMap;
  colors: readonly [string, string, ...string[]];
  title: string;
  description: string;
}

const FEATURES: FortressFeature[] = [
  {
    icon: 'sparkles',
    colors: gradients.identity,
    title: 'AI progressive overload',
    description: 'A smarter weight and rep suggestion for every set, tuned to how your last session actually went.',
  },
  {
    icon: 'trending-up',
    colors: gradients.volume,
    title: 'Advanced analytics',
    description: 'Muscle-group balance, volume trends, and an estimated one-rep max for every lift you log.',
  },
  {
    icon: 'trophy',
    colors: gradients.flame,
    title: 'Personal records vault',
    description: 'Every PR tracked automatically, with a full history so you can see exactly how far you have come.',
  },
  {
    icon: 'nutrition',
    colors: gradients.pulse,
    title: 'Nutrition coaching',
    description: 'Macro targets built around your training load, adjusted automatically as your program changes.',
  },
  {
    icon: 'videocam',
    colors: gradients.action,
    title: 'Form check reviews',
    description: 'Submit a set on video and get feedback from a real coach within 48 hours.',
  },
  {
    icon: 'cloud-done',
    colors: gradients.calendar,
    title: 'Offline mode & sync',
    description: 'Log a workout anywhere, no signal required — everything syncs the moment you are back online.',
  },
  {
    icon: 'book',
    colors: gradients.arms,
    title: 'Expert guide library',
    description: 'In-depth programs and technique breakdowns written by coaches, with new guides added monthly.',
  },
  {
    icon: 'people',
    colors: gradients.favorite,
    title: 'Friends & leaderboards',
    description: 'Compare streaks and PRs with friends, and see where you rank in the Fortress community.',
  },
  {
    icon: 'flash',
    colors: gradients.identity,
    title: 'Early access',
    description: 'New features land in your hands first, weeks before they reach everyone else.',
  },
  {
    icon: 'headset',
    colors: gradients.pulse,
    title: 'Priority support',
    description: 'Skip the queue — Fortress members get a same-day response from our team, every time.',
  },
];

const COMPARISON_ROWS: { label: string; free: boolean; fortress: boolean }[] = [
  { label: 'Workout logging & catalogue', free: true, fortress: true },
  { label: 'Streaks & activity charts', free: true, fortress: true },
  { label: 'AI progressive overload', free: false, fortress: true },
  { label: 'Advanced analytics & 1RM', free: false, fortress: true },
  { label: 'Nutrition coaching', free: false, fortress: true },
  { label: 'Form check video reviews', free: false, fortress: true },
  { label: 'Friends & leaderboards', free: false, fortress: true },
  { label: 'Priority support', free: false, fortress: true },
];

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
  email: string | undefined;
  joined: boolean;
  loading: boolean;
  joining: boolean;
  error: string | null;
  onJoin: () => void;
}

/** The join-the-waitlist control, shared by the top card and the closing CTA. */
function WaitlistAction({ email, joined, loading, joining, error, onJoin }: WaitlistActionProps) {
  const { colors, spacing, typography } = useTheme();

  if (loading) {
    return <ActivityIndicator color={colors.primary} />;
  }

  if (joined) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        <Text style={[typography.body, { flex: 1, minWidth: 0, color: colors.textPrimary }]}>
          You&apos;re on the list — we&apos;ll email {email ?? 'you'} the moment Fortress launches.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      {error ? <ErrorNotice message={error} onRetry={onJoin} /> : null}
      <GradientButton
        label={joining ? 'Signing up...' : `Notify me at ${email ?? 'my email'}`}
        colors={gradients.identity}
        loading={joining}
        onPress={onJoin}
      />
    </View>
  );
}

export function FortressScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const { email, joined, loading, joining, error, join } = useFortressWaitlist();

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
        <View
          style={{
            backgroundColor: 'rgba(0,0,0,0.25)',
            paddingHorizontal: spacing.sm,
            paddingVertical: 4,
            borderRadius: radius.pill,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 11, letterSpacing: 0.4 }}>
            IN DEVELOPMENT — NOT YET AVAILABLE
          </Text>
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, textAlign: 'center' }}>
          Everything Citadel Fitness can be — training intelligence, coaching, and rewards, all in one
          membership. We&apos;re still building it.
        </Text>
      </LinearGradient>

      <Card title="Get notified at launch">
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Fortress isn&apos;t live yet and nothing is billed today — sign up and we&apos;ll email your
          account address the moment it&apos;s ready.
        </Text>
        <WaitlistAction
          email={email}
          joined={joined}
          loading={loading}
          joining={joining}
          error={error}
          onJoin={join}
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

      <Card title="Free vs Fortress">
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[typography.caption, { flex: 1, color: colors.textMuted }]} />
            <Text style={[typography.caption, { width: 28, textAlign: 'center', color: colors.textMuted }]}>
              Free
            </Text>
            <Text style={[typography.caption, { width: 44, textAlign: 'center', color: colors.primary }]}>
              Fortress
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
              <ComparisonMark on={row.fortress} colors={colors} width={44} />
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
        email={email}
        joined={joined}
        loading={loading}
        joining={joining}
        error={error}
        onJoin={join}
      />
      <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
        Join the members already signed up to train smarter with Fortress.
      </Text>
    </ScreenContainer>
  );
}
