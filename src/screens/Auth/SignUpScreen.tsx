import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Linking, Pressable, Text, TextInput, View } from 'react-native';
import { GradientButton } from '../../components/GradientButton';
import { PasswordInput } from '../../components/PasswordInput';
import { PasswordRequirementsList } from '../../components/PasswordRequirementsList';
import { PRIVACY_POLICY_URL } from '../../constants/legal';
import { isPasswordValid } from '../../lib/password';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme/useTheme';
import type { AuthStackParamList } from '../../navigation/stacks/AuthStack';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignUpScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const trimmedEmail = email.trim();
  const emailInvalid = trimmedEmail.length > 0 && !EMAIL_PATTERN.test(trimmedEmail);
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
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        padding: spacing.lg,
        justifyContent: 'center',
        gap: spacing.md,
      }}
    >
      <Text style={[typography.title, { color: colors.textPrimary }]}>Create account</Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{
          backgroundColor: colors.surface,
          borderColor: emailInvalid ? colors.danger : colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          padding: spacing.md,
          color: colors.textPrimary,
        }}
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

      <GradientButton
        label={submitting ? 'Creating account...' : 'Sign up'}
        loading={submitting}
        disabled={!canSubmit}
        onPress={onSubmit}
      />

      <Pressable onPress={() => navigation.navigate('SignIn')}>
        <Text style={{ color: colors.primary, textAlign: 'center' }}>
          Already have an account? Sign in
        </Text>
      </Pressable>
    </View>
  );
}
