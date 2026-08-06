import { useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileIconButton } from './ProfileIconButton';
import { SearchField } from './SearchField';
import { useTheme } from '../theme/useTheme';

interface HeaderSearchBarProps {
  title: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
}

/**
 * Stands in for the native-stack header on the 5 tab-root screens. Native
 * stack (v7) has no `headerTitleContainerStyle`/`headerLeftContainerStyle`
 * equivalent, and forces the title alignment to center on iOS regardless of
 * `headerTitleAlign` — there's no supported way to get a title+search row
 * that stretches to fill the space between an empty left slot and
 * `headerRight`. Rendering our own row (with `headerShown: false` on these
 * screens) gives full, consistent flex control across web/iOS/Android.
 */
export function HeaderSearchBar({ title, placeholder = 'Search...', value, onChangeText }: HeaderSearchBarProps) {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [localQuery, setLocalQuery] = useState('');
  const query = value ?? localQuery;
  const setQuery = onChangeText ?? setLocalQuery;

  return (
    <View
      style={{
        backgroundColor: colors.navBackground,
        paddingTop: insets.top + spacing.sm,
        paddingBottom: spacing.sm,
        paddingHorizontal: spacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text
          style={[typography.heading, { color: colors.navText, fontWeight: '700', flexShrink: 0 }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <View style={{ flex: 1 }}>
          <SearchField placeholder={placeholder} value={query} onChangeText={setQuery} />
        </View>
        <ProfileIconButton />
      </View>
    </View>
  );
}
