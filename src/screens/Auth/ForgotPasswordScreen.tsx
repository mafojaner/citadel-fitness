import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { GradientButton } from '../../components/GradientButton';
import { getPasswordResetRedirectUrl, supabase } from '../../lib/supabase';
import { useTheme } from '../../theme/useTheme';
import type { AuthStackParamList } from '../../navigation/stacks/AuthStack';

export function ForgotPasswordScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: getPasswordResetRedirectUrl(),
    });
    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }
    setSubmitting(false);
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        padding: spacing.lg,
        justifyContent: 'center',
        gap: spacing.md,
      }}
    >
      <Text style={[typography.title, { color: colors.textPrimary }]}>Reset password</Text>
      <Text style={[typography.body, { color: colors.textSecondary }]}>
        Enter your email and we&apos;ll send you a link to reset your password.
      </Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        editable={!sent}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          padding: spacing.md,
          color: colors.textPrimary,
        }}
      />

      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
      {sent ? (
        <Text style={{ color: colors.success }}>
          Check your email for a link to reset your password.
        </Text>
      ) : null}

      {sent ? (
        <GradientButton label="Back to sign in" onPress={() => navigation.navigate('SignIn')} />
      ) : (
        <GradientButton
          label={submitting ? 'Sending...' : 'Send reset link'}
          loading={submitting}
          onPress={onSubmit}
        />
      )}

      {!sent ? (
        <Pressable onPress={() => navigation.navigate('SignIn')}>
          <Text style={{ color: colors.primary, textAlign: 'center' }}>Back to sign in</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
