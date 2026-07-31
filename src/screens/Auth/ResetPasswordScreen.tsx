import { useState } from 'react';
import { Text } from 'react-native';
import { AuthScreenContainer } from '../../components/AuthScreenContainer';
import { GradientButton } from '../../components/GradientButton';
import { PasswordInput } from '../../components/PasswordInput';
import { PasswordRequirementsList } from '../../components/PasswordRequirementsList';
import { isPasswordValid } from '../../lib/password';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme/useTheme';

interface ResetPasswordScreenProps {
  onDone: () => void;
}

export function ResetPasswordScreen({ onDone }: ResetPasswordScreenProps) {
  const { colors, typography } = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const passwordInvalid = password.length > 0 && !isPasswordValid(password);
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit = isPasswordValid(password) && password === confirmPassword;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    onDone();
  };

  return (
    <AuthScreenContainer>
      <Text style={[typography.title, { color: colors.textPrimary }]}>Set a new password</Text>
      <Text style={[typography.body, { color: colors.textSecondary }]}>
        Choose a new password for your account.
      </Text>

      <PasswordInput placeholder="New password" value={password} onChangeText={setPassword} hasError={passwordInvalid} />
      {password.length > 0 ? <PasswordRequirementsList password={password} /> : null}

      <PasswordInput
        placeholder="Confirm new password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        hasError={mismatch}
      />

      {mismatch ? <Text style={{ color: colors.danger }}>Passwords don&apos;t match</Text> : null}
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

      <GradientButton
        label={submitting ? 'Saving...' : 'Save new password'}
        loading={submitting}
        disabled={!canSubmit}
        onPress={onSubmit}
      />
    </AuthScreenContainer>
  );
}
