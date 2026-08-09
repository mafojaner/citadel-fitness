import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityScreen } from '../../screens/Activity/ActivityScreen';
import { LeaderboardScreen } from '../../screens/Activity/LeaderboardScreen';
import { RewardsScreen } from '../../screens/Activity/RewardsScreen';
import { useTheme } from '../../theme/useTheme';
import { stackScreenOptions } from '../screenOptions';

export type ActivityStackParamList = {
  Activity: undefined;
  Leaderboard: undefined;
  Rewards: undefined;
};

const Stack = createNativeStackNavigator<ActivityStackParamList>();

export function ActivityStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen name="Activity" component={ActivityScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ title: 'Ranking' }} />
      <Stack.Screen name="Rewards" component={RewardsScreen} options={{ title: 'Rewards' }} />
    </Stack.Navigator>
  );
}
