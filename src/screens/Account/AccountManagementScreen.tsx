import { Ionicons } from '@expo/vector-icons';
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

function DangerIconBadge({ icon, size = 36 }: { icon: keyof typeof Ionicons.glyphMap; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.danger,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={size * 0.5} color="#FFFFFF" />
    </View>
  );
}

export function AccountManagementScreen() {
  const { colors, spacing } = useTheme();
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
      <Pressable onPress={() => navigation.navigate('ChangePassword')}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <GradientIconBadge icon="lock-closed" colors={gradients.pulse} size={36} />
            <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>Change password</Text>
          </View>
        </Card>
      </Pressable>

      <Pressable onPress={onLogOut}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <DangerIconBadge icon="log-out-outline" />
            <Text style={{ color: colors.danger, fontWeight: '600' }}>Log out</Text>
          </View>
        </Card>
      </Pressable>

      {deleteError ? <Text style={{ color: colors.danger }}>{deleteError}</Text> : null}
      <Pressable
        onPress={onDeleteAccount}
        disabled={deleting}
        accessibilityRole="button"
        accessibilityLabel="Delete account"
        style={({ pressed }) => ({ opacity: pressed || deleting ? 0.6 : 1 })}
      >
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <DangerIconBadge icon="trash-outline" />
            {deleting ? (
              <ActivityIndicator color={colors.danger} />
            ) : (
              <Text style={{ color: colors.danger, fontWeight: '600' }}>Delete account</Text>
            )}
          </View>
        </Card>
      </Pressable>
    </ScreenContainer>
  );
}
