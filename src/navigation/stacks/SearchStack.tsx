import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AddWorkoutScreen } from '../../screens/Workouts/AddWorkoutScreen';
import { ArticleDetailScreen } from '../../screens/Newsletter/ArticleDetailScreen';
import { SearchScreen } from '../../screens/Search/SearchScreen';
import { useTheme } from '../../theme/useTheme';
import { stackScreenOptions } from '../screenOptions';

export type SearchStackParamList = {
  Search: undefined;
  AddWorkout: undefined;
  ArticleDetail: { articleId: string };
};

const Stack = createNativeStackNavigator<SearchStackParamList>();

export function SearchStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AddWorkout" component={AddWorkoutScreen} options={{ title: 'Add Workout' }} />
      <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} options={{ title: 'Article' }} />
    </Stack.Navigator>
  );
}
