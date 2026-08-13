import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';
import { CustomBackButton } from './CustomBackButton';
import type { ThemeColors } from '../theme/tokens';

/**
 * headerBackground/headerTitle render plain JS elements in place of
 * native-stack's own headerStyle.backgroundColor / headerTitleStyle.color —
 * same fix as CustomBackButton, extended to the rest of the header, since
 * those native-painted properties share the same failure to repaint on a
 * live theme change (fine on first mount, stuck until the screen remounts).
 */
export function stackScreenOptions(colors: ThemeColors): NativeStackNavigationOptions {
  return {
    headerBackground: () => <View style={{ flex: 1, backgroundColor: colors.navBackground }} />,
    headerTintColor: colors.navText,
    headerTitle: ({ children }) => (
      <Text style={{ color: colors.navText, fontWeight: '700', fontSize: 22 }}>{children}</Text>
    ),
    headerShadowVisible: false,
    headerLeft: ({ canGoBack, tintColor }) =>
      canGoBack ? <CustomBackButton tintColor={tintColor} /> : null,
    animation: 'fade',
  };
}
