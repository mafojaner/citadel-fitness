import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
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

  useEffect(() => {
    if (session?.user.id) {
      loadProfile(session.user.id);
    } else {
      resetProfile();
    }
  }, [session?.user.id, loadProfile, resetProfile]);

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
