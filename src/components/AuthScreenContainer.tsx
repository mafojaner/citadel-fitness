import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { FadeInView } from './FadeInView';
import { useTheme } from '../theme/useTheme';

/**
 * The shared shell for every Auth screen (sign in/up, forgot/reset password).
 * Unlike ScreenContainer, this centers its content rather than starting at
 * the top, and wraps in KeyboardAvoidingView so the keyboard never covers a
 * field or the submit button on a small device.
 */
export function AuthScreenContainer({ children }: PropsWithChildren) {
  const { colors, spacing } = useTheme();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.lg }}
        keyboardShouldPersistTaps="handled"
      >
        <FadeInView style={{ gap: spacing.md }}>{children}</FadeInView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
