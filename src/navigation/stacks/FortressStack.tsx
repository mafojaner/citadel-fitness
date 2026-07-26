import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileIconButton } from '../../components/ProfileIconButton';
import { FortressScreen } from '../../screens/Fortress/FortressScreen';
import { useTheme } from '../../theme/useTheme';
import { stackScreenOptions } from '../screenOptions';

export type FortressStackParamList = {
  Fortress: undefined;
};

const Stack = createNativeStackNavigator<FortressStackParamList>();

export function FortressStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen
        name="Fortress"
        component={FortressScreen}
        options={{ title: 'Fortress', headerRight: () => <ProfileIconButton /> }}
      />
    </Stack.Navigator>
  );
}
