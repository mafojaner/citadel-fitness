import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { ScreenContainer } from '../../components/ScreenContainer';
import { deleteAccount } from '../../lib/account';
import { confirmAsync } from '../../lib/confirm';
import { useAuthStore } from '../../state/authStore';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { AccountStackParamList } from '../../navigation/stacks/AccountStack';

export function AccountManagementScreen() {
  const { colors, spacing, radius } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AccountStackParamList>>();
  const signOut = useAuthStore((s) => s.signOut);
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
    </ScreenContainer>
  );
}
