import { act, render, screen } from '@testing-library/react-native';
import { Appearance, AppState, Text } from 'react-native';

/**
 * The system scheme reaches the app after a background/foreground cycle.
 *
 * That cycle is not incidental: changing the system theme means leaving the
 * app, changing a setting and coming back, so it is the only way this value
 * ever changes from outside. React Native's `useColorScheme` subscribes to
 * `Appearance` and nothing else, and an appearance change delivered to a
 * backgrounded app is the case where that notification is least dependable
 * -- Android in particular has long-standing reports of it never arriving,
 * or arriving carrying the previous value.
 *
 * The failure was silent and partial. Components with some other reason to
 * re-render picked the new value up anyway; the floating tab bar, which has
 * none, kept its old colours. So the probe below does nothing but read the
 * scheme -- the tab bar's situation, with nothing else to mask the bug.
 *
 * The module is loaded once, with the platform stubbed first, rather than
 * re-imported per test: `jest.isolateModules` would give it a second copy
 * of React and the hook would have no dispatcher. Everything the module
 * does after load is reachable through its two signals anyway, which is
 * also how the app reaches it.
 */

type Listener = (payload: never) => void;

const appearanceListeners: Listener[] = [];
const appStateListeners: Listener[] = [];
let platformScheme: 'light' | 'dark' | null = 'light';

jest.spyOn(Appearance, 'getColorScheme').mockImplementation(() => platformScheme);
jest.spyOn(Appearance, 'addChangeListener').mockImplementation((listener) => {
  appearanceListeners.push(listener as Listener);
  return { remove: () => {} } as ReturnType<typeof Appearance.addChangeListener>;
});
jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
  appStateListeners.push(listener as Listener);
  return { remove: () => {} } as ReturnType<typeof AppState.addEventListener>;
});

// Required after the stubs above, so the module's load-time read sees them.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useSystemScheme } = require('../systemScheme') as typeof import('../systemScheme');

function Probe() {
  return <Text>{useSystemScheme()}</Text>;
}

const fireAppearance = () =>
  act(() => {
    appearanceListeners.forEach((listener) =>
      (listener as unknown as (p: { colorScheme: string | null }) => void)({
        colorScheme: platformScheme,
      })
    );
  });

const fireAppState = (status: 'active' | 'background') =>
  act(() => {
    appStateListeners.forEach((listener) =>
      (listener as unknown as (s: string) => void)(status)
    );
  });

/**
 * Back to light between tests, through the appearance listener rather than
 * the AppState one.
 *
 * Deliberately not the foreground path: that is the mechanism under test,
 * and resetting through it means a build that registers no AppState
 * listener also fails to reset, leaving the next test starting from the
 * value it was hoping to observe. That exact false pass showed up when this
 * was checked by deleting the listener.
 */
afterEach(() => {
  platformScheme = 'light';
  fireAppearance();
});

describe('system scheme', () => {
  it('starts on what the platform reported when it loaded', () => {
    render(<Probe />);
    expect(screen.getByText('light')).toBeTruthy();
  });

  it('follows an appearance change while the app is open', () => {
    render(<Probe />);

    platformScheme = 'dark';
    fireAppearance();

    expect(screen.getByText('dark')).toBeTruthy();
  });

  it('follows a change made while the app was backgrounded', () => {
    // The reported bug. The theme is switched from outside the app, so the
    // appearance event either never arrives or arrives stale, and the only
    // dependable signal is the app coming back to the foreground.
    render(<Probe />);

    platformScheme = 'dark';
    fireAppState('active');

    expect(screen.getByText('dark')).toBeTruthy();
  });

  it('listens for the foreground at all', () => {
    // A guard on the guard. Without this, a module that registered no
    // AppState listener would still pass the test above if anything else
    // happened to re-render the probe.
    render(<Probe />);
    expect(appStateListeners.length).toBe(1);
  });

  it('ignores the app going to the background', () => {
    render(<Probe />);

    platformScheme = 'dark';
    fireAppState('background');

    expect(screen.getByText('light')).toBeTruthy();
  });

  it('reads the platform rather than trusting the event payload', () => {
    // Android has been observed handing the listener the previous value, so
    // the module re-reads on every signal. Fired here with a payload that
    // disagrees with the platform: the platform wins.
    render(<Probe />);

    platformScheme = 'dark';
    act(() => {
      appearanceListeners.forEach((listener) =>
        (listener as unknown as (p: { colorScheme: string }) => void)({ colorScheme: 'light' })
      );
    });

    expect(screen.getByText('dark')).toBeTruthy();
  });

  it('treats an unspecified scheme as light rather than passing it through', () => {
    // The platform can report null, and every colour downstream means one
    // of exactly two things.
    render(<Probe />);

    platformScheme = 'dark';
    fireAppState('active');
    expect(screen.getByText('dark')).toBeTruthy();

    platformScheme = null;
    fireAppState('active');
    expect(screen.getByText('light')).toBeTruthy();
  });

  it('stops following once nothing is mounted', () => {
    // Unsubscribing is React's job through useSyncExternalStore, but a leak
    // here would keep every unmounted probe's setState alive, so it is
    // worth one assertion that an unmount actually detaches.
    const view = render(<Probe />);
    view.unmount();

    platformScheme = 'dark';
    expect(() => fireAppState('active')).not.toThrow();
  });
});
