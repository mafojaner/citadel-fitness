import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false, animation: 'fade' }}
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
