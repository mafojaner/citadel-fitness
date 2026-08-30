// Placeholders so importing supabase.ts doesn't warn about missing config.
// Tests never reach the network — every suite stubs the client — but the
// module reads these at import time, and leaving them unset makes output
// depend on whether the developer happens to have a .env file.
process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'http://localhost:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';

// AsyncStorage is a native module, so importing it under Jest throws unless
// it's replaced. Nearly everything in src/lib reaches it transitively via
// supabase.ts, so this belongs in shared setup rather than each test file.
// The mock is the one AsyncStorage ships for exactly this purpose.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Icons are replaced with a plain host component for the same reason
// AsyncStorage is replaced above: the real one is a native module. @expo/vector-icons
// loads its font asynchronously and calls setState when that resolves, which
// lands after the test has finished and produces an "update not wrapped in
// act(...)" warning on every render test. The warning is noise, and noise in
// test output is how a real warning gets scrolled past.
//
// Fidelity is not lost: the glyph itself is decorative everywhere in this
// app, and what the tests assert on -- labels, roles, and whether an icon is
// rendered at all -- survives the substitution.
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  const React = require('react');
  const Icon = (props) => React.createElement(View, { ...props, testID: props.testID ?? 'icon' });
  return new Proxy(
    { Ionicons: Icon },
    { get: (target, prop) => (prop in target ? target[prop] : Icon) }
  );
});
