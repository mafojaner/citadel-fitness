import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import appJson from '../../../app.json';
import { PaidFeatureCard } from '../../components/PaidFeatureCard';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SettingsRow } from '../../components/SettingsRow';
import { SettingsSection } from '../../components/SettingsSection';
import { PRIVACY_POLICY_URL, TERMS_URL } from '../../constants/legal';
import { useDataExport } from '../../hooks/useDataExport';
import { useMembershipTier } from '../../hooks/useMembership';
import { useIsDesktop } from '../../hooks/useResponsiveLayout';
import { TIER_LABELS } from '../../lib/membership';
import { useAuthStore } from '../../state/authStore';
import { useProfileStore } from '../../state/profileStore';
import { useThemeStore } from '../../state/themeStore';
import { stalledCount, useOfflineQueueStore } from '../../state/offlineQueueStore';
import { MAX_ATTEMPTS, type PendingSave } from '../../lib/offlineQueue';
import { PlainButton } from '../../components/PlainButton';
import { confirmAsync } from '../../lib/confirm';
import { useTheme } from '../../theme/useTheme';
import type { AccountStackParamList } from '../../navigation/stacks/AccountStack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { AccountManagementScreen } from './AccountManagementScreen';
import { AppearanceScreen } from './AppearanceScreen';
import { HelpScreen } from './HelpScreen';
import { NotificationsScreen } from './NotificationsScreen';
import { ProfileSettingsScreen } from './ProfileSettingsScreen';
import { UnitsScreen } from './UnitsScreen';
import { SETTINGS_GROUPS, SETTINGS_ITEMS, type SettingsSectionId } from './settingsCatalogue';

const THEME_LABELS = { system: 'System', light: 'Light', dark: 'Dark' } as const;

/** Width of the settings rail. Narrower than the app's nav sidebar, which carries the brand too. */
const RAIL_WIDTH = 232;

/** Whose account this is, shown above the settings on both layouts. */
function ProfileHeader({ onPress }: { onPress: () => void }) {
  const { colors, spacing, radius, typography } = useTheme();
  const session = useAuthStore((s) => s.session);
  const name = useProfileStore((s) => s.name);
  const avatarUrl = useProfileStore((s) => s.avatarUrl);

  const displayName = name || session?.user.email || 'Signed in user';
  const initial = displayName[0]?.toUpperCase();

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Edit your profile">
      {({ pressed }) => (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: StyleSheet.hairlineWidth,
            borderRadius: radius.lg,
            padding: spacing.md,
            opacity: pressed ? 0.7 : 1,
          }}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={{ width: 56, height: 56, borderRadius: 28 }} />
          ) : (
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.background,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '700' }}>{initial}</Text>
            </View>
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
  );
}

/**
 * One settings row, used by both layouts so they look the same.
 *
 * Selected reads as a grey pill, matching the app's nav sidebar. The phone
 * never selects — it pushes — so there it shows a chevron instead, which is
 * the one honest difference between the two: on desktop the row swaps the
 * pane beside it, on a phone it opens a new screen, and the affordance
 * should say which.
 */
function RailItem({
  label,
  icon,
  selected,
  value,
  chevron,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  value?: string;
  chevron?: boolean;
  onPress: () => void;
}) {
  const { colors, spacing, radius, typography, scheme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={(state) => {
        const hovered = (state as { hovered?: boolean }).hovered ?? false;
        return {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: selected
            ? colors.border
            : hovered
              ? scheme === 'dark'
                ? colors.surface
                : colors.background
              : 'transparent',
        };
      }}
    >
      <Ionicons name={icon} size={18} color={colors.textSecondary} style={{ width: 22, textAlign: 'center' }} />
      <Text
        style={[
          typography.body,
          { flex: 1, minWidth: 0, color: colors.textPrimary, fontWeight: selected ? '700' : '500' },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {value ? (
        <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {chevron ? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

/** The uppercase heading above each group, shared so both layouts space it identically. */
function GroupHeading({ label }: { label: string }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <Text
      style={[
        typography.caption,
        {
          color: colors.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          paddingHorizontal: spacing.sm,
          marginTop: spacing.xs,
        },
      ]}
    >
      {label}
    </Text>
  );
}

/**
 * One queued workout, with the two things a person can actually do about it.
 *
 * The queue was previously able to tell someone a save was stuck and offer
 * nothing else, which is a worse state than not telling them: it names a
 * problem and hands over no way out. Retrying is the answer when the cause
 * has passed, and discarding is the answer when it has not — a save the
 * server refuses will be refused forever, and its owner should be able to
 * clear it rather than watch a permanent badge.
 */
function PendingUploadRow({
  item,
  onRetry,
  onDiscard,
}: {
  item: PendingSave;
  onRetry: () => void;
  onDiscard: () => void;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  const stalled = item.attempts >= MAX_ATTEMPTS;
  const exerciseCount = Array.isArray(item.payload.p_exercises) ? item.payload.p_exercises.length : 0;

  return (
    <View
      style={{
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: stalled ? colors.danger : colors.border,
        borderRadius: radius.md,
        padding: spacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Ionicons
          name={stalled ? 'alert-circle-outline' : 'cloud-upload-outline'}
          size={18}
          color={stalled ? colors.danger : colors.textSecondary}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>
            {item.date}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {exerciseCount} exercise{exerciseCount === 1 ? '' : 's'}
            {stalled
              ? ' · not accepted'
              : item.attempts === 0
                ? ' · waiting to upload'
                : ` · retrying, attempt ${item.attempts + 1}`}
          </Text>
        </View>
      </View>

      {/* The server's own words. A generic "it didn't work" would leave
          someone with no way to tell a dead connection from a real refusal,
          which are the two cases with completely different answers. */}
      {stalled && item.lastError ? (
        <Text style={[typography.caption, { color: colors.textMuted }]}>{item.lastError}</Text>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <PlainButton label="Try now" variant="outline" onPress={onRetry} />
        </View>
        <View style={{ flex: 1 }}>
          <PlainButton label="Discard" danger onPress={onDiscard} />
        </View>
      </View>
    </View>
  );
}

/**
 * The account centre.
 *
 * Two layouts of the same catalogue. On a phone it is a list of rows that
 * push a screen, which is the only thing that fits. On desktop it is the
 * master-detail shape a settings dialog takes: a grouped rail on the left
 * and the section itself rendered beside it, so moving between Appearance
 * and Notifications changes one pane rather than pushing and popping the
 * whole window.
 *
 * The detail pane reuses the very screens the phone pushes rather than a
 * second desktop-only copy of each. They are still inside the Account stack
 * here, so anything that navigates onward from one of them keeps working.
 */
export function AccountScreen() {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AccountStackParamList>>();
  const isDesktop = useIsDesktop();
  const currentTier = useMembershipTier();
  const themeMode = useThemeStore((s) => s.mode);
  const preferences = useProfileStore((s) => s.preferences);
  // Shared with PersonalRecordsScreen, which offers the same export beside
  // the records it covers. The outcome wording has to match what the
  // platform actually did, so it lives in one place rather than two.
  const { exporting, result: exportResult, run: onExport } = useDataExport();
  const pending = useOfflineQueueStore((state) => state.queue);
  const pendingSaves = pending.length;
  const retryUploads = useOfflineQueueStore((state) => state.flush);
  const discardUpload = useOfflineQueueStore((state) => state.discard);
  const stalledSaves = useOfflineQueueStore((state) => stalledCount(state.queue));
  const [section, setSection] = useState<SettingsSectionId>('profile');

  // Discarding throws away a workout the person logged, which nothing else
  // will bring back, so it asks first. Same treatment as removing an avatar,
  // which is the app's other irreversible small action.
  const onDiscardUpload = async (item: PendingSave) => {
    const confirmed = await confirmAsync(
      'Discard this workout?',
      `The workout saved for ${item.date} has not reached the server and will be lost. This cannot be undone.`,
      'Discard'
    );
    if (confirmed) discardUpload(item.id);
  };

  // On desktop Plans is a tab, and pushing this stack's copy would cover the
  // sidebar that tab exists to keep on screen. Two dispatches: goBack() pops
  // this stack off the root, navigate() then selects the tab underneath.
  const openPlansTab = () => {
    const root = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
    root?.goBack();
    root?.navigate('Main', { screen: 'Plans' });
  };

  /** The value shown on the right of a row, where the row has one worth showing. */
  const valueFor = (id: SettingsSectionId) =>
    id === 'appearance'
      ? THEME_LABELS[themeMode]
      : id === 'units'
        ? `${preferences.units} · ${preferences.distanceUnit}`
        : id === 'plans'
          ? TIER_LABELS[currentTier]
          : undefined;

  const uploadsPane = (
    <ScreenContainer>
      <SettingsSection
        title="Pending uploads"
        footer="Workouts saved with no signal upload themselves when you are back online. Nothing here means everything has reached the server."
      >
        <View style={{ padding: spacing.md, gap: spacing.sm }}>
          {pending.length === 0 ? (
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              Everything is uploaded.
            </Text>
          ) : (
            pending.map((item) => (
              <PendingUploadRow
                key={item.id}
                item={item}
                onRetry={retryUploads}
                onDiscard={() => onDiscardUpload(item)}
              />
            ))
          )}
        </View>
      </SettingsSection>
    </ScreenContainer>
  );

  const dataPane = (
    <ScreenContainer>
      {/* Its own section rather than a row inside Account management: export
          is about getting data out, not about the account's credentials or
          deletion. */}
      <SettingsSection title="Your data">
        <PaidFeatureCard featureId="data-export" variant="row" onOpen={exporting ? () => {} : onExport} />
      </SettingsSection>
      {exporting ? (
        <Text style={[typography.caption, { color: colors.textMuted }]}>Preparing your export…</Text>
      ) : exportResult ? (
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{exportResult}</Text>
      ) : null}
    </ScreenContainer>
  );

  const perksPane = (
    <ScreenContainer>
      {/* early-access and priority-support are account-wide policies with no
          content of their own to attach to: nowhere on Home, Activity or
          Learn is any more "theirs" than here. offline-sync joins them for
          the same reason, being a background capability rather than a screen. */}
      <SettingsSection title="Membership perks">
        {/* Opens Help & feedback, which is where the feature actually is.
            Priority support is not a screen — it is a property of the
            queue behind that form, and the member's message going to the
            front of it. Without this it read "Coming soon" to someone whose
            messages were already being answered first, which is the same
            mistake offline sync made until it was given a status. */}
        <PaidFeatureCard
          featureId="priority-support"
          variant="row"
          onOpen={() => navigation.navigate('Help')}
        />
        <PaidFeatureCard featureId="early-access" variant="row" />
        {/* Built, but with no screen of its own: it reports its own state
            instead. The waiting count is the only visible evidence the
            feature exists, so it is worth showing rather than a flat "On". */}
        <PaidFeatureCard
          featureId="offline-sync"
          variant="row"
          status={
            pendingSaves === 0
              ? 'On'
              : `${pendingSaves} waiting${stalledSaves > 0 ? `, ${stalledSaves} stuck` : ''}`
          }
        />
        {/* Built: the switch itself lives with the other email settings, so
            members land where they'd expect to turn it off again. */}
        <PaidFeatureCard
          featureId="weekly-digest"
          variant="row"
          onOpen={() => navigation.navigate('Notifications')}
        />
        <PaidFeatureCard featureId="wearable-sync" variant="row" />
        <PaidFeatureCard featureId="referral" variant="row" onOpen={() => navigation.navigate('Referral')} />
      </SettingsSection>
    </ScreenContainer>
  );

  const aboutPane = (
    <ScreenContainer>
      <SettingsSection title="About">
        <SettingsRow
          icon="shield-checkmark"
          title="Privacy policy"
          onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
        />
        <SettingsRow
          icon="document-text"
          title="Terms of service"
          onPress={() => Linking.openURL(TERMS_URL)}
        />
        <SettingsRow icon="information-circle" title="Version" value={appJson.expo.version} />
      </SettingsSection>
    </ScreenContainer>
  );

  const detailFor = (id: SettingsSectionId) => {
    switch (id) {
      case 'profile':
        return <ProfileSettingsScreen />;
      case 'appearance':
        return <AppearanceScreen />;
      case 'units':
        return <UnitsScreen />;
      case 'notifications':
        return <NotificationsScreen />;
      case 'account':
        return <AccountManagementScreen />;
      case 'help':
        return <HelpScreen />;
      case 'perks':
        return perksPane;
      case 'uploads':
        return uploadsPane;
      case 'data':
        return dataPane;
      case 'about':
        return aboutPane;
      // Plans is a tab on desktop and never renders in this pane; the rail
      // item navigates to it instead. Cased so the switch stays exhaustive.
      case 'plans':
        return null;
    }
  };

  // ---- phone: the same rows, full width, pushing instead of selecting ----
  if (!isDesktop) {
    return (
      <ScreenContainer>
        <ProfileHeader onPress={() => navigation.navigate('ProfileSettings')} />

        {SETTINGS_GROUPS.map((group) => (
          <View key={group} style={{ gap: spacing.xs }}>
            <GroupHeading label={group} />
            {SETTINGS_ITEMS.filter((item) => item.group === group).map((item) => (
              <RailItem
                key={item.id}
                label={item.label}
                icon={item.icon}
                // A phone opens the section rather than selecting it, so
                // nothing here is ever the "current" row.
                selected={false}
                value={valueFor(item.id)}
                chevron
                onPress={() => (item.route ? navigation.navigate(item.route) : setSection(item.id))}
              />
            ))}
          </View>
        ))}

        {/* The three sections with no screen of their own open in place
            underneath, since a phone has nowhere else to put them. */}
        {section === 'perks' ? perksPane : null}
        {section === 'uploads' ? uploadsPane : null}
        {section === 'data' ? dataPane : null}
        {section === 'about' ? aboutPane : null}
      </ScreenContainer>
    );
  }

  // ---- desktop: rail on the left, the section itself on the right ----
  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.background }}>
      <ScrollView
        style={{
          width: RAIL_WIDTH,
          borderRightWidth: 1,
          borderRightColor: colors.border,
          backgroundColor: colors.surface,
        }}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.xs }}
      >
        <View style={{ marginBottom: spacing.sm }}>
          <ProfileHeader onPress={() => setSection('profile')} />
        </View>

        {SETTINGS_GROUPS.map((group) => (
          <View key={group} style={{ gap: spacing.xs, marginBottom: spacing.sm }}>
            <GroupHeading label={group} />
            {SETTINGS_ITEMS.filter((item) => item.group === group).map((item) => (
              <RailItem
                key={item.id}
                label={item.label}
                icon={item.icon}
                selected={section === item.id}
                onPress={() => (item.id === 'plans' ? openPlansTab() : setSection(item.id))}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      <View style={{ flex: 1, minWidth: 0 }}>{detailFor(section)}</View>
    </View>
  );
}
