import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityScreen } from '../../screens/Activity/ActivityScreen';
import { AdvancedAnalyticsScreen } from '../../screens/Activity/AdvancedAnalyticsScreen';
import { GoalForecastScreen } from '../../screens/Activity/GoalForecastScreen';
import { FormCheckScreen } from '../../screens/Activity/FormCheckScreen';
import { GroupsScreen } from '../../screens/Activity/GroupsScreen';
import { LeaderboardScreen } from '../../screens/Activity/LeaderboardScreen';
import { OverloadScreen } from '../../screens/Activity/OverloadScreen';
import { PersonalRecordsScreen } from '../../screens/Activity/PersonalRecordsScreen';
import { RewardsScreen } from '../../screens/Activity/RewardsScreen';
import { useTheme } from '../../theme/useTheme';
import { stackScreenOptions } from '../screenOptions';

export type ActivityStackParamList = {
  Activity: undefined;
  Leaderboard: undefined;
  Rewards: undefined;
  PersonalRecords: undefined;
  AdvancedAnalytics: undefined;
  GoalForecast: undefined;
  Overload: undefined;
  FormCheck: undefined;
  Groups: undefined;
};

const Stack = createNativeStackNavigator<ActivityStackParamList>();

export function ActivityStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen name="Activity" component={ActivityScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: 'Ranking' }} />
      <Stack.Screen name="Rewards" component={RewardsScreen} options={{ title: 'Rewards' }} />
      <Stack.Screen
        name="PersonalRecords"
        component={PersonalRecordsScreen}
        options={{ title: 'Personal Records' }}
      />
      <Stack.Screen
        name="AdvancedAnalytics"
        component={AdvancedAnalyticsScreen}
        options={{ title: 'Advanced Analytics' }}
      />
      <Stack.Screen
        name="GoalForecast"
        component={GoalForecastScreen}
        options={{ title: 'Goal Forecast' }}
      />
      <Stack.Screen
        name="Overload"
        component={OverloadScreen}
        options={{ title: 'Progressive Overload' }}
      />
      <Stack.Screen
        name="FormCheck"
        component={FormCheckScreen}
        options={{ title: 'Form Check' }}
      />
      <Stack.Screen name="Groups" component={GroupsScreen} options={{ title: 'Private Groups' }} />
    </Stack.Navigator>
  );
}
