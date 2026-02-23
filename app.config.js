const base = require('./app.json');

module.exports = () => ({
  ...base,
  expo: {
    ...base.expo,
    extra: {
      ...base.expo?.extra,
      eas: {
        ...base.expo?.extra?.eas,
        // Set EXPO_PUBLIC_EAS_PROJECT_ID in .env for push notifications in dev builds.
        // Get it from https://expo.dev or run: eas init
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || base.expo?.extra?.eas?.projectId,
      },
    },
  },
});
