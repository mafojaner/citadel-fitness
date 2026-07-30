import { useState } from 'react';
import { Text } from 'react-native';
import { Card } from '../../components/Card';
import { GradientButton } from '../../components/GradientButton';
import { PasswordInput } from '../../components/PasswordInput';
import { PasswordRequirementsList } from '../../components/PasswordRequirementsList';
import { ScreenContainer } from '../../components/ScreenContainer';
import { isPasswordValid } from '../../lib/password';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme/useTheme';

export function ChangePasswordScreen() {
  const { colors } = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const passwordInvalid = password.length > 0 && !isPasswordValid(password);
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit = isPasswordValid(password) && password === confirmPassword;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    setSaved(false);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setPassword('');
    setConfirmPassword('');
    setSaved(true);
  };

  return (
    <ScreenContainer>
      <Card title="Change password">
        <PasswordInput
          placeholder="New password"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setSaved(false);
          }}
          hasError={passwordInvalid}
          backgroundColor={colors.background}
        />
        {password.length > 0 ? <PasswordRequirementsList password={password} /> : null}
        <PasswordInput
          placeholder="Confirm new password"
          value={confirmPassword}
          onChangeText={(t) => {
            setConfirmPassword(t);
            setSaved(false);
          }}
          hasError={mismatch}
          backgroundColor={colors.background}
        />
        {mismatch ? <Text style={{ color: colors.danger }}>Passwords don&apos;t match</Text> : null}
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
        {saved ? <Text style={{ color: colors.success }}>Password updated</Text> : null}
        <GradientButton
          label={submitting ? 'Saving...' : 'Update password'}
          loading={submitting}
          disabled={!canSubmit}
          onPress={onSubmit}
        />
      </Card>
    </ScreenContainer>
  );
}
