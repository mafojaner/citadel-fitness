import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { ProfileLoadBanner } from './ProfileLoadBanner';

export function ScreenContainer({ children }: PropsWithChildren) {
  const { colors, spacing } = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { padding: spacing.md }]}
    >
      <View style={{ gap: spacing.md }}>
        <ProfileLoadBanner />
        {children}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
});
