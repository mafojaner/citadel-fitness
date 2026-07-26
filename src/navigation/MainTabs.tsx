import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';
import { ActivityStack } from './stacks/ActivityStack';
import { FortressStack } from './stacks/FortressStack';
import { HomeStack } from './stacks/HomeStack';
import { NewsletterStack } from './stacks/NewsletterStack';
import { WorkoutsStack } from './stacks/WorkoutsStack';

export type MainTabsParamList = {
  Home: undefined;
  Workouts: undefined;
  Fortress: undefined;
  Activity: undefined;
  Learn: undefined;
};

const TAB_ICONS: Record<Exclude<keyof MainTabsParamList, 'Fortress'>, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Workouts: 'barbell',
  Activity: 'stats-chart',
  Learn: 'book',
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

export function MainTabs() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.navBackground,
          borderTopColor: colors.navBorder,
          height: 56 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
        },
        tabBarLabelStyle: { fontSize: 12, marginTop: 2 },
        tabBarIcon: ({ color, size }) =>
          route.name === 'Fortress' ? (
            <MaterialCommunityIcons name="castle" size={size} color={color} />
          ) : (
            <Ionicons name={TAB_ICONS[route.name as keyof typeof TAB_ICONS]} size={size} color={color} />
          ),
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Workouts" component={WorkoutsStack} />
      <Tab.Screen name="Fortress" component={FortressStack} />
      <Tab.Screen name="Activity" component={ActivityStack} />
      <Tab.Screen name="Learn" component={NewsletterStack} />
    </Tab.Navigator>
  );
}
