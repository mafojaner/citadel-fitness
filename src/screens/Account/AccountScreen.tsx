import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Pressable, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuthStore } from '../../state/authStore';
import { useProfileStore } from '../../state/profileStore';
import { useTheme } from '../../theme/useTheme';
import type { AccountStackParamList } from '../../navigation/stacks/AccountStack';

export function AccountScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AccountStackParamList>>();
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const name = useProfileStore((s) => s.name);
  const displayName = name || session?.user.email || 'Signed in user';
  const initial = displayName[0]?.toUpperCase();

  return (
    <ScreenContainer>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.primary, fontSize: 22, fontWeight: '700' }}>{initial}</Text>
          </View>
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
          <Text style={{ color: colors.textPrimary }}>Profile settings</Text>
        </Card>
      </Pressable>

      <Pressable onPress={() => navigation.navigate('Preferences')}>
        <Card>
          <Text style={{ color: colors.textPrimary }}>Preferences</Text>
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
    </ScreenContainer>
  );
}
