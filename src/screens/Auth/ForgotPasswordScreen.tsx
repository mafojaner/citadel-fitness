import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { AuthScreenContainer } from '../../components/AuthScreenContainer';
import { AuthTextInput } from '../../components/AuthTextInput';
import { Card } from '../../components/Card';
import { GradientButton } from '../../components/GradientButton';
import { getPasswordResetRedirectUrl, supabase } from '../../lib/supabase';
import { useTheme } from '../../theme/useTheme';
import type { AuthStackParamList } from '../../navigation/stacks/AuthStack';

export function ForgotPasswordScreen() {
  const { colors, spacing, typography } = useTheme();
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
    <AuthScreenContainer>
      <View style={{ gap: 4 }}>
        <Text style={[typography.heading, { color: colors.textPrimary, textAlign: 'center' }]}>
          Reset password
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
          Enter your email and we&apos;ll send you a link to reset your password.
        </Text>
      </View>

      <Card>
        <AuthTextInput
          icon="mail-outline"
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!sent}
        />

        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
        {sent ? (
          <Text style={{ color: colors.success }}>
            Check your email for a link to reset your password.
          </Text>
        ) : null}

        <View style={{ marginTop: spacing.xs }}>
          {sent ? (
            <GradientButton label="Back to sign in" onPress={() => navigation.navigate('SignIn')} />
          ) : (
            <GradientButton
              label={submitting ? 'Sending...' : 'Send reset link'}
              loading={submitting}
              onPress={onSubmit}
            />
          )}
        </View>
      </Card>

      {!sent ? (
        <AnimatedPressable
          onPress={() => navigation.navigate('SignIn')}
          accessibilityRole="link"
          accessibilityLabel="Back to sign in"
          scaleTo={0.96}
        >
          <Text style={{ color: colors.primary, textAlign: 'center' }}>Back to sign in</Text>
        </AnimatedPressable>
      ) : null}
    </AuthScreenContainer>
  );
}
