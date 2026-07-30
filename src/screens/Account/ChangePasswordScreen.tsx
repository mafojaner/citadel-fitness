import { useState } from 'react';
import { Text, TextInput } from 'react-native';
import { Card } from '../../components/Card';
import { GradientButton } from '../../components/GradientButton';
import { PasswordRequirementsList } from '../../components/PasswordRequirementsList';
import { ScreenContainer } from '../../components/ScreenContainer';
import { isPasswordValid } from '../../lib/password';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme/useTheme';

export function ChangePasswordScreen() {
  const { colors, spacing, radius } = useTheme();
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
        <TextInput
          placeholder="New password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setSaved(false);
          }}
          style={{
            backgroundColor: colors.background,
            borderColor: passwordInvalid ? colors.danger : colors.border,
            borderWidth: 1,
            borderRadius: radius.md,
            padding: spacing.md,
            color: colors.textPrimary,
          }}
        />
        {password.length > 0 ? <PasswordRequirementsList password={password} /> : null}
        <TextInput
          placeholder="Confirm new password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={confirmPassword}
          onChangeText={(t) => {
            setConfirmPassword(t);
            setSaved(false);
          }}
          style={{
            backgroundColor: colors.background,
            borderColor: mismatch ? colors.danger : colors.border,
            borderWidth: 1,
            borderRadius: radius.md,
            padding: spacing.md,
            color: colors.textPrimary,
          }}
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
