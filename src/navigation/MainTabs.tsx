import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { useIsDesktop } from '../hooks/useResponsiveLayout';
import { FloatingTabBar } from './FloatingTabBar';
import type { NewsletterStackParamList } from './stacks/NewsletterStack';
import { ActivityStack } from './stacks/ActivityStack';
import { HomeStack } from './stacks/HomeStack';
import { NewsletterStack } from './stacks/NewsletterStack';
import { SearchStack } from './stacks/SearchStack';
import { WorkoutsStack } from './stacks/WorkoutsStack';
import { PlansScreen } from '../screens/Plans/PlansScreen';

export type MainTabsParamList = {
  Home: undefined;
  Workouts: undefined;
  Activity: undefined;
  /** Nested params so a locked feature elsewhere can open the Plans pane directly. */
  Learn: NavigatorScreenParams<NewsletterStackParamList>;
  Search: undefined;
  /**
   * Desktop only. On a phone the bottom bar has five tabs and no room for a
   * sixth, so Plans is reached through Account instead; the sidebar has the
   * vertical space, and being a real tab is what lets it stay on screen and
   * show as active while you are on it. Pushing the Account stack instead
   * covers the whole tab navigator, sidebar included.
   */
  Plans: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

export function MainTabs() {
  const isDesktop = useIsDesktop();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        // Makes the navigator lay the tab bar out as a column beside the
        // screens instead of below them; FloatingTabBar switches to its
        // sidebar form at the same breakpoint.
        tabBarPosition: isDesktop ? 'left' : 'bottom',
      }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Workouts" component={WorkoutsStack} />
      <Tab.Screen name="Activity" component={ActivityStack} />
      <Tab.Screen name="Learn" component={NewsletterStack} />
      <Tab.Screen name="Search" component={SearchStack} />
      {/* Conditionally registered, so the phone's bottom bar never sees it.
          Resizing a desktop browser down while on this tab unregisters the
          focused route; React Navigation falls back to the first tab, which
          is the right outcome and the only one available. */}
      {isDesktop ? (
        <Tab.Screen name="Plans" options={{ title: 'Plans' }}>
          {() => <PlansScreen />}
        </Tab.Screen>
      ) : null}
    </Tab.Navigator>
  );
}
