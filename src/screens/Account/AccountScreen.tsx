import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { ScreenContainer } from '../../components/ScreenContainer';
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
  const displayName = name || session?.user.email || 'Signed in user';
  const initial = displayName[0]?.toUpperCase();

  return (
    <ScreenContainer>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
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
