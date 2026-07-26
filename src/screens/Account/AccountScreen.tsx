import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Linking, Pressable, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { ScreenContainer } from '../../components/ScreenContainer';
import { PRIVACY_POLICY_URL } from '../../constants/legal';
import { useAuthStore } from '../../state/authStore';
import { useProfileStore } from '../../state/profileStore';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { AccountStackParamList } from '../../navigation/stacks/AccountStack';

export function AccountScreen() {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AccountStackParamList>>();
  const session = useAuthStore((s) => s.session);
  const name = useProfileStore((s) => s.name);
  const avatarUrl = useProfileStore((s) => s.avatarUrl);
  const displayName = name || session?.user.email || 'Signed in user';
  const initial = displayName[0]?.toUpperCase();

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

      <Pressable onPress={() => navigation.navigate('AccountManagement')}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <GradientIconBadge icon="settings" colors={gradients.pulse} size={36} />
            <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>Account management</Text>
          </View>
        </Card>
      </Pressable>
    </ScreenContainer>
  );
}
