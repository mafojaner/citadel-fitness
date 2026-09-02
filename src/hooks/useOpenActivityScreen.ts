import { useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import type { ActivityStackParamList } from '../navigation/stacks/ActivityStack';

/**
 * Open a screen in the Activity stack from a screen that is not in it.
 *
 * Cross-tab navigation needs a composite navigation type, and building one
 * inside a stack screen means importing MainTabsParamList — which imports
 * the stack that screen belongs to, so the types resolve in a circle and
 * degrade to `never`. The result compiles nowhere and reads as a mystery.
 *
 * So the cast lives here once, documented, the way useOpenPlans already does
 * it for the plans page. One place to be wrong is better than one per
 * caller, and this is the only place in the app that knows the Activity
 * stack can be addressed through the root's 'Main' route.
 *
 * Typed on the screen name even though the navigate call is cast, so a
 * renamed route still fails at compile time rather than becoming a tap that
 * silently does nothing — which is a failure this app has shipped before.
 */
export function useOpenActivityScreen(): (screen: keyof ActivityStackParamList) => void {
  const navigation = useNavigation<{ navigate: (...args: never[]) => void }>();

  return useCallback(
    (screen: keyof ActivityStackParamList) => {
      const navigate = navigation.navigate as unknown as (name: string, params?: object) => void;
      // Through the root rather than as a bare tab name: this also works
      // from inside a stack that is not a direct child of the tabs.
      navigate('Main', { screen: 'Activity', params: { screen } });
    },
    [navigation]
  );
}
