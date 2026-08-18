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
