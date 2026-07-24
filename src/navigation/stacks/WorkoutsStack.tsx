import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileIconButton } from '../../components/ProfileIconButton';
import { AddWorkoutScreen } from '../../screens/Workouts/AddWorkoutScreen';
import { DayDetailScreen } from '../../screens/Workouts/DayDetailScreen';
import { ExerciseCatalogueScreen } from '../../screens/Workouts/ExerciseCatalogueScreen';
import { WorkoutsScreen } from '../../screens/Workouts/WorkoutsScreen';
import { useTheme } from '../../theme/useTheme';
import { stackScreenOptions } from '../screenOptions';

export type WorkoutsStackParamList = {
  Workouts: undefined;
  AddWorkout: undefined;
  ExerciseCatalogue: undefined;
  DayDetail: { date: string };
};

const Stack = createNativeStackNavigator<WorkoutsStackParamList>();

export function WorkoutsStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen
        name="Workouts"
        component={WorkoutsScreen}
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
      <Stack.Screen
        name="DayDetail"
        component={DayDetailScreen}
        options={{ title: 'Day Detail' }}
      />
    </Stack.Navigator>
  );
}
