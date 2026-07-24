import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileIconButton } from '../../components/ProfileIconButton';
import { HomeScreen } from '../../screens/Home/HomeScreen';
import { AddWorkoutScreen } from '../../screens/Workouts/AddWorkoutScreen';
import { ExerciseCatalogueScreen } from '../../screens/Workouts/ExerciseCatalogueScreen';
import { useTheme } from '../../theme/useTheme';
import type { Category } from '../../types/models';
import { stackScreenOptions } from '../screenOptions';

export type HomeStackParamList = {
  Home: undefined;
  AddWorkout: undefined;
  ExerciseCatalogue: { initialCategory?: Category } | undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerRight: () => <ProfileIconButton /> }}
      />
      <Stack.Screen
        name="AddWorkout"
        component={AddWorkoutScreen}
        options={{ title: 'Add Workout' }}
      />
      <Stack.Screen
        name="ExerciseCatalogue"
        component={ExerciseCatalogueScreen}
        options={{ title: 'Exercise Catalogue' }}
      />
    </Stack.Navigator>
  );
}
