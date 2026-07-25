import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { ResetPasswordScreen } from '../screens/Auth/ResetPasswordScreen';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../state/authStore';
import { useProfileStore } from '../state/profileStore';
import { useTheme } from '../theme/useTheme';
import { MainTabs } from './MainTabs';
import { AccountStack } from './stacks/AccountStack';
import { AuthStack } from './stacks/AuthStack';

export type RootStackParamList = {
  Main: undefined;
  Account: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { colors } = useTheme();
  const session = useAuthStore((s) => s.session);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const loadProfile = useProfileStore((s) => s.load);
  const resetProfile = useProfileStore((s) => s.reset);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    if (session?.user.id) {
      loadProfile(session.user.id);
    } else {
      resetProfile();
    }
  }, [session?.user.id, loadProfile, resetProfile]);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (passwordRecovery) {
    return (
      <NavigationContainer>
        <ResetPasswordScreen onDone={() => setPasswordRecovery(false)} />
      </NavigationContainer>
    );
  }

  if (isInitializing) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? (
        <Stack.Navigator>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen
            name="Account"
            component={AccountStack}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}
