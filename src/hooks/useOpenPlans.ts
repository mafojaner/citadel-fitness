import { useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import { useIsDesktop } from './useResponsiveLayout';

/**
 * Open the plans page from anywhere, by whichever route exists here.
 *
 * Plans has two homes and only one of them is real at a time. On desktop it
 * is a tab, registered by MainTabs so the sidebar can keep it on screen and
 * show it as active. On a phone that tab is never registered — the bottom
 * bar has five tabs and no room for a sixth — so the only way in is the
 * Account stack.
 *
 * Both callers of this used to point at the Learn tab's Plans pane, which no
 * longer exists. Rather than each of them re-deciding, the choice lives here
 * once, keyed on the same `useIsDesktop` MainTabs uses to decide whether to
 * register the tab at all. That shared hook is the point: if the two ever
 * disagreed, `navigate('Plans')` would target a route that was never
 * registered, and the tap would do nothing at all — the exact failure this
 * app has already shipped once.
 */
export function useOpenPlans(): () => void {
  const navigation = useNavigation<{ navigate: (...args: never[]) => void }>();
  const isDesktop = useIsDesktop();

  return useCallback(() => {
    const navigate = navigation.navigate as unknown as (name: string, params?: object) => void;
    if (isDesktop) {
      navigate('Plans');
      return;
    }
    navigate('Account', { screen: 'Plans' });
  }, [navigation, isDesktop]);
}
