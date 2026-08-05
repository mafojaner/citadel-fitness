import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

/**
 * No-op (enabled: false) until EXPO_PUBLIC_SENTRY_DSN is set, so local dev
 * and CI never need a real Sentry project to run the app or its checks.
 */
Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: 1.0,
  sendDefaultPii: false,
});
