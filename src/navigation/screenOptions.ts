import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { ThemeColors } from '../theme/tokens';

export function stackScreenOptions(colors: ThemeColors): NativeStackNavigationOptions {
  return {
    headerStyle: { backgroundColor: colors.navBackground },
    headerTintColor: colors.navText,
    headerTitleStyle: { color: colors.navText, fontWeight: '700' },
    headerShadowVisible: false,
  };
}
