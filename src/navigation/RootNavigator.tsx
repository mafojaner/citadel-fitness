import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  useNavigationContainerRef,
  type NavigatorScreenParams,
  type ParamListBase,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, View } from 'react-native';
import { FadeInView } from '../components/FadeInView';
import { ResetPasswordScreen } from '../screens/Auth/ResetPasswordScreen';
import { OnboardingScreen } from '../screens/Onboarding/OnboardingScreen';
import { useArticleNotifications } from '../hooks/useArticleNotifications';
import { resetArticleNotificationMarker } from '../lib/notifications';
import { parseRecoveryTokensFromUrl, supabase } from '../lib/supabase';
import { identifyUser, resetTelemetryIdentity, trackScreen } from '../lib/telemetry';
import { useAuthStore } from '../state/authStore';
import { useFavoriteArticlesStore } from '../state/favoriteArticlesStore';
import { useProfileStore } from '../state/profileStore';
import { useWorkoutDraftStore } from '../state/workoutDraftStore';
import { motion } from '../theme/motion';
import { useTheme } from '../theme/useTheme';
import { MainTabs } from './MainTabs';
import { AccountStack, type AccountStackParamList } from './stacks/AccountStack';
import { AuthStack } from './stacks/AuthStack';

export type RootStackParamList = {
  Main: undefined;
  /** Nested params so the desktop sidebar can open Plans directly, rather than landing on Account and making you find it. */
  Account: NavigatorScreenParams<AccountStackParamList>;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { colors, scheme } = useTheme();
  // ParamListBase rather than RootStackParamList: getCurrentRoute() resolves
  // to the innermost active route, which lives in the tab and stack param
  // lists nested below this one, so the only honest type for its name is
  // string.
  const navigationRef = useNavigationContainerRef<ParamListBase>();
  // Bridges this app's own theme into React Navigation's theming system,
  // which otherwise defaults to its own internal light theme regardless of
  // scheme — the container's own chrome (visible briefly during native
  // transitions) would silently drift from the rest of the app without this.
  const navTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.navBackground,
      border: colors.navBorder,
      primary: colors.primary,
      text: colors.textPrimary,
    },
  };
  const session = useAuthStore((s) => s.session);
  const isInitializing = useAuthStore((s) => s.isInitializing);
  const loadProfile = useProfileStore((s) => s.load);
  const resetProfile = useProfileStore((s) => s.reset);
  const resetFavoriteArticles = useFavoriteArticlesStore((s) => s.reset);
  const resetWorkoutDraft = useWorkoutDraftStore((s) => s.reset);
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
      // The Supabase user id and nothing else — see telemetry.ts.
      identifyUser(session.user.id);
    } else {
      // Signing out has to clear the telemetry identity for the same reason
      // it clears the stores below: the next account on this device must not
      // inherit anything from the previous one.
      resetTelemetryIdentity();
      // Also clears favoriteArticlesStore and workoutDraftStore, not just the
      // profile — without this, signing out never reset them, so the next
      // account to sign in on this device would inherit the previous
      // account's favorited articles and, worse, its in-progress workout
      // draft (which could then get saved under the new account entirely).
      // The article-notification "last seen" marker is reset the same way,
      // since it's also global device storage rather than per-account.
      resetProfile();
      resetFavoriteArticles();
      resetWorkoutDraft();
      resetArticleNotificationMarker();
    }
  }, [session?.user.id, loadProfile, resetProfile, resetFavoriteArticles, resetWorkoutDraft]);

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
      <NavigationContainer theme={navTheme}>
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

  const mode = !session ? 'auth' : profileLoaded && !hasSeenOnboarding ? 'onboarding' : 'main';

  const onNavigationStateChange = () => {
    const routeName = navigationRef.getCurrentRoute()?.name;
    // Route name only, never params — trackScreen dedupes repeats.
    if (routeName) trackScreen(routeName);
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      onReady={onNavigationStateChange}
      onStateChange={onNavigationStateChange}
    >
      {/* `key={mode}` forces a fresh mount (and so a fresh fade-in) at each of
          the app's three big-picture transitions — signing in, finishing
          onboarding, signing out — instead of an abrupt instant cut. */}
      <FadeInView key={mode} style={{ flex: 1 }} duration={motion.duration.slow} slideDistance={0}>
        {mode === 'onboarding' ? (
          <OnboardingScreen />
        ) : mode === 'main' ? (
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
      </FadeInView>
    </NavigationContainer>
  );
}
