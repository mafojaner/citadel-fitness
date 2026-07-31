import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { FadeInView } from './FadeInView';
import { ProfileLoadBanner } from './ProfileLoadBanner';
import { useTheme } from '../theme/useTheme';

export function ScreenContainer({ children }: PropsWithChildren) {
  const { colors, spacing } = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { padding: spacing.md }]}
    >
      <FadeInView style={{ gap: spacing.md }}>
        <ProfileLoadBanner />
        {children}
      </FadeInView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
});
