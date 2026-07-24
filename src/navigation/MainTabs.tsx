import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/useTheme';
import { ActivityStack } from './stacks/ActivityStack';
import { HomeStack } from './stacks/HomeStack';
import { WorkoutsStack } from './stacks/WorkoutsStack';

export type MainTabsParamList = {
  Home: undefined;
  Workouts: undefined;
  Activity: undefined;
};

const TAB_ICONS: Record<keyof MainTabsParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Workouts: 'barbell',
  Activity: 'stats-chart',
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
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name as keyof MainTabsParamList]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Workouts" component={WorkoutsStack} />
      <Tab.Screen name="Activity" component={ActivityStack} />
    </Tab.Navigator>
  );
}
