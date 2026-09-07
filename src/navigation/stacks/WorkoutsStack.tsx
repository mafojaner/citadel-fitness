import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AddWorkoutScreen } from '../../screens/Workouts/AddWorkoutScreen';
import { ProgramsScreen } from '../../screens/Workouts/ProgramsScreen';
import { DayDetailScreen } from '../../screens/Workouts/DayDetailScreen';
import { ExerciseCatalogueScreen } from '../../screens/Workouts/ExerciseCatalogueScreen';
import { WorkoutsScreen } from '../../screens/Workouts/WorkoutsScreen';
// Still filed under screens/Home because that is where it was written and
// where its sibling hooks live; it is reached from Workouts now, since the
// card that opens it moved there.
import { WaterHistoryScreen } from '../../screens/Home/WaterHistoryScreen';
import { useTheme } from '../../theme/useTheme';
import type { Category } from '../../types/models';
import { stackScreenOptions } from '../screenOptions';

export type WorkoutsStackParamList = {
  Workouts: undefined;
  AddWorkout: undefined;
  ExerciseCatalogue: { initialCategory?: Category; standalone?: boolean } | undefined;
  DayDetail: { date: string };
  Programs: undefined;
  WaterHistory: undefined;
};

const Stack = createNativeStackNavigator<WorkoutsStackParamList>();

export function WorkoutsStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen name="Workouts" component={WorkoutsScreen} options={{ headerShown: false }} />
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
      <Stack.Screen name="Programs" component={ProgramsScreen} options={{ title: 'Programs' }} />
      <Stack.Screen name="WaterHistory" component={WaterHistoryScreen} options={{ title: 'Water Intake' }} />
    </Stack.Navigator>
  );
}
