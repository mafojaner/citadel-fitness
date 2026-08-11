import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useIsDesktop } from '../hooks/useResponsiveLayout';
import { FloatingTabBar } from './FloatingTabBar';
import { ActivityStack } from './stacks/ActivityStack';
import { HomeStack } from './stacks/HomeStack';
import { NewsletterStack } from './stacks/NewsletterStack';
import { SearchStack } from './stacks/SearchStack';
import { WorkoutsStack } from './stacks/WorkoutsStack';

export type MainTabsParamList = {
  Home: undefined;
  Workouts: undefined;
  Activity: undefined;
  Learn: undefined;
  Search: undefined;
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
    </Tab.Navigator>
  );
}
