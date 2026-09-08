import { useSyncExternalStore } from 'react';
import { Appearance, AppState } from 'react-native';

type Scheme = 'light' | 'dark';

/**
 * Narrowed to the two real schemes rather than passed through as
 * ColorSchemeName: the platform can report null or 'unspecified', and
 * everything downstream only ever means light or dark. Anything not
 * explicitly dark falls to light, which is the default the app has always
 * had.
 */
function read(): Scheme {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

let current: Scheme = read();
const listeners = new Set<() => void>();
let started = false;

/**
 * Re-reads rather than trusting the event payload.
 *
 * `Appearance.addChangeListener` hands over a colorScheme, and on Android
 * that value has been observed to lag the configuration it is reporting.
 * `getColorScheme()` at the moment of the callback is the reading that
 * matches what the OS is actually showing, and it costs nothing.
 */
function publish() {
  const next = read();
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener();
}

/**
 * Registered once, for the life of the app, and never torn down -- there is
 * one system appearance and one app observing it, so reference-counting the
 * subscription would be bookkeeping with no case that exercises it.
 */
function start() {
  if (started) return;
  started = true;
  Appearance.addChangeListener(publish);
  // The part `useColorScheme` does not do, and the reason this module
  // exists. See the note on the hook below.
  AppState.addEventListener('change', (status) => {
    if (status === 'active') publish();
  });
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function snapshot(): Scheme {
  return current;
}

/**
 * The system's light/dark setting, re-read whenever the app comes back to
 * the foreground.
 *
 * This replaces React Native's `useColorScheme`, which subscribes to
 * `Appearance` and nothing else. That is enough for a theme changed from
 * inside the app, and not enough for one changed from outside it: switching
 * the system theme means leaving the app, changing a setting, and coming
 * back, and an appearance change delivered to a backgrounded app is the
 * case where the notification is least dependable -- Android in particular
 * has long-standing reports of the event never arriving, or arriving with
 * the previous value.
 *
 * The symptom was the floating tab bar keeping its old colours after a
 * system switch while the rest of the app had moved on. Nothing was wrong
 * with the bar: its glass is already keyed on the scheme so the native
 * blur tint remounts, and every colour on it is computed in render. It
 * simply never re-rendered, because the value it reads never announced that
 * it had changed. Anything else with no other reason to re-render would
 * have sat stale beside it.
 *
 * Shared through one module-level subscription rather than a listener pair
 * per caller: `useTheme` is called by most components in the app, and an
 * AppState listener each is a lot of listeners for one boolean.
 */
export function useSystemScheme(): Scheme {
  // The third argument is the server snapshot, for web's static render.
  // Same value: there is no server here, and the module reads the platform
  // synchronously either way.
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
