import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { GradientButton } from '../../components/GradientButton';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme/useTheme';
import type { AuthStackParamList } from '../../navigation/stacks/AuthStack';

export function SignUpScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setInfo(null);
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
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
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          padding: spacing.md,
          color: colors.textPrimary,
        }}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
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
      {info ? <Text style={{ color: colors.success }}>{info}</Text> : null}

      <GradientButton
        label={submitting ? 'Creating account...' : 'Sign up'}
        loading={submitting}
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
