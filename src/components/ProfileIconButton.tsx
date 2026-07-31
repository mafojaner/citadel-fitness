import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { useProfileStore } from '../state/profileStore';
import { useTheme } from '../theme/useTheme';

type RootStackParamList = {
  Account: undefined;
};

const SIZE = 38;

export function ProfileIconButton() {
  const { colors, spacing } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const avatarUrl = useProfileStore((s) => s.avatarUrl);

  return (
    <AnimatedPressable
      accessibilityLabel="Open account"
      hitSlop={8}
      onPress={() => navigation.navigate('Account')}
      scaleTo={0.88}
      style={{ marginRight: spacing.md }}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            backgroundColor: colors.surface,
            borderWidth: 1.5,
            borderColor: 'rgba(255, 90, 54, 0.55)',
          }}
        />
      ) : (
        <Ionicons name="person-circle" size={SIZE} color={colors.navText} />
      )}
    </AnimatedPressable>
  );
}
