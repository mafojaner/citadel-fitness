import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FloatingTabBar } from './FloatingTabBar';
import { ActivityStack } from './stacks/ActivityStack';
import { HomeStack } from './stacks/HomeStack';
import { NewsletterStack } from './stacks/NewsletterStack';
import { RewardsStack } from './stacks/RewardsStack';
import { WorkoutsStack } from './stacks/WorkoutsStack';

export type MainTabsParamList = {
  Home: undefined;
  Workouts: undefined;
  Rewards: undefined;
  Activity: undefined;
  Learn: undefined;
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
      <Tab.Screen name="Rewards" component={RewardsStack} />
      <Tab.Screen name="Activity" component={ActivityStack} />
      <Tab.Screen name="Learn" component={NewsletterStack} />
    </Tab.Navigator>
  );
}
