import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { ScreenContainer } from '../../components/ScreenContainer';
import { PRIVACY_POLICY_URL } from '../../constants/legal';
import { deleteAccount } from '../../lib/account';
import { confirmAsync } from '../../lib/confirm';
import { useAuthStore } from '../../state/authStore';
import { useProfileStore } from '../../state/profileStore';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { AccountStackParamList } from '../../navigation/stacks/AccountStack';

export function AccountScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AccountStackParamList>>();
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const name = useProfileStore((s) => s.name);
  const avatarUrl = useProfileStore((s) => s.avatarUrl);
  const displayName = name || session?.user.email || 'Signed in user';
  const initial = displayName[0]?.toUpperCase();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const onDeleteAccount = async () => {
    const confirmed = await confirmAsync(
      'Delete account?',
      "This permanently deletes your account, workout history, streaks, and profile — including your photo. There's no way to undo this or recover your data afterward.",
      'Delete account'
    );
    if (!confirmed) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      await signOut();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account');
      setDeleting(false);
    }
  };

  return (
    <ScreenContainer>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
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
          <View>
            <Text style={[typography.subheading, { color: colors.textPrimary }]}>{displayName}</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {session?.user.email ?? ''}
            </Text>
          </View>
        </View>
      </Card>

      <Pressable onPress={() => navigation.navigate('ProfileSettings')}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <GradientIconBadge icon="person" colors={gradients.identity} size={36} />
            <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>Profile settings</Text>
          </View>
        </Card>
      </Pressable>

      <Pressable onPress={() => navigation.navigate('Preferences')}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <GradientIconBadge icon="options" colors={gradients.calendar} size={36} />
            <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>Preferences</Text>
          </View>
        </Card>
      </Pressable>

      <Pressable onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <GradientIconBadge icon="shield-checkmark" colors={gradients.identity} size={36} />
            <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>Privacy policy</Text>
          </View>
        </Card>
      </Pressable>

      <View style={{ gap: spacing.sm, marginTop: spacing.lg }}>
        <Text style={[typography.caption, { color: colors.textMuted }]}>ACCOUNT MANAGEMENT</Text>

        <Pressable onPress={() => navigation.navigate('ChangePassword')}>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <GradientIconBadge icon="lock-closed" colors={gradients.pulse} size={36} />
              <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>Change password</Text>
            </View>
          </Card>
        </Pressable>

        <Pressable
          onPress={() => signOut()}
          style={({ pressed }) => ({
            borderColor: colors.danger,
            borderWidth: 1,
            borderRadius: radius.md,
            padding: spacing.md,
            alignItems: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ color: colors.danger, fontWeight: '700' }}>Log out</Text>
        </Pressable>

        {deleteError ? <Text style={{ color: colors.danger }}>{deleteError}</Text> : null}
        <Pressable
          onPress={onDeleteAccount}
          disabled={deleting}
          accessibilityRole="button"
          accessibilityLabel="Delete account"
          style={({ pressed }) => ({
            backgroundColor: 'transparent',
            borderRadius: radius.md,
            padding: spacing.md,
            alignItems: 'center',
            opacity: pressed || deleting ? 0.6 : 1,
          })}
        >
          {deleting ? (
            <ActivityIndicator color={colors.danger} />
          ) : (
            <Text style={{ color: colors.danger, fontWeight: '600' }}>Delete account</Text>
          )}
        </Pressable>
      </View>
    </ScreenContainer>
  );
}
