// Learn more https://docs.expo.dev/guides/monorepos/#modify-the-metro-config
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

module.exports = config;
