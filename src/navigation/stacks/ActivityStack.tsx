import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityScreen } from '../../screens/Activity/ActivityScreen';
import { useTheme } from '../../theme/useTheme';
import { stackScreenOptions } from '../screenOptions';

export type ActivityStackParamList = {
  Activity: undefined;
};

const Stack = createNativeStackNavigator<ActivityStackParamList>();

export function ActivityStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen name="Activity" component={ActivityScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
