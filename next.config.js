/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Kosongkan atau isi dengan fitur experimental lain yang valid
  },
  
  // Konfigurasi image
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  
  // Environment variables yang akan diexpose ke browser
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
};

// Sentry configuration - OPTIONAL (only if SENTRY_AUTH_TOKEN is set)
// To enable Sentry: Add SENTRY_AUTH_TOKEN, SENTRY_ORG, and SENTRY_PROJECT to your environment variables
const useSentry = process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT;

if (useSentry) {
  const { withSentryConfig } = require('@sentry/nextjs');
  
  module.exports = withSentryConfig(
    nextConfig,
    {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
    },
    {
      widenClientFileUpload: true,
      transpileClientSDK: true,
      tunnelRoute: "/monitoring",
      hideSourceMaps: true,
      disableLogger: true,
    }
  );
} else {
  module.exports = nextConfig;
}
