import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Pressable } from 'react-native';

/**
 * Native-stack's default back button renders a platform-native image
 * (react-native-screens) whose tint doesn't reliably re-render on a live
 * theme change on iOS/Android — it takes a screen remount to pick up the
 * new color. A plain JS-rendered icon re-renders like any other component.
 */
export function CustomBackButton({ tintColor }: { tintColor?: string }) {
  const navigation = useNavigation();

  return (
    <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ padding: 4 }}>
      <Ionicons name="chevron-back" size={26} color={tintColor} />
    </Pressable>
  );
}
