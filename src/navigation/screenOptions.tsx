import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { CustomBackButton } from './CustomBackButton';
import type { ThemeColors } from '../theme/tokens';

export function stackScreenOptions(colors: ThemeColors): NativeStackNavigationOptions {
  return {
    headerStyle: { backgroundColor: colors.navBackground },
    headerTintColor: colors.navText,
    headerTitleStyle: { color: colors.navText, fontWeight: '700', fontSize: 22 },
    headerShadowVisible: false,
    headerLeft: ({ canGoBack, tintColor }) =>
      canGoBack ? <CustomBackButton tintColor={tintColor} /> : null,
    animation: 'fade',
  };
}
