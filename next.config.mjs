import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['zlib-sync', 'bufferutil', 'utf-8-validate'],
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
      'zlib-sync': 'commonjs zlib-sync',
    });
    return config;
  },
};

export default withSentryConfig(nextConfig, {
  // Suppresses source map uploading logs during build
  silent: true,
  org: "hobby-voh",
  project: "digital-helper",
});
