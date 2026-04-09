const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig = {
  allowedDevOrigins: ['192.168.68.*'],
  serverExternalPackages: ['undici'],
};

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
