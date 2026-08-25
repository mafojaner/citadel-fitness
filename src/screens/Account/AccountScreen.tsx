import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import appJson from '../../../app.json';
import { PaidFeatureCard } from '../../components/PaidFeatureCard';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SettingsRow } from '../../components/SettingsRow';
import { SettingsSection } from '../../components/SettingsSection';
import { PRIVACY_POLICY_URL } from '../../constants/legal';
import { useAuthStore } from '../../state/authStore';
import { useProfileStore } from '../../state/profileStore';
import { useDataExport } from '../../hooks/useDataExport';
import { useMembershipTier } from '../../hooks/useMembership';
import { TIER_LABELS } from '../../lib/membership';
import { useThemeStore } from '../../state/themeStore';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { AccountStackParamList } from '../../navigation/stacks/AccountStack';

const THEME_LABELS = { system: 'System', light: 'Light', dark: 'Dark' } as const;

export function AccountScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AccountStackParamList>>();
  const session = useAuthStore((s) => s.session);
  const name = useProfileStore((s) => s.name);
  const avatarUrl = useProfileStore((s) => s.avatarUrl);
  const preferences = useProfileStore((s) => s.preferences);
  const themeMode = useThemeStore((s) => s.mode);
  const displayName = name || session?.user.email || 'Signed in user';
  const initial = displayName[0]?.toUpperCase();
  // Shared with PersonalRecordsScreen, which offers the same export beside
  // the records it covers. The outcome wording has to match what the
  // platform actually did, so it lives in one place rather than two.
  const { exporting, result: exportResult, run: onExport } = useDataExport();
  const currentTier = useMembershipTier();

  return (
    <ScreenContainer>
      <Pressable
        onPress={() => navigation.navigate('ProfileSettings')}
        accessibilityRole="button"
        accessibilityLabel="Edit your profile"
      >
        {({ pressed }) => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: StyleSheet.hairlineWidth,
              borderRadius: radius.md,
              padding: spacing.md,
              opacity: pressed ? 0.7 : 1,
            }}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ width: 56, height: 56, borderRadius: 28 }} />
            ) : (
              <LinearGradient
                colors={gradients.identity}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700' }}>{initial}</Text>
              </LinearGradient>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[typography.subheading, { color: colors.textPrimary }]} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
                {session?.user.email ?? ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        )}
      </Pressable>

      <SettingsSection title="Preferences">
        <SettingsRow
          icon="color-palette"
          iconColors={gradients.calendar}
          title="Appearance"
          value={THEME_LABELS[themeMode]}
          onPress={() => navigation.navigate('Appearance')}
        />
        <SettingsRow
          icon="barbell"
          iconColors={gradients.volume}
          title="Units"
          value={`${preferences.units} · ${preferences.distanceUnit}`}
          onPress={() => navigation.navigate('Units')}
        />
        <SettingsRow
          icon="notifications"
          iconColors={gradients.flame}
          title="Notifications"
          subtitle="Workout reminders and newsletter alerts"
          onPress={() => navigation.navigate('Notifications')}
        />
      </SettingsSection>

      {/* Above account management on purpose: this is the row someone comes
          to Account looking for, and it is where the payment portal will
          live once there is something to buy. It states the plan you are on
          rather than only offering to show you the others, so the common
          case — "what am I actually on?" — is answered without a tap. */}
      <SettingsSection title="Membership">
        <SettingsRow
          icon="pricetags"
          iconColors={gradients.identity}
          title="Plans"
          subtitle="Compare Free, Fortress and Valhalla"
          value={TIER_LABELS[currentTier]}
          onPress={() => navigation.navigate('Plans')}
        />
      </SettingsSection>

      <SettingsSection title="Account">
        <SettingsRow
          icon="settings"
          iconColors={gradients.pulse}
          title="Account management"
          subtitle="Password, sign out, delete account"
          onPress={() => navigation.navigate('AccountManagement')}
        />
      </SettingsSection>

      {/* Its own section rather than a row inside Account management: export
          is about getting data out, not about the account's credentials or
          deletion. Row variant so it reads as one of this screen's settings
          rows — the section already draws the surface a card would double. */}
      <SettingsSection title="Your data">
        <PaidFeatureCard
          featureId="data-export"
          variant="row"
          onOpen={exporting ? () => {} : onExport}
        />
      </SettingsSection>
      {exporting ? (
        <Text style={[typography.caption, { color: colors.textMuted }]}>Preparing your export…</Text>
      ) : exportResult ? (
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{exportResult}</Text>
      ) : null}

      {/* early-access and priority-support are account-wide policies with no
          content of their own to attach to — nowhere on Home, Activity or
          Learn is any more "theirs" than here. offline-sync joins them for
          the same reason: it's a background capability, not a screen. */}
      {/* Not "Fortress perks": this list has always mixed the tiers, and now
          that there are two paid ones the old title claimed Valhalla's
          perks for Fortress. Each row already names the tier that includes
          it, so the section header doesn't have to. */}
      <SettingsSection title="Membership perks">
        <PaidFeatureCard featureId="priority-support" variant="row" />
        <PaidFeatureCard featureId="early-access" variant="row" />
        <PaidFeatureCard featureId="offline-sync" variant="row" />
        {/* Built — the switch itself lives with the other email settings,
            so members land where they'd expect to turn it off again. */}
        <PaidFeatureCard
          featureId="weekly-digest"
          variant="row"
          onOpen={() => navigation.navigate('Notifications')}
        />
        <PaidFeatureCard featureId="wearable-sync" variant="row" />
        <PaidFeatureCard
          featureId="referral"
          variant="row"
          onOpen={() => navigation.navigate('Referral')}
        />
      </SettingsSection>

      <SettingsSection title="Support">
        <SettingsRow
          icon="help-buoy"
          iconColors={gradients.favorite}
          title="Help & feedback"
          subtitle="FAQs, and a direct line to the team"
          onPress={() => navigation.navigate('Help')}
        />
      </SettingsSection>

      <SettingsSection title="About">
        <SettingsRow
          icon="shield-checkmark"
          iconColors={gradients.identity}
          title="Privacy policy"
          onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
        />
        <SettingsRow
          icon="information-circle"
          iconColors={gradients.action}
          title="Version"
          value={appJson.expo.version}
        />
      </SettingsSection>
    </ScreenContainer>
  );
}
