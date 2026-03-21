import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['zlib-sync', 'bufferutil', 'utf-8-validate'],
};

export default withSentryConfig(nextConfig, {
  // Suppresses source map uploading logs during build
  silent: true,
  org: "your-sentry-org",
  project: "digital-helper",
});
