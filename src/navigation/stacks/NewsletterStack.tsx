import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ArticleDetailScreen } from '../../screens/Newsletter/ArticleDetailScreen';
import { LearnScreen } from '../../screens/Newsletter/LearnScreen';
import { useTheme } from '../../theme/useTheme';
import { stackScreenOptions } from '../screenOptions';

export type NewsletterStackParamList = {
  /** `tab` lets the Plans pane be linked to directly, so a locked feature elsewhere can point at what unlocks it. */
  Newsletter: { tab?: 'newsletter' | 'plans' } | undefined;
  ArticleDetail: { articleId: string };
};

const Stack = createNativeStackNavigator<NewsletterStackParamList>();

export function NewsletterStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator screenOptions={stackScreenOptions(colors)}>
      <Stack.Screen name="Newsletter" component={LearnScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="ArticleDetail"
        component={ArticleDetailScreen}
        options={{ title: 'Article' }}
      />
    </Stack.Navigator>
  );
}
