import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileIconButton } from '../../components/ProfileIconButton';
import { RewardsScreen } from '../../screens/Rewards/RewardsScreen';
import { useTheme } from '../../theme/useTheme';
import { stackScreenOptions } from '../screenOptions';

export type RewardsStackParamList = {
  Rewards: undefined;
};

const Stack = createNativeStackNavigator<RewardsStackParamList>();

export function RewardsStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen
        name="Rewards"
        component={RewardsScreen}
        options={{ headerRight: () => <ProfileIconButton /> }}
      />
    </Stack.Navigator>
  );
}
