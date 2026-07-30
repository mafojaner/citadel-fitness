import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Text } from 'react-native';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SettingsRow } from '../../components/SettingsRow';
import { SettingsSection } from '../../components/SettingsSection';
import { deleteAccount } from '../../lib/account';
import { confirmAsync } from '../../lib/confirm';
import { useAuthStore } from '../../state/authStore';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { AccountStackParamList } from '../../navigation/stacks/AccountStack';

export function AccountManagementScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AccountStackParamList>>();
  const signOut = useAuthStore((s) => s.signOut);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const onLogOut = async () => {
    const confirmed = await confirmAsync(
      'Log out?',
      "You'll need to sign back in to see your workouts and progress.",
      'Log out'
    );
    if (!confirmed) return;
    await signOut();
  };

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
      <SettingsSection title="Security">
        <SettingsRow
          icon="lock-closed"
          iconColors={gradients.pulse}
          title="Change password"
          onPress={() => navigation.navigate('ChangePassword')}
        />
      </SettingsSection>

      {deleteError ? <Text style={{ color: colors.danger }}>{deleteError}</Text> : null}

      <SettingsSection title="Danger zone">
        <SettingsRow icon="log-out-outline" danger title="Log out" onPress={onLogOut} />
        <SettingsRow
          icon="trash-outline"
          danger
          title="Delete account"
          loading={deleting}
          disabled={deleting}
          onPress={onDeleteAccount}
        />
      </SettingsSection>
    </ScreenContainer>
  );
}
