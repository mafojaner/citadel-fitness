import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, View } from 'react-native';
import { ResetPasswordScreen } from '../screens/Auth/ResetPasswordScreen';
import { OnboardingScreen } from '../screens/Onboarding/OnboardingScreen';
import { useArticleNotifications } from '../hooks/useArticleNotifications';
import { parseRecoveryTokensFromUrl, supabase } from '../lib/supabase';
import { useAuthStore } from '../state/authStore';
import { useFavoriteArticlesStore } from '../state/favoriteArticlesStore';
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
  const resetFavoriteArticles = useFavoriteArticlesStore((s) => s.reset);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const profileLoaded = useProfileStore((s) => s.loaded);
  const profileError = useProfileStore((s) => s.error);
  const hasSeenOnboarding = useProfileStore((s) => s.preferences.hasSeenOnboarding);

  // Only once a session exists and preferences have loaded, so the check
  // respects the user's actual category toggles rather than the defaults.
  useArticleNotifications(Boolean(session) && profileLoaded);

  useEffect(() => {
    if (session?.user.id) {
      loadProfile(session.user.id);
    } else {
      // Also clears favoriteArticlesStore, not just the profile — without
      // this, signing out never reset its `loaded` flag, so the next
      // account to sign in on this device would see the previous account's
      // favorited articles instead of ever fetching its own.
      resetProfile();
      resetFavoriteArticles();
    }
  }, [session?.user.id, loadProfile, resetProfile, resetFavoriteArticles]);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Web relies on Supabase's own detectSessionInUrl to notice a recovery
  // link and fire PASSWORD_RECOVERY above. Native has no browser location
  // for that to inspect — the OS just hands the citadelfitness:// URL to
  // the app directly — so the tokens have to be pulled out and applied by
  // hand here, for both a cold start (tapped from Mail) and a warm one
  // (app already running in the background).
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const handleUrl = async (url: string | null) => {
      if (!url) return;
      const tokens = parseRecoveryTokensFromUrl(url);
      if (!tokens) return;
      // Set before setSession so the SIGNED_IN event it fires lands on a
      // screen already committed to showing the reset form, rather than
      // racing into MainTabs first.
      setPasswordRecovery(true);
      await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });
    };

    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, []);

  if (passwordRecovery) {
    return (
      <NavigationContainer>
        <ResetPasswordScreen onDone={() => setPasswordRecovery(false)} />
      </NavigationContainer>
    );
  }

  // Also waits out the profile fetch once signed in, so the very first
  // render after sign-in never flashes MainTabs before flipping to
  // OnboardingScreen once `hasSeenOnboarding` comes back false. A failed
  // fetch still falls through below rather than blocking forever.
  if (isInitializing || (session && !profileLoaded && !profileError)) {
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
        profileLoaded && !hasSeenOnboarding ? (
          <OnboardingScreen />
        ) : (
          <Stack.Navigator>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen
              name="Account"
              component={AccountStack}
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
        )
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}
