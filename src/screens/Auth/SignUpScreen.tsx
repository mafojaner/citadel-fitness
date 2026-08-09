import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { AuthScreenContainer } from '../../components/AuthScreenContainer';
import { AuthTextInput } from '../../components/AuthTextInput';
import { Card } from '../../components/Card';
import { GradientButton } from '../../components/GradientButton';
import { PasswordInput } from '../../components/PasswordInput';
import { PasswordRequirementsList } from '../../components/PasswordRequirementsList';
import { PRIVACY_POLICY_URL } from '../../constants/legal';
import { isEmailValid } from '../../lib/email';
import { isPasswordValid } from '../../lib/password';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme/useTheme';
import type { AuthStackParamList } from '../../navigation/stacks/AuthStack';

export function SignUpScreen() {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const trimmedEmail = email.trim();
  const emailInvalid = trimmedEmail.length > 0 && !isEmailValid(trimmedEmail);
  const passwordInvalid = password.length > 0 && !isPasswordValid(password);
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit =
    trimmedEmail.length > 0 && !emailInvalid && isPasswordValid(password) && password === confirmPassword;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setInfo(null);
    const { error: signUpError } = await supabase.auth.signUp({ email: trimmedEmail, password });
    if (signUpError) {
      setError(signUpError.message);
    } else {
      setInfo('Check your email to confirm your account.');
    }
    setSubmitting(false);
  };

  return (
    <AuthScreenContainer>
      <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
        Create an account to start logging.
      </Text>

      <Card>
        <AuthTextInput
          icon="mail-outline"
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          hasError={emailInvalid}
        />
        {emailInvalid ? <Text style={{ color: colors.danger }}>Enter a valid email address</Text> : null}

        <PasswordInput placeholder="Password" value={password} onChangeText={setPassword} hasError={passwordInvalid} />
        {password.length > 0 ? <PasswordRequirementsList password={password} /> : null}

        <PasswordInput
          placeholder="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          hasError={mismatch}
        />
        {mismatch ? <Text style={{ color: colors.danger }}>Passwords don&apos;t match</Text> : null}

        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
        {info ? <Text style={{ color: colors.success }}>{info}</Text> : null}

        <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>
          By creating an account, you agree to our{' '}
          <Text style={{ color: colors.primary }} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
            Privacy Policy
          </Text>
          .
        </Text>

        <View style={{ marginTop: spacing.xs }}>
          <GradientButton
            label={submitting ? 'Creating account...' : 'Sign up'}
            loading={submitting}
            disabled={!canSubmit}
            onPress={onSubmit}
          />
        </View>
      </Card>

      <AnimatedPressable
        onPress={() => navigation.navigate('SignIn')}
        accessibilityRole="link"
        accessibilityLabel="Already have an account? Sign in"
        scaleTo={0.96}
      >
        <Text style={{ color: colors.primary, textAlign: 'center' }}>
          Already have an account? Sign in
        </Text>
      </AnimatedPressable>
    </AuthScreenContainer>
  );
}
