import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { FadeInView } from './FadeInView';
import { ProfileLoadBanner } from './ProfileLoadBanner';
import { FLOATING_TAB_BAR_CLEARANCE } from '../navigation/FloatingTabBar';
import { layout } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

export function ScreenContainer({ children }: PropsWithChildren) {
  const { colors, spacing } = useTheme();
  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { padding: spacing.md, paddingBottom: spacing.md + FLOATING_TAB_BAR_CLEARANCE },
      ]}
    >
      <FadeInView style={{ gap: spacing.md, width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' }}>
        <ProfileLoadBanner />
        {children}
      </FadeInView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    // Explicit rather than relying on the navigator's implicit full-screen
    // height — needed so this also fills correctly when composed as a
    // sibling below other content (e.g. LearnScreen's tab switcher) rather
    // than being the sole child of a stack screen.
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
