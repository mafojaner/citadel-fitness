import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { GradientButton } from '../../components/GradientButton';
import { PasswordRequirementsList } from '../../components/PasswordRequirementsList';
import { isPasswordValid } from '../../lib/password';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme/useTheme';

interface ResetPasswordScreenProps {
  onDone: () => void;
}

export function ResetPasswordScreen({ onDone }: ResetPasswordScreenProps) {
  const { colors, spacing, radius, typography } = useTheme();
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
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        padding: spacing.lg,
        justifyContent: 'center',
        gap: spacing.md,
      }}
    >
      <Text style={[typography.title, { color: colors.textPrimary }]}>Set a new password</Text>
      <Text style={[typography.body, { color: colors.textSecondary }]}>
        Choose a new password for your account.
      </Text>

      <TextInput
        placeholder="New password"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{
          backgroundColor: colors.surface,
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
        onChangeText={setConfirmPassword}
        style={{
          backgroundColor: colors.surface,
          borderColor: mismatch ? colors.danger : colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          padding: spacing.md,
          color: colors.textPrimary,
        }}
      />

      {mismatch ? <Text style={{ color: colors.danger }}>Passwords don&apos;t match</Text> : null}
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

      <GradientButton
        label={submitting ? 'Saving...' : 'Save new password'}
        loading={submitting}
        disabled={!canSubmit}
        onPress={onSubmit}
      />
    </View>
  );
}
