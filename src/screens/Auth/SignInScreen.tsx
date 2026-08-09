import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { AuthScreenContainer } from '../../components/AuthScreenContainer';
import { AuthTextInput } from '../../components/AuthTextInput';
import { Card } from '../../components/Card';
import { GradientButton } from '../../components/GradientButton';
import { PasswordInput } from '../../components/PasswordInput';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../theme/useTheme';
import type { AuthStackParamList } from '../../navigation/stacks/AuthStack';

export function SignInScreen() {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError(signInError.message);
    setSubmitting(false);
  };

  return (
    <AuthScreenContainer>
      <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
        Sign in to keep your streak going.
      </Text>

      <Card>
        <AuthTextInput
          icon="mail-outline"
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <PasswordInput placeholder="Password" value={password} onChangeText={setPassword} />

        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

        <AnimatedPressable
          onPress={() => navigation.navigate('ForgotPassword')}
          accessibilityRole="link"
          accessibilityLabel="Forgot password?"
          scaleTo={0.96}
        >
          <Text style={{ color: colors.primary, textAlign: 'right' }}>Forgot password?</Text>
        </AnimatedPressable>

        <View style={{ marginTop: spacing.xs }}>
          <GradientButton
            label={submitting ? 'Signing in...' : 'Sign in'}
            loading={submitting}
            onPress={onSubmit}
          />
        </View>
      </Card>

      <AnimatedPressable
        onPress={() => navigation.navigate('SignUp')}
        accessibilityRole="link"
        accessibilityLabel="Don't have an account? Sign up"
        scaleTo={0.96}
      >
        <Text style={{ color: colors.primary, textAlign: 'center' }}>
          Don&apos;t have an account? Sign up
        </Text>
      </AnimatedPressable>
    </AuthScreenContainer>
  );
}
