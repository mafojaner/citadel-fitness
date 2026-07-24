import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useTheme } from '../theme/useTheme';

type RootStackParamList = {
  Account: undefined;
};

export function ProfileIconButton() {
  const { colors, spacing } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Pressable
      accessibilityLabel="Open account"
      hitSlop={8}
      onPress={() => navigation.navigate('Account')}
      style={({ pressed }) => ({ marginRight: spacing.md, opacity: pressed ? 0.6 : 1 })}
    >
      <Ionicons name="person-circle" size={30} color={colors.navText} />
    </Pressable>
  );
}
