import { create } from 'zustand';

/**
 * The deepest focused route name, kept current by RootNavigator.
 *
 * This exists because the obvious source is not reliable. A tab bar is
 * handed the tab navigator's state, and the natural way to ask "is this tab
 * showing its own root" is `state.routes[state.index].state?.index === 0`.
 * That works when a stack is pushed onto while already mounted, and fails
 * when it is mounted directly at a nested screen -- `navigate('Workouts',
 * { screen: 'AddWorkout' })` from another tab leaves the parent's copy of
 * the nested state undefined, permanently, so the check reports the root
 * and keeps reporting it. Verified against the running app rather than
 * reasoned about: the probe logged `hasState: false` on Add Workout across
 * every subsequent render.
 *
 * `navigationRef.getCurrentRoute()` has no such gap -- it walks to the
 * genuinely focused leaf -- and RootNavigator already calls it on every
 * state change for screen tracking. This just keeps the answer somewhere
 * the rest of the app can subscribe to.
 */
interface RouteState {
  /** Null before the container is ready. */
  current: string | null;
  setCurrent: (name: string | null) => void;
}

export const useRouteStore = create<RouteState>()((set) => ({
  current: null,
  setCurrent: (name) => set({ current: name }),
}));

/**
 * The root screen of each tab's stack.
 *
 * Route names, not tab names, which differ in one place: the Learn tab's
 * stack opens on a screen called Newsletter.
 */
const MAIN_ROUTES = new Set(['Home', 'Activity', 'Workouts', 'Newsletter', 'Search']);

/** Whether the app is sitting on one of the five main screens. */
export function useOnMainScreen(): boolean {
  const current = useRouteStore((s) => s.current);
  return current !== null && MAIN_ROUTES.has(current);
}
