// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      // ActivityScreen once called navigation.navigate() four times without
      // ever declaring `navigation`. It compiled, passed lint and passed the
      // whole suite, because on web the identifier resolves to the DOM's
      // global Navigation API — whose navigate() legitimately takes a URL
      // string. So `navigation.navigate('PersonalRecords')` type-checked as
      // a browser navigation to a relative path, and at runtime reloaded the
      // app instead of pushing a screen. Four paid features looked like dead
      // links for weeks with nothing anywhere reporting a problem.
      //
      // These three globals all have React Native counterparts that are
      // supposed to come from a hook or an import, which is exactly what
      // makes silently falling through to the DOM version so hard to see.
      'no-restricted-globals': [
        'error',
        {
          name: 'navigation',
          message:
            "Use useNavigation() — the bare identifier resolves to the DOM Navigation API on web and silently reloads the app instead of navigating.",
        },
        {
          name: 'history',
          message: 'Use useNavigation() rather than the DOM history object.',
        },
        {
          name: 'location',
          message: "Use expo-linking or the navigation state; the DOM location object is web-only.",
        },
      ],
    },
  },
]);
