import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { FadeInView } from './FadeInView';
import { FloatingLogo } from './FloatingLogo';
import { layout } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/**
 * The shared shell for every Auth screen (sign in/up, forgot/reset password).
 * Unlike ScreenContainer, this centers its content rather than starting at
 * the top, wraps in KeyboardAvoidingView so the keyboard never covers a
 * field or the submit button on a small device, and carries the app's
 * branding (floating crest + name) so every screen in the flow reads as
 * Citadel Fitness instead of a bare form.
 */
export function AuthScreenContainer({ children }: PropsWithChildren) {
  const { colors, spacing, typography } = useTheme();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <FadeInView style={{ gap: spacing.md, width: '100%', maxWidth: layout.formMaxWidth, alignSelf: 'center' }}>
          <View style={{ alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm }}>
            <FloatingLogo size={88} />
            <Text style={[typography.title, { color: colors.textPrimary }]}>Citadel Fitness</Text>
          </View>
          {children}
        </FadeInView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
